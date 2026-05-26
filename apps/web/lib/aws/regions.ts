/**
 * AWS region helpers for multi-region scanning (D11-A).
 *
 * The scan pipeline iterates over all enabled regions for the account. We
 * prefer to ask EC2 DescribeRegions for the live list (handles opt-in
 * regions correctly), and fall back to a hand-maintained DEFAULT_SCAN_REGIONS
 * list if that call fails — better to scan a subset than to scan nothing.
 *
 * ARCHITECTURE LAW: Read-only. ec2:DescribeRegions only.
 */

import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentials } from "./assume-role";

/**
 * Default region list — ordered roughly by usage volume across the AWS
 * customer base. Used as a fallback when DescribeRegions fails (e.g. the
 * cross-account role lacks ec2:DescribeRegions in the preferred region).
 */
export const DEFAULT_SCAN_REGIONS = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
] as const;

export type AwsRegion = (typeof DEFAULT_SCAN_REGIONS)[number];

/**
 * Returns the list of regions enabled in the AWS account.
 *
 * Calls EC2 DescribeRegions from `preferredRegion` (defaults to us-east-1,
 * which is enabled for every AWS account). AllRegions=false so we only get
 * regions actually opted-in for this account.
 *
 * Best-effort: on any error (permission, throttle, network) we return a copy
 * of DEFAULT_SCAN_REGIONS. The scan must never fail because we couldn't
 * enumerate regions — we'd rather scan the top 10 than scan zero.
 */
export async function getEnabledRegions(
  credentials: AwsCredentials,
  preferredRegion = "us-east-1",
): Promise<string[]> {
  try {
    const ec2 = new EC2Client({ region: preferredRegion, credentials });
    const res = await ec2.send(
      new DescribeRegionsCommand({ AllRegions: false }),
    );
    const regions = (res.Regions ?? [])
      .map((r) => r.RegionName)
      .filter((name): name is string => Boolean(name));

    if (regions.length === 0) {
      return [...DEFAULT_SCAN_REGIONS];
    }
    return regions;
  } catch (err) {
    console.error("[getEnabledRegions] DescribeRegions failed (non-fatal):", err);
    return [...DEFAULT_SCAN_REGIONS];
  }
}
