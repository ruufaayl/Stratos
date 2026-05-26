/**
 * Core scan orchestration function.
 *
 * Sequence:
 *   1. Create runs row (status: "running")
 *   2. Assume IAM role
 *   3. List EC2 instances in account's region
 *   4. Fetch 14-day CloudWatch CPU metrics
 *   5. Filter to instances with ≥48 datapoints (≥1 day at 30-min resolution)
 *   6. POST telemetry to engine /analyze
 *   7. Persist opportunities to DB
 *   8. Mark run succeeded + update account.lastScanAt
 *
 * A 120-second timeout guards against hanging AWS calls.
 * On timeout or any error: run row is marked "failed".
 *
 * ARCHITECTURE LAW: Python engine owns all dollar arithmetic.
 *                   This function feeds input and persists output only.
 */

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { assumeRole } from "@/lib/aws/assume-role";
import { listEc2Instances } from "@/lib/aws/ec2-lister";
import { listEbsVolumes } from "@/lib/aws/ebs-lister";
import { fetchInstanceTelemetry } from "@/lib/aws/cloudwatch-fetcher";
import { analyze } from "@/lib/engine/client";

export interface ScanInput {
  id: string;       // account UUID
  orgId: string;
  roleArn: string;
  externalId: string;
  region: string;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Scan timed out after ${ms / 1000}s`)), ms),
  );
  return Promise.race([promise, timeout]);
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
      .set({ finishedAt: new Date(), status: "failed" })
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

        // 3. List EC2 instances
        const instances = await listEc2Instances(credentials, account.region);

        // 3b. List unattached EBS volumes (D9-D — zombie candidates).
        // Non-fatal: a failure here returns [] and the scan still completes
        // with whatever EC2 data we have.
        let ebsVolumes: Awaited<ReturnType<typeof listEbsVolumes>> = [];
        try {
          ebsVolumes = await listEbsVolumes(credentials, account.region);
        } catch (err) {
          console.error("[runScan] listEbsVolumes failed (non-fatal):", err);
          ebsVolumes = [];
        }

        if (instances.length === 0 && ebsVolumes.length === 0) {
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

        // 4. Fetch CloudWatch metrics (only if we have EC2 instances)
        const telemetry =
          instances.length > 0
            ? await fetchInstanceTelemetry(credentials, instances)
            : [];

        // 5. Filter to instances with enough history for the engine
        const resources = telemetry
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
        const ebs_volumes = ebsVolumes.map((v) => ({
          volume_id: v.volumeId,
          state: v.state,
          size_gb: v.sizeGb,
          volume_type: v.volumeType,
          region: v.region,
          create_time: v.createTime,
        }));

        if (resources.length === 0 && ebs_volumes.length === 0) {
          // All instances are too new — no history yet, no zombie volumes either.
          await db
            .update(schema.runs)
            .set({
              finishedAt: new Date(),
              status: "succeeded",
              totalMonthlyWaste: "0",
              resourceCount: instances.length + ebsVolumes.length,
              opportunityCount: 0,
            })
            .where(eq(schema.runs.id, runId));
          await db
            .update(schema.accounts)
            .set({ lastScanAt: new Date() })
            .where(eq(schema.accounts.id, account.id));
          return { runId, status: "succeeded", totalFindings: 0, totalSavingsCents: 0 };
        }

        // 6. Call engine — Python owns all dollar math
        const result = await analyze({ resources, ebs_volumes });

        // 7. Persist opportunities — capture inserted IDs for enrichment
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

        // 8. Mark run succeeded + update account
        await db
          .update(schema.runs)
          .set({
            finishedAt: new Date(),
            status: "succeeded",
            totalMonthlyWaste: String(result.total_monthly_waste),
            resourceCount: result.resource_count,
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
