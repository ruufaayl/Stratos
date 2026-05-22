// Engine output shapes — must mirror engine/main.py /analyze response.
// Source of truth is the Python; this file is a Zod-validated mirror.

import { z } from "zod";

const baseOpportunity = z.object({
  kind: z.string(),
  monthly_savings: z.number(),
  risk: z.number().min(0).max(1).optional(),
});

export const idleOpportunity = baseOpportunity.extend({
  kind: z.literal("idle"),
  resource_id: z.string(),
  resource_type: z.string(),
  idle_score: z.number(),
  peak_cpu_pct: z.number(),
  peak_net_bps: z.number().nullable(),
  monthly_cost: z.number(),
});

export const rightsizeOpportunity = baseOpportunity.extend({
  kind: z.literal("rightsize"),
  resource_id: z.string(),
  from_type: z.string(),
  to_type: z.string(),
  p95_cpu_pct: z.number(),
  demand_vcpu_with_headroom: z.number(),
  from_price_hr: z.number(),
  to_price_hr: z.number(),
  amber: z.boolean(),
});

export const anomalyOpportunity = baseOpportunity.extend({
  kind: z.literal("anomaly"),
  day_index: z.number(),
  actual: z.number(),
  expected: z.number(),
  overspend: z.number(),
  sigma: z.number(),
});

export const commitmentOpportunity = baseOpportunity.extend({
  kind: z.literal("commitment"),
  commit_level: z.number(),
  critical_quantile: z.number(),
  current_monthly: z.number(),
  optimized_monthly: z.number(),
  savings_pct: z.number(),
  coverage_pct: z.number(),
  samples: z.number(),
});

export const opportunity = z.discriminatedUnion("kind", [
  idleOpportunity,
  rightsizeOpportunity,
  anomalyOpportunity,
  commitmentOpportunity,
]);

export const analyzeResponse = z.object({
  resource_count: z.number(),
  opportunity_count: z.number(),
  total_monthly_waste: z.number(),
  opportunities: z.array(opportunity),
});

export type Opportunity = z.infer<typeof opportunity>;
export type IdleOpportunity = z.infer<typeof idleOpportunity>;
export type RightsizeOpportunity = z.infer<typeof rightsizeOpportunity>;
export type AnomalyOpportunity = z.infer<typeof anomalyOpportunity>;
export type CommitmentOpportunity = z.infer<typeof commitmentOpportunity>;
export type AnalyzeResponse = z.infer<typeof analyzeResponse>;

// Telemetry shape that engine /analyze accepts
export const telemetryIn = z.object({
  resource_id: z.string(),
  service: z.string().default("EC2"),
  resource_type: z.string(),
  region: z.string().default("us-east-1"),
  cpu: z.array(z.number()),
  hourly_cost: z.number(),
  net_in: z.array(z.number()).nullable().optional(),
  net_out: z.array(z.number()).nullable().optional(),
  mem: z.array(z.number()).nullable().optional(),
  tags: z.record(z.string(), z.string()).default({}),
});

export type TelemetryIn = z.infer<typeof telemetryIn>;

export const analyzeRequest = z.object({
  resources: z.array(telemetryIn),
  daily_cost: z.array(z.number()).optional(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequest>;
