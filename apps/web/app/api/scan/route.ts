import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and, gte, lte, desc, count } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { runScan } from "@/lib/scan/run-scan";
import { capture } from "@/lib/posthog/server";
import { checkOrgTier } from "@/lib/billing/gate";

export const dynamic = "force-dynamic";

const ScanBody = z.object({
  accountId: z.string().uuid("accountId must be a UUID"),
});

export async function POST(req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ScanBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { accountId } = parsed.data;

  // Verify account belongs to this org
  const rows = await db
    .select()
    .from(schema.accounts)
    .where(and(eq(schema.accounts.id, accountId), eq(schema.accounts.orgId, orgId)))
    .limit(1);

  const account = rows[0];
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (!account.roleArn || !account.externalId) {
    return NextResponse.json(
      { error: "Account is not fully configured (missing IAM role)" },
      { status: 422 },
    );
  }

  // Pro gate — free tier limited to 10 scans/month
  const FREE_SCAN_LIMIT = 10;
  const tier = await checkOrgTier(orgId);
  if (tier === "free") {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const result = await db
      .select({ count: count() })
      .from(schema.runs)
      .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
      .where(
        and(
          eq(schema.accounts.orgId, orgId),
          gte(schema.runs.startedAt, startOfMonth),
          lte(schema.runs.startedAt, endOfMonth),
          eq(schema.runs.status, "succeeded"),
        ),
      );
    const scansUsed = result[0]?.count ?? 0;
    if (scansUsed >= FREE_SCAN_LIMIT) {
      return NextResponse.json(
        {
          error: "upgrade_required",
          message: "You've used all 10 free scans this month. Upgrade to Pro for unlimited scans.",
          scansUsed,
          scansLimit: FREE_SCAN_LIMIT,
        },
        { status: 402 },
      );
    }
  }

  // Check for in-flight or recent scan (5-min cooldown)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentRun = await db
    .select({ id: schema.runs.id, status: schema.runs.status, startedAt: schema.runs.startedAt })
    .from(schema.runs)
    .where(and(
      eq(schema.runs.accountId, accountId),
      gte(schema.runs.startedAt, fiveMinutesAgo),
    ))
    .orderBy(desc(schema.runs.startedAt))
    .limit(1);

  if (recentRun[0]) {
    const run = recentRun[0];
    if (run.status === "running") {
      return NextResponse.json(
        { error: "scan_in_progress", message: "A scan is already running.", runId: run.id },
        { status: 409 }
      );
    }
    const retryAfterSeconds = Math.ceil(
      (5 * 60 * 1000 - (Date.now() - run.startedAt!.getTime())) / 1000
    );
    return NextResponse.json(
      { error: "rate_limited", message: "Scan ran recently. Please wait before scanning again.", retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  void capture({ distinctId: userId, event: "scan_started", properties: { orgId, accountId, userId } });

  const result = await runScan({
    id: account.id,
    orgId: account.orgId,
    roleArn: account.roleArn,
    externalId: account.externalId,
    region: account.region,
  });

  if (result.status === "failed") {
    void capture({ distinctId: userId, event: "scan_failed", properties: { orgId, accountId } });
    return NextResponse.json(
      { error: result.error ?? "Scan failed", runId: result.runId },
      { status: 502 },
    );
  }

  void capture({ distinctId: userId, event: "scan_completed", properties: { orgId, accountId, totalFindings: result.totalFindings, totalSavingsCents: result.totalSavingsCents, runId: result.runId } });

  return NextResponse.json({
    runId: result.runId,
    totalFindings: result.totalFindings,
    totalSavingsCents: result.totalSavingsCents,
  });
}
