import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { capture } from "@/lib/posthog/server";
import { checkOrgTier } from "@/lib/billing/gate";

export const dynamic = "force-dynamic";

/** Wrap a CSV field value in double-quotes, escaping any internal double-quotes. */
function csvField(value: string | null | undefined): string {
  const str = value ?? "";
  // Always wrap in quotes to handle commas, newlines, and other special chars.
  return `"${str.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const { orgId } = await auth();
  if (!orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tier = await checkOrgTier(orgId);
  if (tier !== "pro") {
    return NextResponse.json(
      { error: "upgrade_required", message: "CSV export is a Pro feature. Upgrade to access it." },
      { status: 402 },
    );
  }

  const url = new URL(req.url);
  const runIdParam = url.searchParams.get("runId") ?? null;

  let runId: string;

  if (runIdParam) {
    // Verify the run exists AND belongs to this org (org-scope enforcement).
    const runRows = await db
      .select({ id: schema.runs.id })
      .from(schema.runs)
      .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
      .where(
        and(
          eq(schema.accounts.orgId, orgId),
          eq(schema.runs.id, runIdParam),
        ),
      )
      .limit(1);

    const run = runRows[0];
    if (!run) {
      return Response.json({ error: "run_not_found" }, { status: 404 });
    }
    runId = run.id;
  } else {
    // No runId supplied — use the latest succeeded run for this org.
    const latestRows = await db
      .select({ id: schema.runs.id })
      .from(schema.runs)
      .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
      .where(
        and(
          eq(schema.accounts.orgId, orgId),
          eq(schema.runs.status, "succeeded"),
        ),
      )
      .orderBy(desc(schema.runs.finishedAt))
      .limit(1);

    const latest = latestRows[0];
    if (!latest) {
      return Response.json({ error: "run_not_found" }, { status: 404 });
    }
    runId = latest.id;
  }

  // Fetch all findings for the resolved run, org-scoped via accounts join.
  const rows = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      resourceId: schema.opportunities.resourceId,
      region: schema.accounts.region,
      monthlySavings: schema.opportunities.monthlySavings,
      risk: schema.opportunities.risk,
      appliedAt: schema.opportunities.appliedAt,
      dismissedAt: schema.opportunities.dismissedAt,
      createdAt: schema.opportunities.createdAt,
      explanation: schema.opportunities.explanation,
    })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        eq(schema.opportunities.runId, runId),
      ),
    );

  // Build CSV.
  const header =
    "id,kind,resourceId,region,monthlySavings,annualSavings,risk,status,detectedAt,explanation";

  const dataLines = rows.map((row) => {
    const monthly = parseFloat(row.monthlySavings ?? "0");
    const annual = (monthly * 12).toFixed(2);

    const status =
      row.appliedAt != null
        ? "applied"
        : row.dismissedAt != null
        ? "dismissed"
        : "open";

    return [
      csvField(row.id),
      csvField(row.kind),
      csvField(row.resourceId),
      csvField(row.region),
      csvField(row.monthlySavings),
      csvField(annual),
      csvField(row.risk),
      csvField(status),
      csvField(row.createdAt.toISOString()),
      csvField(row.explanation),
    ].join(",");
  });

  const csv = [header, ...dataLines].join("\r\n");

  void capture({ distinctId: orgId, event: "findings_exported", properties: { orgId, rowCount: rows.length } });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stratos-findings-${runId}.csv"`,
    },
  });
}
