/**
 * Lists RDS DB instances in a single region using assumed-role credentials.
 *
 * D10-B: idle RDS instances are often the single biggest waste line item on
 * an AWS account — a fully-idle db.r5.4xlarge runs $1,800+/mo. We list every
 * "available" (running, billable) instance and pass them to the engine which
 * applies the standard idle heuristic to CPU telemetry.
 *
 * ARCHITECTURE LAW: Read-only. rds:DescribeDBInstances permission only.
 */

import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import type { AwsCredentials } from "./assume-role";

export interface RdsInstanceRecord {
  instanceId: string;          // DBInstanceIdentifier
  instanceClass: string;       // e.g. "db.r5.2xlarge"
  engine: string;              // "mysql" | "postgres" | "aurora-mysql" | ...
  multiAz: boolean;
  storageGb: number;           // AllocatedStorage
  availabilityZone: string;
  region: string;              // derived from AZ
  createTime: string;          // ISO string
}

/**
 * Returns all "available" RDS DB instances in the given region.
 * Pagination via Marker. On error: logs and returns [] (non-fatal).
 */
export async function listRdsInstances(
  credentials: AwsCredentials,
  region: string,
): Promise<RdsInstanceRecord[]> {
  const rds = new RDSClient({ region, credentials });
  const instances: RdsInstanceRecord[] = [];
  let marker: string | undefined;

  try {
    do {
      const res = await rds.send(
        new DescribeDBInstancesCommand({
          Marker: marker,
        }),
      );

      for (const db of res.DBInstances ?? []) {
        if (!db.DBInstanceIdentifier || !db.DBInstanceClass) continue;
        // Only billable, running instances. Stopped/creating/deleting states
        // bill differently or not at all — let them age into "available" first.
        if (db.DBInstanceStatus !== "available") continue;

        const az = db.AvailabilityZone ?? `${region}a`;

        instances.push({
          instanceId: db.DBInstanceIdentifier,
          instanceClass: db.DBInstanceClass,
          engine: db.Engine ?? "unknown",
          multiAz: Boolean(db.MultiAZ),
          storageGb: db.AllocatedStorage ?? 0,
          availabilityZone: az,
          region,
          createTime:
            db.InstanceCreateTime instanceof Date
              ? db.InstanceCreateTime.toISOString()
              : typeof db.InstanceCreateTime === "string"
                ? db.InstanceCreateTime
                : new Date().toISOString(),
        });
      }

      marker = res.Marker;
    } while (marker);
  } catch (err) {
    console.error("[listRdsInstances] DescribeDBInstances failed:", err);
    return [];
  }

  return instances;
}
