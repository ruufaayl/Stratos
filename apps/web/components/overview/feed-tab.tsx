import Link from "next/link";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { Empty } from "@/components/ui/empty";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import type { Opportunity as DbFinding } from "@/lib/db/schema";
import type { Opportunity } from "@/lib/engine/types";

interface FeedTabProps {
  findings: DbFinding[];
  orgSlug: string;
}

/**
 * Findings feed tab.
 * Pairs each DB row with its parsed engine Opportunity so OpportunityCard
 * gets strongly-typed data AND we preserve the DB row id for deep-linking.
 * Rows whose engineData fails Zod parse are silently dropped.
 */
export function FeedTab({ findings, orgSlug }: FeedTabProps) {
  type Pair = { row: DbFinding; opp: Opportunity };
  const pairs = findings.reduce<Pair[]>((acc, row) => {
    const opp = dbRowToEngineOpportunity(row);
    if (opp) acc.push({ row, opp });
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

  if (pairs.length === 0) {
    return (
      <Empty
        title="No actionable findings"
        body="The engine found resources but none crossed the current confidence threshold. Check back after more data accumulates."
      />
    );
  }

  return (
    <div className="space-y-3">
      {pairs.map(({ row, opp }, i) => (
        <Link
          key={row.id}
          href={`/app/${orgSlug}/findings/${row.id}`}
          className="block hover:opacity-90 transition-opacity"
        >
          <OpportunityCard
            opportunity={opp}
            index={i}
            explanation={row.explanation ?? undefined}
          />
        </Link>
      ))}
    </div>
  );
}
