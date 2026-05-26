/**
 * Fetches 14-day CPU utilization metrics per EC2 instance via CloudWatch.
 *
 * Uses GetMetricStatistics with:
 *   Period: 1800s (30-min intervals) → 672 points over 14 days.
 *   672 << 1440 CW limit, so no pagination needed.
 *
 * ARCHITECTURE LAW: Read-only. cloudwatch:GetMetricStatistics only.
 *                   Collects CPU only for Wave 1. Network/mem = Wave 2.
 */

import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import type { AwsCredentials } from "./assume-role";
import type { Ec2InstanceInfo } from "./ec2-lister";

export interface InstanceTelemetry {
  instanceId: string;
  instanceType: string;
  region: string;
  hourlyOnDemandUsd: number;
  tags: Record<string, string>;
  /** CPU utilization % per 30-min interval, sorted oldest → newest. */
  cpu: number[];
}

const PERIOD_SECONDS = 1800; // 30 minutes
const DAYS_LOOKBACK = 14;

/**
 * Fetches CPU telemetry for each instance.
 * Sequential calls per instance — Wave 1 accounts have ~5 instances.
 * Parallel batching added in Wave 2.
 */
export async function fetchInstanceTelemetry(
  credentials: AwsCredentials,
  instances: Ec2InstanceInfo[],
): Promise<InstanceTelemetry[]> {
  if (instances.length === 0) return [];

  // All instances must be in the same region (enforced by the scan pipeline).
  const region = instances[0]!.region;
  const cw = new CloudWatchClient({ region, credentials });

  const endTime = new Date();
  const startTime = new Date(
    endTime.getTime() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000,
  );

  const results: InstanceTelemetry[] = [];

  for (const inst of instances) {
    const res = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: "AWS/EC2",
        MetricName: "CPUUtilization",
        Dimensions: [{ Name: "InstanceId", Value: inst.instanceId }],
        StartTime: startTime,
        EndTime: endTime,
        Period: PERIOD_SECONDS,
        Statistics: ["Average"],
      }),
    );

    // Sort by Timestamp ascending (CW returns datapoints in unspecified order)
    const sorted = (res.Datapoints ?? []).sort(
      (a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0),
    );

    const cpu = sorted.map((dp) => dp.Average ?? 0);

    results.push({
      instanceId: inst.instanceId,
      instanceType: inst.instanceType,
      region: inst.region,
      hourlyOnDemandUsd: inst.hourlyOnDemandUsd,
      tags: inst.tags,
      cpu,
    });
  }

  return results;
}

/**
 * Fetch RDS CPUUtilization metric for a single DB instance.
 *
 * Same period/stat pattern as EC2 (30-min Average over `daysBack` days).
 * Returns CPU % in [0, 100], sorted oldest → newest.
 *
 * Used by D10-B's RDS idle-detection path. The engine consumes this as
 * `cpu_utilization_pct` and projects it into `ResourceTelemetry` for
 * `idle.detect()`.
 */
export async function fetchRdsCpuMetrics(
  cwClient: CloudWatchClient,
  instanceId: string,
  daysBack: number = DAYS_LOOKBACK,
): Promise<number[]> {
  const endTime = new Date();
  const startTime = new Date(
    endTime.getTime() - daysBack * 24 * 60 * 60 * 1000,
  );

  try {
    const res = await cwClient.send(
      new GetMetricStatisticsCommand({
        Namespace: "AWS/RDS",
        MetricName: "CPUUtilization",
        Dimensions: [{ Name: "DBInstanceIdentifier", Value: instanceId }],
        StartTime: startTime,
        EndTime: endTime,
        Period: PERIOD_SECONDS,
        Statistics: ["Average"],
      }),
    );

    const sorted = (res.Datapoints ?? []).sort(
      (a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0),
    );

    return sorted.map((dp) => dp.Average ?? 0);
  } catch (err) {
    console.error(
      `[fetchRdsCpuMetrics] GetMetricStatistics failed for ${instanceId}:`,
      err,
    );
    return [];
  }
}
