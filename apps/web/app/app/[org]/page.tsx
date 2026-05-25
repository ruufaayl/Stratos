import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { TabBar, type TabId } from "@/components/overview/tab-bar";
import { PulseTab } from "@/components/overview/pulse-tab";
import { FeedTab } from "@/components/overview/feed-tab";
import { MapTab } from "@/components/overview/map-tab";
import { ForecastTab } from "@/components/overview/forecast-tab";
import { OverviewSkeleton } from "@/components/overview/overview-skeleton";
import { Empty } from "@/components/ui/empty";

const VALID_TABS = ["pulse", "feed", "map", "forecast"] as const satisfies readonly TabId[];

function parseTab(raw: string | undefined): TabId {
  return (VALID_TABS.includes(raw as TabId) ? raw : "pulse") as TabId;
}

// Inner async component so Suspense boundary works
async function OverviewContent({
  orgId,
  orgSlug,
  tab,
}: {
  orgId: string;
  orgSlug: string;
  tab: TabId;
}) {
  // Redirect to welcome if no accounts yet
  const accountCheck = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  if (accountCheck.length === 0) redirect(`/app/${orgSlug}/welcome`);

  // Find the latest successful run for this org
  const latestRunRows = await db
    .select({
      id: schema.runs.id,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
      resourceCount: schema.runs.resourceCount,
      finishedAt: schema.runs.finishedAt,
    })
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

  // Empty-first: accounts exist but no scan has completed yet
  if (!latestRun) {
    return (
      <Empty
        title="First scan in progress"
        body="Your AWS account is connected. Stratos is running the first engine scan — findings will appear here within the next 2 minutes."
        action={
          <Link
            href={`/app/${orgSlug}/integrations`}
            className="inline-flex items-center justify-center h-9 px-3.5 text-[13px] font-medium rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong transition-colors"
          >
            View integrations
          </Link>
        }
      />
    );
  }

  // Fetch findings for the latest run (used by feed + map)
  const findingRows = await db
    .select()
    .from(schema.opportunities)
    .where(eq(schema.opportunities.runId, latestRun.id))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(50);

  // Realized savings: sum of applied findings across all org's runs
  const appliedRows = await db
    .select({ monthly: schema.opportunities.monthlySavings })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        isNotNull(schema.opportunities.appliedAt),
      )
    );
  const realizedSavings = appliedRows.reduce(
    (sum, r) => sum + Number(r.monthly),
    0,
  );

  // Kind breakdown for the latest run
  const kindRows = latestRun
    ? await db
        .select({
          kind: schema.opportunities.kind,
          count: sql<number>`count(*)::int`,
          total: sql<string>`sum(${schema.opportunities.monthlySavings})`,
        })
        .from(schema.opportunities)
        .where(eq(schema.opportunities.runId, latestRun.id))
        .groupBy(schema.opportunities.kind)
    : [];

  // Last 10 succeeded runs for trend chart
  const scanHistoryRows = await db
    .select({
      finishedAt: schema.runs.finishedAt,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
    })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(and(
      eq(schema.accounts.orgId, orgId),
      eq(schema.runs.status, "succeeded"),
    ))
    .orderBy(desc(schema.runs.finishedAt))
    .limit(10);

  const scanHistory = scanHistoryRows
    .reverse() // chronological order for chart
    .map((r, i) => ({
      label: `Scan ${i + 1}`,
      waste: Number(r.totalMonthlyWaste ?? 0),
      findings: r.opportunityCount ?? 0,
      date: r.finishedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? "",
    }));

  const totalMonthlyWaste = Number(latestRun.totalMonthlyWaste ?? 0);
  const resourceCount = latestRun.resourceCount ?? 0;

  return (
    <>
      <TabBar orgSlug={orgSlug} currentTab={tab} />

      {tab === "pulse" && (
        <PulseTab
          totalMonthlyWaste={totalMonthlyWaste}
          resourceCount={resourceCount}
          realizedSavings={realizedSavings}
          kindBreakdown={kindRows.map(r => ({ kind: r.kind, count: r.count, savings: Number(r.total ?? 0) }))}
        />
      )}
      {tab === "feed" && (
        <FeedTab findings={findingRows} orgSlug={orgSlug} />
      )}
      {tab === "map" && <MapTab findings={findingRows} />}
      {tab === "forecast" && <ForecastTab scanHistory={scanHistory} />}
    </>
  );
}

export default async function OrgRoot({
  params,
  searchParams,
}: {
  params: { org: string };
  searchParams: { tab?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}`);

  const tab = parseTab(searchParams.tab);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · OVERVIEW
      </div>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent orgId={orgId} orgSlug={params.org} tab={tab} />
      </Suspense>
    </div>
  );
}
