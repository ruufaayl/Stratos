import { describe, it, expect } from "vitest";
import { dbRowToEngineOpportunity, dbRowsToOpportunities } from "./adapters";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

function makeDbRow(engineData: Record<string, unknown>): DbFinding {
  return {
    id: "opp-1",
    runId: "run-1",
    accountId: "acc-1",
    kind: "idle",
    resourceId: "i-0abc",
    monthlySavings: "121.47",
    risk: "0.100",
    engineData,
    explanation: null,
    dismissedAt: null,
    appliedAt: null,
    createdAt: new Date("2024-01-01"),
  };
}

const VALID_IDLE_DATA = {
  kind: "idle",
  resource_id: "i-0abc",
  resource_type: "t3.xlarge",
  monthly_savings: 121.47,
  risk: 0.1,
  idle_score: 0.95,
  peak_cpu_pct: 2.0,
  peak_net_bps: null,
  monthly_cost: 121.47,
};

const VALID_RIGHTSIZE_DATA = {
  kind: "rightsize",
  resource_id: "i-0def",
  monthly_savings: 55.0,
  risk: 0.2,
  from_type: "m5.xlarge",
  to_type: "m5.large",
  p95_cpu_pct: 12.5,
  demand_vcpu_with_headroom: 1.8,
  from_price_hr: 0.192,
  to_price_hr: 0.096,
  amber: false,
};

describe("dbRowToEngineOpportunity", () => {
  it("parses a valid idle engineData row", () => {
    const row = makeDbRow(VALID_IDLE_DATA);
    const result = dbRowToEngineOpportunity(row);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("idle");
    if (result?.kind === "idle") {
      expect(result.resource_id).toBe("i-0abc");
      expect(result.monthly_savings).toBe(121.47);
    }
  });

  it("parses a valid rightsize engineData row", () => {
    const row = makeDbRow(VALID_RIGHTSIZE_DATA);
    const result = dbRowToEngineOpportunity(row);
    expect(result?.kind).toBe("rightsize");
  });

  it("returns null for malformed engineData", () => {
    const row = makeDbRow({ kind: "unknown-kind", garbage: true });
    expect(dbRowToEngineOpportunity(row)).toBeNull();
  });

  it("returns null when engineData is missing required fields", () => {
    const row = makeDbRow({ kind: "idle" }); // missing resource_id etc.
    expect(dbRowToEngineOpportunity(row)).toBeNull();
  });
});

describe("dbRowsToOpportunities", () => {
  it("filters out rows that fail parsing", () => {
    const rows = [
      makeDbRow(VALID_IDLE_DATA),
      makeDbRow({ bad: "data" }),
      makeDbRow(VALID_RIGHTSIZE_DATA),
    ];
    const results = dbRowsToOpportunities(rows);
    expect(results).toHaveLength(2);
    expect(results[0]?.kind).toBe("idle");
    expect(results[1]?.kind).toBe("rightsize");
  });

  it("returns empty array for empty input", () => {
    expect(dbRowsToOpportunities([])).toEqual([]);
  });
});
