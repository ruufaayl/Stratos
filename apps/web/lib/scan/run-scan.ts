/**
 * Core scan orchestration function.
 *
 * Sequence:
 *   1. Create runs row (status: "running")
 *   2. Assume IAM role
 *   3. Enumerate enabled regions (DescribeRegions, fallback to DEFAULT_SCAN_REGIONS)
 *   4. For each region (3 in parallel): list EC2 + EBS + RDS, fetch CloudWatch
 *   5. List S3 buckets globally (one call, no region iteration)
 *   6. Filter to resources with ≥48 CW datapoints (≥1 day at 30-min resolution)
 *   7. POST aggregated telemetry to engine /analyze
 *   8. Persist opportunities to DB
 *   9. Mark run succeeded + update account.lastScanAt
 *
 * A 120-second timeout guards against hanging AWS calls.
 * On timeout or any error: run row is marked "failed".
 *
 * Region failures are non-fatal: a single region erroring (throttle, permission,
 * partition outage) is logged and the scan continues with the remaining regions.
 *
 * ARCHITECTURE LAW: Python engine owns all dollar arithmetic.
 *                   This function feeds input and persists output only.
 */

import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assumeRole } from "@/lib/aws/assume-role";
import { listEc2Instances } from "@/lib/aws/ec2-lister";
import { listEbsVolumes } from "@/lib/aws/ebs-lister";
import { listRdsInstances } from "@/lib/aws/rds-lister";
import { listS3Buckets } from "@/lib/aws/s3-lister";
import { getEnabledRegions } from "@/lib/aws/regions";
import type { AwsCredentials } from "@/lib/aws/assume-role";
import type { Ec2InstanceInfo } from "@/lib/aws/ec2-lister";
import type { EbsVolumeRecord } from "@/lib/aws/ebs-lister";
import type { RdsInstanceRecord } from "@/lib/aws/rds-lister";
import type { S3BucketRecord } from "@/lib/aws/s3-lister";
import type { InstanceTelemetry } from "@/lib/aws/cloudwatch-fetcher";
import {
  fetchInstanceTelemetry,
  fetchRdsCpuMetrics,
} from "@/lib/aws/cloudwatch-fetcher";
import { analyze } from "@/lib/engine/client";

export interface ScanInput {
  id: string;       // account UUID
  orgId: string;
  roleArn: string;
  externalId: string;
  region: string;   // preferred region (used to bootstrap DescribeRegions)
}

export interface ScanResult {
  runId: string;
  status: "succeeded" | "failed";
  totalFindings: number;
  totalSavingsCents: number;
  error?: string;
}

const SCAN_TIMEOUT_MS = 120_000;
/** Minimum datapoints required to feed the engine (1 day at 30-min resolution). */
const MIN_DATAPOINTS = 48;
/** Cap on simultaneous region scans — AWS rate-limits per region but the
 *  cumulative request fan-out across 10+ regions can throttle STS/CW. */
