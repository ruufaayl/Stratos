/**
 * Assumes a cross-account IAM role and returns temporary credentials.
 *
 * Used by the scan pipeline (D3+). For the connection test (D2),
 * validateAwsRole() in connect.ts handles the shorter 900s session.
 *
 * ARCHITECTURE LAW: Read-only forever. This module never requests write scope.
 */

import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

/**
 * Assumes the given IAM role and returns temporary credentials valid for 1 hour.
 *
 * @param roleArn     e.g. "arn:aws:iam::123456789012:role/StratosReadOnly"
 * @param externalId  per-org HMAC from externalIdForOrg() — confused-deputy protection
 * @param sessionName defaults to "StratosScan"
 */
export async function assumeRole(
  roleArn: string,
  externalId: string,
  sessionName = "StratosScan",
): Promise<AwsCredentials> {
  const sts = new STSClient({ region: "us-east-1" });

  const result = await sts.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: sessionName,
      ExternalId: externalId,
      DurationSeconds: 3600,
    }),
  );

  const creds = result.Credentials;
  if (
    !creds?.AccessKeyId ||
    !creds.SecretAccessKey ||
    !creds.SessionToken
  ) {
    throw new Error("AssumeRole returned no credentials");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
  };
}
