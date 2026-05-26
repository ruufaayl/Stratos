// apps/web/app/app/[org]/scans/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { Empty } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";
import {
  Table,
  THead,
  TBody,
  TR,
  TH,
  TD,
} from "@/components/ui/table";
import { usd } from "@/lib/utils";

// ─── Relative time helper ────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

// ─── Duration helper ─────────────────────────────────────────────────────────

function formatDuration(
  startedAt: Date,
  finishedAt: Date | null,
  status: string,
): string {
  if (status === "running") return "running…";
  if (!finishedAt) return "—";
  const ms = finishedAt.getTime() - startedAt.getTime();
  const secs = Math.round(ms / 1_000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

// ─── Status chip ─────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  if (status === "succeeded") return <Chip kind="savings" size="sm">Succeeded</Chip>;
  if (status === "running")   return <Chip kind="risk"    size="sm">Running</Chip>;
  return                             <Chip kind="waste"   size="sm">Failed</Chip>;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ScansSkeleton() {
  return (
    <div className="animate-pulse space-y-px">
      <div className="h-9 bg-bg-elevated rounded-t-card" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 bg-bg-surface border-b border-border-subtle" />
      ))}
    </div>
  );
}

// ─── Inner async RSC ─────────────────────────────────────────────────────────

async function ScansContent({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const rows = await db
    .select({
      id:                schema.runs.id,
      startedAt:         schema.runs.startedAt,
      finishedAt:        schema.runs.finishedAt,
      status:            schema.runs.status,
      resourceCount:     schema.runs.resourceCount,
      opportunityCount:  schema.runs.opportunityCount,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      // Account fields for the join
      accountName:       schema.accounts.name,
      roleArn:           schema.accounts.roleArn,
      awsAccountId:      schema.accounts.awsAccountId,
    })
    .from(schema.runs)
    .innerJoin(
      schema.accounts,
      eq(schema.runs.accountId, schema.accounts.id),
    )
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.runs.startedAt))
    .limit(50);

  if (rows.length === 0) {
    return (
      <Empty
        title="No scans yet"
        body="Run your first scan from the Overview page."
        action={
          <Link
            href={`/app/${orgSlug}`}
            className="inline-flex items-center justify-center gap-2 font-medium h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong transition-colors"
          >
            Go to Overview
          </Link>
        }
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Started</TH>
          <TH>Status</TH>
          <TH>Duration</TH>
          <TH>Account</TH>
          <TH>Resources</TH>
          <TH>Findings</TH>
          <TH>Monthly waste</TH>
          <TH></TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((run) => {
          // Extract a short account label: prefer awsAccountId, else last segment of roleArn, else accountName
          const accountLabel =
            run.awsAccountId ??
            (run.roleArn ? run.roleArn.split(":").at(-1) ?? run.accountName : run.accountName);

          return (
            <TR key={run.id}>
              <TD className="text-text-primary font-mono text-xs whitespace-nowrap">
                {relativeTime(run.startedAt)}
              </TD>

              <TD>
                <StatusChip status={run.status} />
              </TD>

              <TD className="font-mono text-xs text-text-muted tabular-nums">
                {formatDuration(run.startedAt, run.finishedAt, run.status)}
              </TD>

              <TD className="font-mono text-xs text-text-muted whitespace-nowrap">
                {accountLabel}
              </TD>

              <TD numeric className="text-text-secondary">
                {run.resourceCount ?? "—"}
              </TD>

              <TD numeric className="text-text-secondary">
                {run.opportunityCount ?? "—"}
              </TD>

              <TD numeric className="text-waste-300 font-semibold">
                {run.status === "succeeded" && run.totalMonthlyWaste !== null
                  ? `${usd(Number(run.totalMonthlyWaste))}/mo`
                  : "—"}
              </TD>

              <TD className="text-right">
                {run.status === "succeeded" ? (
                  <Link
                    href={`/app/${orgSlug}?tab=feed`}
                    className="text-[12px] text-intel-400 hover:text-intel-300 transition-colors whitespace-nowrap"
                  >
                    View findings →
                  </Link>
                ) : (
                  <span className="text-[12px] text-text-faint">—</span>
                )}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ScansPage({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}/scans`);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · SCAN HISTORY
      </div>
      <Suspense fallback={<ScansSkeleton />}>
        <ScansContent orgId={orgId} orgSlug={params.org} />
      </Suspense>
    </div>
  );
}
