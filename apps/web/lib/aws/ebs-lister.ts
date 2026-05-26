/**
 * Lists EBS volumes in a single region using assumed-role credentials.
 *
 * "Zombie" candidates are volumes whose State != "in-use" — i.e. nothing is
 * attached to them but the account is still billed every month. These flow
 * into the engine zombie pipeline as synthetic zero-CPU telemetry entries.
 *
 * ARCHITECTURE LAW: Read-only. ec2:DescribeVolumes permission only.
 */

import { EC2Client, DescribeVolumesCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentials } from "./assume-role";

export interface EbsVolumeRecord {
  volumeId: string;
  state: string; // "available" | "error" | "creating" | "deleting" | ...
  sizeGb: number;
  volumeType: string; // "gp2" | "gp3" | "io1" | "io2" | "st1" | "sc1" | "standard"
  region: string;
  createTime: string; // ISO string
  availabilityZone: string;
}

/**
 * Returns all unattached EBS volumes (State != "in-use") in the given region.
 * Pagination via NextToken. On error: logs and returns []. The scan must
 * never abort just because we couldn't list a single resource class.
 */
export async function listEbsVolumes(
  credentials: AwsCredentials,
  region: string,
): Promise<EbsVolumeRecord[]> {
  const ec2 = new EC2Client({ region, credentials });
  const volumes: EbsVolumeRecord[] = [];
  let nextToken: string | undefined;

  try {
    do {
      const res = await ec2.send(
        new DescribeVolumesCommand({
          NextToken: nextToken,
        }),
      );

      for (const vol of res.Volumes ?? []) {
        if (!vol.VolumeId) continue;
        const state = vol.State ?? "unknown";
        // Zombie candidates only — attached volumes are charged anyway and are
        // not unilaterally wasteful (the engine handles attached resources
        // through the EC2 idle/rightsize paths).
        if (state === "in-use") continue;

        const az = vol.AvailabilityZone ?? `${region}a`;

        volumes.push({
          volumeId: vol.VolumeId,
          state,
          sizeGb: vol.Size ?? 0,
          volumeType: vol.VolumeType ?? "gp2",
          region,
          createTime:
            vol.CreateTime instanceof Date
              ? vol.CreateTime.toISOString()
              : typeof vol.CreateTime === "string"
                ? vol.CreateTime
                : new Date().toISOString(),
          availabilityZone: az,
        });
      }

      nextToken = res.NextToken;
    } while (nextToken);
  } catch (err) {
    console.error("[listEbsVolumes] DescribeVolumes failed:", err);
    return [];
  }

  return volumes;
}
