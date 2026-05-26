/**
 * Lists S3 buckets across the account (D11-A — zombie bucket detection).
 *
 * S3 is a global service — ListBuckets returns every bucket on the account
 * regardless of region. Each bucket has a "location" (region) which we fetch
 * separately via GetBucketLocation. An empty/null response means us-east-1
 * (legacy AWS behaviour, documented).
 *
 * The engine will eventually score buckets by last-modified-object age and
 * storage class to find true zombies. For now we just enumerate so the
 * payload is future-proof.
 *
 * ARCHITECTURE LAW: Read-only. s3:ListAllMyBuckets + s3:GetBucketLocation only.
 */

import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  type ListBucketsCommandOutput,
} from "@aws-sdk/client-s3";
import type { AwsCredentials } from "./assume-role";

export interface S3BucketRecord {
  bucketName: string;
  region: string;
  creationDate: string; // ISO string
}

/**
 * Map of AWS LocationConstraint values to canonical region names.
 * GetBucketLocation returns "" or null for us-east-1, and "EU" historically
 * meant eu-west-1.
 */
function normalizeLocation(loc: string | undefined | null): string {
  if (!loc) return "us-east-1";
  if (loc === "EU") return "eu-west-1";
  return loc;
}

/**
 * Returns all S3 buckets on the account, annotated with region + creation date.
 *
 * Non-fatal at every level:
 *   - ListBuckets failure → return []
 *   - Per-bucket GetBucketLocation failure → skip that bucket
 *
 * A misconfigured S3 permission must never sink a multi-region scan.
 */
export async function listS3Buckets(
  credentials: AwsCredentials,
): Promise<S3BucketRecord[]> {
  // S3 client needs *some* region — us-east-1 is universally available and
  // is the correct partition for the global ListBuckets endpoint.
  const s3 = new S3Client({ region: "us-east-1", credentials });

  let listed: ListBucketsCommandOutput;
  try {
    listed = await s3.send(new ListBucketsCommand({}));
  } catch (err) {
    console.error("[listS3Buckets] ListBuckets failed (non-fatal):", err);
    return [];
  }

  const buckets = listed.Buckets ?? [];
  const records: S3BucketRecord[] = [];

  for (const bucket of buckets) {
    if (!bucket.Name) continue;

    let region = "us-east-1";
    try {
      const loc = await s3.send(
        new GetBucketLocationCommand({ Bucket: bucket.Name }),
      );
      region = normalizeLocation(loc.LocationConstraint as string | undefined);
    } catch (err) {
      console.error(
        `[listS3Buckets] GetBucketLocation failed for ${bucket.Name} (skipping):`,
        err,
      );
      continue;
    }

    const creationDate =
      bucket.CreationDate instanceof Date
        ? bucket.CreationDate.toISOString()
        : typeof bucket.CreationDate === "string"
          ? bucket.CreationDate
          : new Date().toISOString();

    records.push({
      bucketName: bucket.Name,
      region,
      creationDate,
    });
  }

  return records;
}
