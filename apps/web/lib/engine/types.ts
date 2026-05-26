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

export const zombieOpportunity = baseOpportunity.extend({
  kind: z.literal("zombie"),
  resource_id: z.string(),
  resource_type: z.string(),
  monthly_cost: z.number(),
  zombie_label: z.enum(["stopped", "near-stopped"]),
  max_cpu_pct: z.number(),
  data_days: z.number(),
  confidence: z.number(),
});

export const opportunity = z.discriminatedUnion("kind", [
  idleOpportunity,
  rightsizeOpportunity,
  anomalyOpportunity,
  commitmentOpportunity,
  zombieOpportunity,
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

// Unattached EBS volume payload (D9-D). The engine projects each one as
// zero-CPU telemetry into the zombie pipeline; we never compute dollars here.
export const ebsVolumeIn = z.object({
  volume_id: z.string(),
  state: z.string().default("available"),
  size_gb: z.number(),
  volume_type: z.string().default("gp2"),
  region: z.string().default("us-east-1"),
  create_time: z.string().nullable().optional(),
});

export type EbsVolumeIn = z.infer<typeof ebsVolumeIn>;

// RDS instance payload (D10-B). Idle RDS instances are often the biggest
// waste line on an AWS account — db.r5.4xlarge fully idle is $1,800+/mo.
// The engine projects each instance into ResourceTelemetry and runs the
// standard idle heuristic. hourly_cost is passed 0; the engine owns truth.
export const rdsInstanceIn = z.object({
  instance_id: z.string(),
  instance_class: z.string(),
  engine: z.string().default("unknown"),
  multi_az: z.boolean().default(false),
  storage_gb: z.number().default(0),
  region: z.string().default("us-east-1"),
  cpu_utilization_pct: z.array(z.number()),
  hourly_cost: z.number().default(0),
});

export type RdsInstanceIn = z.infer<typeof rdsInstanceIn>;

// S3 bucket payload (D11-A). Future-proofing for zombie-bucket detection:
// the engine will eventually score buckets by last-modified-object age and
// storage class. For now we just plumb the metadata through.
export const s3BucketIn = z.object({
  bucket_name: z.string(),
  region: z.string().default("us-east-1"),
  creation_date: z.string(),
});

export type S3BucketIn = z.infer<typeof s3BucketIn>;

export const analyzeRequest = z.object({
  resources: z.array(telemetryIn),
  daily_cost: z.array(z.number()).optional(),
  ebs_volumes: z.array(ebsVolumeIn).optional(),
  rds_instances: z.array(rdsInstanceIn).optional(),
  s3_buckets: z.array(s3BucketIn).optional(),
});
export type AnalyzeRequest = z.infer<typeof analyzeRequest>;
