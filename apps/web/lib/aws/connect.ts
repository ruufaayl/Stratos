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
import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2";

export interface RoleValidationResult {
  ok: boolean;
  accountId?: string;
  callerArn?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Error-mapping helpers
// ---------------------------------------------------------------------------

function matchCode(err: unknown, ...substrings: string[]): boolean {
  if (!(err instanceof Error)) return false;
  const haystack = `${err.name} ${err.message}`.toLowerCase();
  return substrings.some((s) => haystack.includes(s.toLowerCase()));
}

function assumeRoleError(err: unknown): string {
  if (matchCode(err, "AccessDenied", "AccessDeniedException")) {
    return "Stratos cannot assume this role. Check the trust policy includes our principal and external-id.";
  }
  if (matchCode(err, "InvalidClientTokenId")) {
    return "Stratos AWS credentials look invalid. Contact support.";
  }
  if (matchCode(err, "MalformedPolicyDocument")) {
    return "The role's trust policy is malformed. See the manual setup tab for the exact policy.";
  }
  if (matchCode(err, "NoSuchEntity")) {
    return "This role does not exist. Double-check the ARN.";
  }
  if (matchCode(err, "ExpiredToken")) {
    return "Temporary credentials expired. Retry.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return `AWS error: ${msg}`;
}

function describeRegionsError(err: unknown): string {
  if (matchCode(err, "AccessDenied", "AccessDeniedException")) {
    return "Role assumed, but it cannot list regions. Add ec2:Describe* to its inline policy.";
  }
  if (matchCode(err, "ExpiredToken")) {
    return "Temporary credentials expired. Retry.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return `AWS error: ${msg}`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Validate that Stratos can assume the given cross-account IAM role and
 * perform a basic read against EC2. This is the connection-test we run when
 * a user submits their IAM role ARN in the onboarding wizard.
 *
 * Steps:
 *   1. STS AssumeRole — proves the trust policy is correct.
 *   2. STS GetCallerIdentity — extracts accountId + callerArn.
 *   3. EC2 DescribeRegions — proves broad ec2:Describe* read access.
 *
 * @param roleArn    e.g. "arn:aws:iam::123456789012:role/StratosReadOnly"
 * @param externalId per-org deterministic string (from externalIdForOrg) —
 *                   prevents confused-deputy attacks.
 *                   https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html
 */
export async function validateAwsRole(
  roleArn: string,
  externalId: string,
): Promise<RoleValidationResult> {
  const sts = new STSClient({ region: "us-east-1" });

  // ---- Step 1: Assume the role -------------------------------------------
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
        DurationSeconds: 900,
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
    return { ok: false, error: assumeRoleError(err) };
  }

  // ---- Step 2: Verify identity -------------------------------------------
  const assumedSts = new STSClient({ region: "us-east-1", credentials });

  let accountId: string | undefined;
  let callerArn: string | undefined;

  try {
    const identity = await assumedSts.send(new GetCallerIdentityCommand({}));
    accountId = identity.Account;
    callerArn = identity.Arn;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AWS error: ${msg}` };
  }

  // ---- Step 3: Smoke-test broad EC2 read (DescribeRegions) ---------------
  try {
    const ec2 = new EC2Client({ region: "us-east-1", credentials });
    await ec2.send(new DescribeRegionsCommand({}));
  } catch (err) {
    return { ok: false, error: describeRegionsError(err) };
  }

  return { ok: true, accountId, callerArn };
}

/**
 * Generate a cryptographically random external ID for the trust policy.
 *
 * @deprecated Use externalIdForOrg() from lib/aws/external-id.ts instead.
 * Kept for backward compatibility — will be removed once Task 11 migrates
 * the onboarding route to the deterministic HMAC-based approach.
 */
export function generateExternalId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
