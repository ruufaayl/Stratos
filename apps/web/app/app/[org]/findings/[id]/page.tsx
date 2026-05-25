import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import {
  FindingDetailTabBar,
  type DetailTabId,
} from "@/components/findings/finding-detail-tab-bar";
import { EvidenceTab } from "@/components/findings/evidence-tab";
import { MathTab } from "@/components/findings/math-tab";
import { ReasoningTab } from "@/components/findings/reasoning-tab";
import { ResourceTab } from "@/components/findings/resource-tab";
import { Chip } from "@/components/ui/chip";
import { FindingActions } from "@/components/findings/finding-actions";
import { usd } from "@/lib/utils";

const VALID_DETAIL_TABS: readonly DetailTabId[] = [
  "evidence",
  "math",
  "reasoning",
  "resource",
] as const;

function parseDetailTab(raw: string | undefined): DetailTabId {
  return (VALID_DETAIL_TABS.includes(raw as DetailTabId) ? raw : "evidence") as DetailTabId;
}

const KIND_LABELS: Record<string, string> = {
  idle: "Idle",
  rightsize: "Rightsize",
  anomaly: "Anomaly",
  commitment: "Commitment",
  zombie: "Zombie",
};

export default async function FindingDetailPage({
  params,
  searchParams,
}: {
  params: { org: string; id: string };
  searchParams: { tab?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) {
    redirect(`/sign-in?return_to=/app/${params.org}/findings/${params.id}`);
  }

  const tab = parseDetailTab(searchParams.tab);

  // Fetch the finding, verifying it belongs to this org via INNER JOIN
  const rows = await db
    .select({
      opp: schema.opportunities,
      account: schema.accounts,
    })
    .from(schema.opportunities)
    .innerJoin(
      schema.accounts,
      eq(schema.opportunities.accountId, schema.accounts.id),
    )
    .where(
      and(
        eq(schema.opportunities.id, params.id),
        eq(schema.accounts.orgId, orgId),
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const { opp: finding, account } = row;
  const engineOpp = dbRowToEngineOpportunity(finding);

  // Graceful degradation: engineData failed Zod parse (schema drift or corrupt row)
  if (!engineOpp) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
        <div className="font-mono text-[11px] text-text-faint">STRATOS · FINDINGS</div>
        <Chip kind="waste">{finding.kind}</Chip>
        <div className="text-text-muted text-sm mt-2">
          This finding&apos;s engine data could not be parsed — it may be from
          an older scan format. The raw data is stored and will be re-analyzed
          on the next scan.
        </div>
        <Link
          href={`/app/${params.org}/findings`}
          className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
        >
          Back to findings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-text-faint mb-4">
        <Link
          href={`/app/${params.org}/findings`}
          className="hover:text-text-muted transition-colors"
        >
          FINDINGS
        </Link>
        <span>/</span>
        <span className="text-text-muted truncate max-w-[260px]">
          {finding.resourceId ?? engineOpp.kind}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Chip kind="waste">{KIND_LABELS[finding.kind] ?? finding.kind}</Chip>
        {finding.appliedAt && <Chip kind="savings">Applied</Chip>}
        {finding.dismissedAt && <Chip kind="neutral">Dismissed</Chip>}
      </div>
      <div className="text-xl font-semibold text-text-primary mb-1">
        {finding.resourceId ?? "—"}
      </div>
      <div className="text-savings-500 font-semibold tabular-nums mb-4">
        {usd(Number(finding.monthlySavings))}/mo potential savings
      </div>

      <FindingActions
        findingId={params.id}
        isApplied={finding.appliedAt !== null}
        isDismissed={finding.dismissedAt !== null}
      />

      {/* Tab bar */}
      <FindingDetailTabBar
        orgSlug={params.org}
        findingId={params.id}
        currentTab={tab}
      />

      {/* Tab content */}
      {tab === "evidence" && <EvidenceTab opportunity={engineOpp} />}
      {tab === "math" && (
        <MathTab opportunity={engineOpp} rawEngineData={finding.engineData} />
      )}
      {tab === "reasoning" && (
        <ReasoningTab explanation={finding.explanation} />
      )}
      {tab === "resource" && (
        <ResourceTab
          finding={finding}
          account={account}
          opportunity={engineOpp}
        />
      )}
    </div>
  );
}