const REGION_CONCURRENCY = 3;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Scan timed out after ${ms / 1000}s`)), ms),
  );
  return Promise.race([promise, timeout]);
}

/**
 * Process `items` in chunks of `size`, awaiting all promises in a chunk before
 * starting the next. Used to cap concurrent AWS region scans.
 */
async function chunked<T, R>(
  items: T[],
  size: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const chunkResults = await Promise.all(slice.map(fn));
    results.push(...chunkResults);
  }
  return results;
}

/**
 * Per-region scan result. Any field can be empty if the underlying AWS call
 * failed — failures are swallowed at this level so the multi-region rollup
 * never aborts on a single region.
 */
interface RegionScanResult {
  region: string;
  instances: Ec2InstanceInfo[];
  ebsVolumes: EbsVolumeRecord[];
  rdsInstances: RdsInstanceRecord[];
  telemetry: InstanceTelemetry[];
  rdsCpu: number[][];
}

async function scanRegion(
  credentials: AwsCredentials,
  region: string,
): Promise<RegionScanResult> {
  const result: RegionScanResult = {
    region,
    instances: [],
    ebsVolumes: [],
    rdsInstances: [],
    telemetry: [],
    rdsCpu: [],
  };

  try {
    result.instances = await listEc2Instances(credentials, region);
  } catch (err) {
    console.error(`[runScan][${region}] listEc2Instances failed (non-fatal):`, err);
  }

  try {
    result.ebsVolumes = await listEbsVolumes(credentials, region);
  } catch (err) {
    console.error(`[runScan][${region}] listEbsVolumes failed (non-fatal):`, err);
  }

  try {
    result.rdsInstances = await listRdsInstances(credentials, region);
  } catch (err) {
    console.error(`[runScan][${region}] listRdsInstances failed (non-fatal):`, err);
  }

  // Fetch CloudWatch only where we have resources to score.
  if (result.instances.length > 0) {
    try {
      result.telemetry = await fetchInstanceTelemetry(credentials, result.instances);
    } catch (err) {
      console.error(`[runScan][${region}] fetchInstanceTelemetry failed (non-fatal):`, err);
    }
  }

  if (result.rdsInstances.length > 0) {
    try {
      const cwClient = new CloudWatchClient({ region, credentials });
      result.rdsCpu = await Promise.all(
        result.rdsInstances.map((inst) =>
          fetchRdsCpuMetrics(cwClient, inst.instanceId, 14),
        ),
      );
    } catch (err) {
      console.error(`[runScan][${region}] fetchRdsCpuMetrics failed (non-fatal):`, err);
      result.rdsCpu = result.rdsInstances.map(() => []);
    }
  }

  return result;
}

export async function runScan(account: ScanInput): Promise<ScanResult> {
  // 1. Create run record
  const insertedRuns = await db
    .insert(schema.runs)
    .values({ accountId: account.id, status: "running" })
    .returning({ id: schema.runs.id });

  const run = insertedRuns[0];
  if (!run) throw new Error("Failed to create run row");

  const runId = run.id;

  async function markFailed(message: string): Promise<ScanResult> {
    await db
      .update(schema.runs)
      .set({ finishedAt: new Date(), status: "failed", errorMessage: message })
      .where(eq(schema.runs.id, runId));
    return { runId, status: "failed", totalFindings: 0, totalSavingsCents: 0, error: message };
  }

  try {
    return await withTimeout(
      (async (): Promise<ScanResult> => {
        // 2. Assume IAM role
        const credentials = await assumeRole(
          account.roleArn,
          account.externalId,
          "StratosScan",
        );

        // 3. Enumerate regions (best-effort, fallback to DEFAULT_SCAN_REGIONS)
        const regions = await getEnabledRegions(credentials, account.region);

        // 4. Scan all regions, chunked to cap concurrency
        const regionResults = await chunked(regions, REGION_CONCURRENCY, (r) =>
          scanRegion(credentials, r),
        );

        // Aggregate across regions
        const allInstances: Ec2InstanceInfo[] = [];
        const allEbsVolumes: EbsVolumeRecord[] = [];
        const allRdsInstances: RdsInstanceRecord[] = [];
        const allTelemetry: InstanceTelemetry[] = [];
        // Pair each RDS instance with its CPU array. We flatten with the same
        // ordering as allRdsInstances so the indices stay aligned downstream.
        const allRdsCpu: number[][] = [];

        for (const r of regionResults) {
          allInstances.push(...r.instances);
          allEbsVolumes.push(...r.ebsVolumes);
          allRdsInstances.push(...r.rdsInstances);
          allTelemetry.push(...r.telemetry);
          allRdsCpu.push(...r.rdsCpu);
        }

        // 5. List S3 buckets — global service, one call regardless of region.
        // Non-fatal: returns [] on any error (already handled inside the lister).
        let s3Buckets: S3BucketRecord[] = [];
        try {
          s3Buckets = await listS3Buckets(credentials);
        } catch (err) {
          console.error("[runScan] listS3Buckets failed (non-fatal):", err);
          s3Buckets = [];
        }

        const totalResourcesEnumerated =
          allInstances.length +
          allEbsVolumes.length +
          allRdsInstances.length +
          s3Buckets.length;

        if (totalResourcesEnumerated === 0) {
          await db
            .update(schema.runs)
            .set({
              finishedAt: new Date(),
              status: "succeeded",
              totalMonthlyWaste: "0",
              resourceCount: 0,
              opportunityCount: 0,
            })
            .where(eq(schema.runs.id, runId));
          await db
            .update(schema.accounts)
            .set({ lastScanAt: new Date() })
            .where(eq(schema.accounts.id, account.id));
          return { runId, status: "succeeded", totalFindings: 0, totalSavingsCents: 0 };
        }

        // 6. Project + filter for the engine
        const resources = allTelemetry
          .filter((t) => t.cpu.length >= MIN_DATAPOINTS)
          .map((t) => ({
            resource_id: t.instanceId,
            service: "EC2",
            resource_type: t.instanceType,
            region: t.region,
            cpu: t.cpu,
            hourly_cost: t.hourlyOnDemandUsd,
            tags: t.tags,
          }));

        // Project EBS volumes into the engine payload. Field names mirror
        // engine/main.py EbsVolumeIn — the engine derives hourly cost from
        // (volume_type, size_gb) using its own EBS catalog. Python owns truth.
        const ebs_volumes = allEbsVolumes.map((v) => ({
          volume_id: v.volumeId,
          state: v.state,
          size_gb: v.sizeGb,
          volume_type: v.volumeType,
          region: v.region,
          create_time: v.createTime,
        }));

        // Project RDS instances into the engine payload (D10-B). We pass
        // hourly_cost: 0 here — the engine owns the RDS pricing catalog and
        // applies it from instance_class. Architecture law: Python owns truth.
        const rds_instances = allRdsInstances
          .map((inst, i) => ({
            instance_id: inst.instanceId,
            instance_class: inst.instanceClass,
            engine: inst.engine,
            multi_az: inst.multiAz,
            storage_gb: inst.storageGb,
            region: inst.region,
            cpu_utilization_pct: allRdsCpu[i] ?? [],
            hourly_cost: 0,
          }))
          .filter((r) => r.cpu_utilization_pct.length >= MIN_DATAPOINTS);

        // Project S3 buckets — future-proofing. Engine may or may not consume
        // these today; the payload key is `s3_buckets` and matches the Zod
        // schema in lib/engine/types.ts.
        const s3_buckets = s3Buckets.map((b) => ({
          bucket_name: b.bucketName,
          region: b.region,
          creation_date: b.creationDate,
        }));

        if (
          resources.length === 0 &&
          ebs_volumes.length === 0 &&
          rds_instances.length === 0
        ) {
          // No scoreable resources (S3 buckets are enumerated but not yet
          // scored by the engine — they don't count as a finding source).
          await db
            .update(schema.runs)
            .set({
              finishedAt: new Date(),
              status: "succeeded",
              totalMonthlyWaste: "0",
              resourceCount: totalResourcesEnumerated,
              opportunityCount: 0,
            })
            .where(eq(schema.runs.id, runId));
          await db
            .update(schema.accounts)
            .set({ lastScanAt: new Date() })
            .where(eq(schema.accounts.id, account.id));
          return { runId, status: "succeeded", totalFindings: 0, totalSavingsCents: 0 };
        }

        // 7. Call engine — Python owns all dollar math
        const result = await analyze({
          resources,
          ebs_volumes,
          rds_instances,
          s3_buckets,
        });

        // 8. Persist opportunities — capture inserted IDs for enrichment
        const insertedOpps: { id: string; resourceId: string | null }[] =
          result.opportunities.length > 0
            ? await db
                .insert(schema.opportunities)
                .values(
                  result.opportunities.map((o) => {
                    const resourceId =
                      "resource_id" in o && typeof o.resource_id === "string"
                        ? o.resource_id
                        : null;
                    return {
                      runId,
                      accountId: account.id,
                      kind: o.kind,
                      resourceId,
                      monthlySavings: String(o.monthly_savings),
                      risk: o.risk !== undefined ? String(o.risk) : null,
                      engineData: o as Record<string, unknown>,
                    };
                  }),
                )
                .returning({ id: schema.opportunities.id, resourceId: schema.opportunities.resourceId })
            : [];

        const totalSavingsCents = Math.round(result.total_monthly_waste * 100);

        // The engine reports resource_count for resources it actually scored.
        // We report resourceCount as the full enumeration across all regions
        // + S3 — this is what the user sees as "we looked at N resources".
        const reportedResourceCount = Math.max(
          result.resource_count,
          totalResourcesEnumerated,
        );

        // 9. Mark run succeeded + update account
        await db
          .update(schema.runs)
          .set({
            finishedAt: new Date(),
            status: "succeeded",
            totalMonthlyWaste: String(result.total_monthly_waste),
            resourceCount: reportedResourceCount,
            opportunityCount: result.opportunity_count,
            engineRaw: result as Record<string, unknown>,
          })
          .where(eq(schema.runs.id, runId));

        await db
          .update(schema.accounts)
          .set({ lastScanAt: new Date() })
          .where(eq(schema.accounts.id, account.id));

        // Best-effort Claude enrichment — does not affect scan success status.
        // explainOpportunities returns [{resource_id, explanation}] in same order
        // as input; we match by resource_id to find the correct DB row.
        if (insertedOpps.length > 0) {
          try {
            const { explainOpportunities } = await import("@/lib/ai/explain");
            const explanations = await explainOpportunities(result.opportunities);

            // Build a lookup: resource_id → DB row id
            const resourceIdToDbId = new Map<string, string>();
            for (const row of insertedOpps) {
              if (row.resourceId) resourceIdToDbId.set(row.resourceId, row.id);
            }

            await Promise.all(
              explanations.map(async ({ resource_id, explanation }) => {
                const dbId = resourceIdToDbId.get(resource_id);
                if (!dbId) return;
                await db
                  .update(schema.opportunities)
                  .set({ explanation })
                  .where(eq(schema.opportunities.id, dbId));
              }),
            );
          } catch (err) {
            console.error("[runScan] enrichment failed (non-fatal):", err);
          }
        }

        return {
          runId,
          status: "succeeded",
          totalFindings: result.opportunity_count,
          totalSavingsCents,
        };
      })(),
      SCAN_TIMEOUT_MS,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown scan error";
    return markFailed(message);
  }
}
