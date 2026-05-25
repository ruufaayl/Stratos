import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";
import { runScan } from "@/lib/scan/run-scan";

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

  const result = await runScan({
    id: account.id,
    orgId: account.orgId,
    roleArn: account.roleArn,
    externalId: account.externalId,
    region: account.region,
  });

  if (result.status === "failed") {
    return NextResponse.json(
      { error: result.error ?? "Scan failed", runId: result.runId },
      { status: 502 },
    );
  }

  return NextResponse.json({
    runId: result.runId,
    totalFindings: result.totalFindings,
    totalSavingsCents: result.totalSavingsCents,
  });
}
