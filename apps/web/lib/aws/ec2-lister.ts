/**
 * Lists EC2 instances in a single region using assumed-role credentials.
 * Handles DescribeInstances pagination (NextToken).
 * Attaches on-demand pricing from the TypeScript catalog.
 *
 * ARCHITECTURE LAW: Read-only. ec2:Describe* permissions only.
 */

import { EC2Client, DescribeInstancesCommand } from "@aws-sdk/client-ec2";
import type { AwsCredentials } from "./assume-role";
import { priceForType } from "./pricing";

export interface Ec2InstanceInfo {
  instanceId: string;
  instanceType: string;
  region: string;
  state: string;
  hourlyOnDemandUsd: number;
  tags: Record<string, string>;
}

/**
 * Returns all running + stopped EC2 instances in the given region.
 * Stopped instances are included because the idle/zombie algorithms use
 * their metrics to confirm the resource is genuinely dormant.
 */
export async function listEc2Instances(
  credentials: AwsCredentials,
  region: string,
): Promise<Ec2InstanceInfo[]> {
  const ec2 = new EC2Client({ region, credentials });
  const instances: Ec2InstanceInfo[] = [];
  let nextToken: string | undefined;

  do {
    const res = await ec2.send(
      new DescribeInstancesCommand({
        Filters: [
          { Name: "instance-state-name", Values: ["running", "stopped"] },
        ],
        NextToken: nextToken,
      }),
    );

    for (const reservation of res.Reservations ?? []) {
      for (const inst of reservation.Instances ?? []) {
        if (!inst.InstanceId || !inst.InstanceType) continue;

        const tags: Record<string, string> = {};
        for (const tag of inst.Tags ?? []) {
          if (tag.Key && tag.Value) tags[tag.Key] = tag.Value;
        }

        instances.push({
          instanceId: inst.InstanceId,
          instanceType: inst.InstanceType,
          region,
          state: inst.State?.Name ?? "unknown",
          hourlyOnDemandUsd: priceForType(inst.InstanceType),
          tags,
        });
      }
    }

    nextToken = res.NextToken;
  } while (nextToken);

  return instances;
}
