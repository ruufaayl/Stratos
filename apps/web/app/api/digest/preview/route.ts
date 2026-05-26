/**
 * GET /api/digest/preview
 *
 * Returns the structured DigestOutput plus a plaintext rendering of the
 * weekly digest for the caller's current org. This is the read-only
 * preview surface — sending is wired in a future change.
 *
 * Org scoping is enforced via INNER JOIN on accounts.org_id so we never
 * leak findings from another org.
 *
 * D8-D: builder + endpoint only. No Resend send call.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { buildDigest, type DigestInput, type DigestOutput } from "@/lib/digest/build-digest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Format an integer dollar amount for the plaintext template. */
function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function renderPlaintext(digest: DigestOutput): string {
  const lines: string[] = [];
  lines.push(digest.subject);
  lines.push("");
  lines.push(digest.headline);
  lines.push("");
  lines.push("TOTALS");
  lines.push(`  Monthly waste: ${usd(digest.totals.wasteMonthly)}`);
  lines.push(`  Findings:      ${digest.totals.findings}`);
  lines.push(`  Resources:     ${digest.totals.resources}`);

  if (digest.delta) {
    const wd = digest.delta.wasteMonthly;
    const fd = digest.delta.findings;
    const wSign = wd > 0 ? "+" : wd < 0 ? "-" : "";
    const fSign = fd > 0 ? "+" : fd < 0 ? "-" : "";
    lines.push("");
    lines.push("CHANGE VS PREVIOUS RUN");
    lines.push(`  Waste:    ${wSign}${usd(Math.abs(wd))}/mo`);
    lines.push(`  Findings: ${fSign}${Math.abs(fd)}`);
  }

  if (digest.topFindings.length > 0) {
    lines.push("");
    lines.push("TOP FINDINGS");
    for (const f of digest.topFindings) {
      lines.push(`  ${f.title} — ${usd(f.savings)}/mo`);
      if (f.explanation) lines.push(`    ${f.explanation}`);
    }
  }

  lines.push("");
  lines.push(`${digest.ctaLabel}: ${digest.ctaUrl}`);
  lines.push("");
  lines.push("Python owns truth. Claude owns language. You own the decision.");
  return lines.join("\n");
}

export async function GET(_req: Request) {
  const { userId, orgId, orgSlug } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!orgId || !orgSlug) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  // 1. Latest succeeded run for this org (org-scoped via INNER JOIN).
  const latestRunRows = await db
    .select({
      id: schema.runs.id,
      finishedAt: schema.runs.finishedAt,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
      resourceCount: schema.runs.resourceCount,
      accountName: schema.accounts.name,
    })
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

  const latest = latestRunRows[0];
  if (!latest) {
    // No runs yet — not an error, just nothing to digest.
    return NextResponse.json({ error: "no_runs" });
  }

  // 2. Previous succeeded run (for delta math) — same org, finished before latest.
  const previousRunRows = await db
    .select({
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
    })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        eq(schema.runs.status, "succeeded"),
      ),
    )
    .orderBy(desc(schema.runs.finishedAt))
    .limit(2);
  const previousRow = previousRunRows[1] ?? null;

  // 3. Top 5 findings for the latest run (org-scoped via INNER JOIN).
  const topRows = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      monthlySavings: schema.opportunities.monthlySavings,
      resourceId: schema.opportunities.resourceId,
      explanation: schema.opportunities.explanation,
    })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        eq(schema.opportunities.runId, latest.id),
      ),
    )
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(5);

  const input: DigestInput = {
    orgName: latest.accountName,
    latestRun: {
      finishedAt: latest.finishedAt ?? new Date(0),
      totalMonthlyWaste: Number(latest.totalMonthlyWaste ?? 0),
      opportunityCount: latest.opportunityCount ?? 0,
      resourceCount: latest.resourceCount ?? 0,
    },
    previousRun: previousRow
      ? {
          totalMonthlyWaste: Number(previousRow.totalMonthlyWaste ?? 0),
          opportunityCount: previousRow.opportunityCount ?? 0,
        }
      : null,
    topFindings: topRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      monthlySavings: Number(r.monthlySavings),
      resourceId: r.resourceId,
      explanation: r.explanation,
    })),
  };

  const digest = buildDigest(input, orgSlug);
  const text = renderPlaintext(digest);

  return NextResponse.json({ digest, text });
}
