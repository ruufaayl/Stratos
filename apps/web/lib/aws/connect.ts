/**
 * AWS cross-account IAM role validation.
 *
 * Stratos operates READ-ONLY. We never request write permissions.
 * The minimal IAM policy we require:
 *   - ec2:Describe* (instance metadata)
 *   - cloudwatch:GetMetricStatistics
 *   - cloudwatch:ListMetrics
 *   - ce:GetCostAndUsage (Cost Explorer)
 *   - sts:AssumeRole (for the cross-account handshake)
 *
 * ARCHITECTURE LAW: This module validates the role. It never issues writes.
 */

import {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import {
  EC2Client,
  DescribeInstancesCommand,
} from "@aws-sdk/client-ec2";

export interface RoleValidationResult {
  ok: boolean;
  accountId?: string;
  callerArn?: string;
  error?: string;
}

/**
 * Validate that Stratos can assume the given cross-account IAM role and
 * perform a basic read against EC2. This is the connection-test we run when
 * a user submits their IAM role ARN in the onboarding wizard.
 *
 * @param roleArn   e.g. "arn:aws:iam::123456789012:role/StratosReadOnly"
 * @param externalId  the per-user random string shown in the wizard (prevents
 *                    confused-deputy attacks — https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html)
 */
export async function validateAwsRole(
  roleArn: string,
  externalId: string,
): Promise<RoleValidationResult> {
  const sts = new STSClient({ region: "us-east-1" });

  // 1. Assume the role
  // AWS SDK v3 uses lowercase property names for AwsCredentialIdentity
  let credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };

  try {
    const assume = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "StratosConnectionTest",
        ExternalId: externalId,
        DurationSeconds: 900, // 15 min — we just need a quick test
      }),
    );

    if (
      !assume.Credentials?.AccessKeyId ||
      !assume.Credentials?.SecretAccessKey ||
      !assume.Credentials?.SessionToken
    ) {
      return { ok: false, error: "AssumeRole succeeded but returned no credentials." };
    }

    credentials = {
      accessKeyId: assume.Credentials.AccessKeyId,
      secretAccessKey: assume.Credentials.SecretAccessKey,
      sessionToken: assume.Credentials.SessionToken,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Cannot assume role: ${msg}. Check the ARN, ExternalId, and that the trust policy references the Stratos IAM principal.`,
    };
  }

  // 2. Verify identity
  const assumedSts = new STSClient({
    region: "us-east-1",
    credentials,
  });

  let accountId: string | undefined;
  let callerArn: string | undefined;

  try {
    const identity = await assumedSts.send(new GetCallerIdentityCommand({}));
    accountId = identity.Account;
    callerArn = identity.Arn;
  } catch (err) {
    return { ok: false, error: `GetCallerIdentity failed: ${err instanceof Error ? err.message : String(err)}` };
  }

  // 3. Smoke-test read permissions (DescribeInstances on us-east-1)
  try {
    const ec2 = new EC2Client({ region: "us-east-1", credentials });
    await ec2.send(
      new DescribeInstancesCommand({ MaxResults: 5 }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish permission errors from "account has no instances"
    if (msg.includes("UnauthorizedOperation") || msg.includes("AccessDenied")) {
      return {
        ok: false,
        error: `Role assumed successfully but lacks ec2:DescribeInstances permission. Add it to the IAM policy.`,
      };
    }
    // "no instances" or throttle — still a success from auth standpoint
    console.warn("[aws/connect] DescribeInstances soft-error:", msg);
  }

  return { ok: true, accountId, callerArn };
}

/**
 * Generate a cryptographically random external ID for the trust policy.
 * One per Stratos account row — stored in accounts.config.externalId.
 */
export function generateExternalId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
