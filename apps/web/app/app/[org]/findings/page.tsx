// apps/web/app/app/[org]/findings/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { FindingFilterBar, type KindFilter } from "@/components/findings/finding-filter-bar";
import { PaginationBar } from "@/components/findings/pagination-bar";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { Empty } from "@/components/ui/empty";
import { ExportButton } from "@/components/findings/export-button";
import type { Opportunity as DbFinding } from "@/lib/db/schema";
import type { Opportunity } from "@/lib/engine/types";

const PAGE_SIZE = 20;

const VALID_KINDS = ["idle", "rightsize", "anomaly", "commitment", "zombie"] as const;
type ValidKind = (typeof VALID_KINDS)[number];

function parseKind(raw: string | undefined): KindFilter {
  return (VALID_KINDS.includes(raw as ValidKind) ? raw : null) as KindFilter;
}

function parsePage(raw: string | undefined): number {
  const n = parseInt(raw ?? "1", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Skeleton shown during Suspense fallback */
function FindingsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-2 mb-6">
        {[60, 50, 80, 70, 90, 60].map((w, i) => (
          <div key={i} className="h-6 bg-bg-elevated rounded-chip" style={{ width: w }} />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-bg-elevated rounded-xl" />
      ))}
    </div>
  );
}

async function FindingsContent({
  orgId,
  orgSlug,
  kind,
  page,
}: {
  orgId: string;
  orgSlug: string;
  kind: KindFilter;
  page: number;
}) {
  // Latest succeeded run for this org
  const latestRunRows = await db
    .select({ id: schema.runs.id })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        eq(schema.runs.status, "succeeded"),
      )
    )
    .orderBy(desc(schema.runs.finishedAt))
    .limit(1);

  const latestRun = latestRunRows[0] ?? null;

  // Empty-first: no scan has completed yet
  if (!latestRun) {
    return (
      <Empty
        title="No findings yet"
        body="Connect an AWS account and run a scan — findings will appear here when the first scan completes."
        action={
          <Link
            href={`/app/${orgSlug}/welcome`}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
          >
            Connect account
          </Link>
        }
      />
    );
  }

  // Build the shared WHERE clause (reused for data query + count query)
  const whereClause = kind
    ? and(
        eq(schema.opportunities.runId, latestRun.id),
        eq(schema.opportunities.kind, kind),
      )
    : eq(schema.opportunities.runId, latestRun.id);

  // Count query — total matching rows for pagination maths
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.opportunities)
    .where(whereClause);
  const totalCount = countRows[0]?.count ?? 0;

  // Empty-filtered: kind filter produced no results
  if (totalCount === 0 && kind !== null) {
    return (
      <>
        <FindingFilterBar orgSlug={orgSlug} currentKind={kind} />
        <Empty
          title={`No ${kind} findings`}
          body="No findings match this filter in the latest scan."
          action={
            <Link
              href={`/app/${orgSlug}/findings`}
              className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
            >
              Clear filter
            </Link>
          }
        />
      </>
    );
  }

  // Empty-first: scan succeeded but no findings
  if (totalCount === 0) {
    return (
      <>
        <FindingFilterBar orgSlug={orgSlug} currentKind={null} />
        <Empty
          title="No waste found"
          body="Your account is healthy — no optimization opportunities detected in the latest scan. Check back after 24h of additional data."
        />
      </>
    );
  }

  // Clamp page to valid range (handles out-of-range ?page= values)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const findingRows = await db
    .select()
    .from(schema.opportunities)
    .where(whereClause)
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  type Pair = { row: DbFinding; opp: Opportunity };
  const pairs = findingRows.reduce<Pair[]>((acc, row) => {
    const opp = dbRowToEngineOpportunity(row);
    if (opp) acc.push({ row, opp });
    return acc;
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-text-secondary">
          {totalCount} finding{totalCount !== 1 ? "s" : ""}
        </span>
        <ExportButton runId={latestRun.id} />
      </div>
      <FindingFilterBar orgSlug={orgSlug} currentKind={kind} />
      <div className="space-y-3">
        {pairs.map(({ row, opp }, i) => (
          <Link
            key={row.id}
            href={`/app/${orgSlug}/findings/${row.id}`}
            className="block hover:opacity-90 transition-opacity"
          >
            <OpportunityCard
              opportunity={opp}
              index={(safePage - 1) * PAGE_SIZE + i}
              explanation={row.explanation ?? undefined}
            />
          </Link>
        ))}
      </div>
      <PaginationBar
        page={safePage}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        baseHref={`/app/${orgSlug}/findings`}
      />
    </>
  );
}

export default async function FindingsPage({
  params,
  searchParams,
}: {
  params: { org: string };
  searchParams: { kind?: string; page?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}/findings`);

  const kind = parseKind(searchParams.kind);
  const page = parsePage(searchParams.page);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · FINDINGS
      </div>
      <Suspense fallback={<FindingsSkeleton />}>
        <FindingsContent orgId={orgId} orgSlug={params.org} kind={kind} page={page} />
      </Suspense>
    </div>
  );
}
