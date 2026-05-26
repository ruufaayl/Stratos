import { Empty } from "@/components/ui/empty";
import { FeedTabInteractive, type FeedRow } from "./feed-tab-interactive";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

interface FeedTabProps {
  findings: DbFinding[];
  orgSlug: string;
}

/**
 * Findings feed tab (RSC).
 * Parses each DB row's engineData into a strongly-typed Opportunity and
 * hands the result to FeedTabInteractive, which owns the multi-select
 * UI + bulk-action bar. Rows whose engineData fails Zod parse are
 * silently dropped.
 */
export function FeedTab({ findings, orgSlug }: FeedTabProps) {
  const rows = findings.reduce<FeedRow[]>((acc, row) => {
    const opp = dbRowToEngineOpportunity(row);
    if (opp) acc.push({ id: row.id, opp, explanation: row.explanation ?? undefined });
    return acc;
  }, []);

  if (findings.length === 0) {
    return (
      <Empty
        title="No findings yet"
        body="Your account is connected. Optimization opportunities will appear here once the first scan completes."
      />
    );
  }

  if (rows.length === 0) {
    return (
      <Empty
        title="No actionable findings"
        body="The engine found resources but none crossed the current confidence threshold. Check back after more data accumulates."
      />
    );
  }

  return <FeedTabInteractive rows={rows} orgSlug={orgSlug} />;
}
