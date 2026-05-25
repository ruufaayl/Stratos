/**
 * Adapters that bridge DB rows (engineData JSONB) to the engine's typed
 * Opportunity discriminated union consumed by dashboard UI components.
 *
 * The DB stores engine opportunity payloads verbatim in engineData.
 * These helpers parse + validate them back into typed engine objects.
 * Returns null on parse failure (malformed or schema drift) — callers filter nulls.
 */

import { opportunity, type Opportunity } from "@/lib/engine/types";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

/**
 * Convert a single DB row to the engine's typed Opportunity.
 * Returns null if the engineData payload cannot be parsed.
 */
export function dbRowToEngineOpportunity(row: DbFinding): Opportunity | null {
  const result = opportunity.safeParse(row.engineData);
  return result.success ? result.data : null;
}

/**
 * Convert a slice of DB rows to engine Opportunities, filtering out any
 * rows whose engineData fails parsing. Preserves order.
 */
export function dbRowsToOpportunities(rows: DbFinding[]): Opportunity[] {
  return rows.flatMap((row) => {
    const opp = dbRowToEngineOpportunity(row);
    return opp ? [opp] : [];
  });
}
