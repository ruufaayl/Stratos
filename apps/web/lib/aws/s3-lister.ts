/**
 * Lists S3 buckets across the account (D11-A — zombie bucket detection).
 *
 * S3 is a global service — ListBuckets returns every bucket on the account
 * regardless of region. Each bucket has a "location" (region) which we fetch
 * separately via GetBucketLocation. An empty/null response means us-east-1
 * (legacy AWS behaviour, documented).
 *
 * D12-A: We also fetch CloudWatch BucketSizeBytes per bucket so the engine
 * can score size + age as a zombie heuristic. The engine owns all dollar
 * arithmetic — we only collect raw bytes here (architecture law).
 *
 * ARCHITECTURE LAW: Read-only. s3:ListAllMyBuckets + s3:GetBucketLocation
 *                   + cloudwatch:GetMetricStatistics only.
 */

import {
  S3Client,
  ListBucketsCommand,
  GetBucketLocationCommand,
  type ListBucketsCommandOutput,
} from "@aws-sdk/client-s3";
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from "@aws-sdk/client-cloudwatch";
import type { AwsCredentials } from "./assume-role";

export interface S3BucketRecord {
  bucketName: string;
  region: string;
  creationDate: string; // ISO string
  sizeBytes: number;
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
 * Fetch BucketSizeBytes (StandardStorage) for a bucket via CloudWatch.
 *
 * S3 publishes BucketSizeBytes once per day to AWS/S3 in the bucket's region.
 * We query the last 3 days at daily granularity and pick the most recent
 * Average datapoint. If CloudWatch returns nothing (brand-new bucket, missing
 * permissions, region mismatch, etc.) we return 0 — non-fatal everywhere.
 *
 * Note: the `s3Client` arg is unused here but kept in the signature for
 * symmetry with other per-bucket fetchers; the actual call goes through a
 * CloudWatch client scoped to the bucket's region.
 */
export async function fetchS3BucketSizeBytes(
  _s3Client: S3Client,
  credentials: AwsCredentials,
  bucketName: string,
  region: string,
): Promise<number> {
  // S3 metrics live in CloudWatch in the bucket's home region. Fall back to
  // us-east-1 if for any reason the region is empty.
  const cwRegion = region || "us-east-1";
  const cw = new CloudWatchClient({ region: cwRegion, credentials });

  const endTime = new Date();
  // 3-day lookback — S3 storage metrics are 1-day granularity, so 3 datapoints
  // is plenty to find "the most recent one" without missing brand-new buckets.
  const startTime = new Date(endTime.getTime() - 3 * 24 * 60 * 60 * 1000);

  try {
    const res = await cw.send(
      new GetMetricStatisticsCommand({
        Namespace: "AWS/S3",
        MetricName: "BucketSizeBytes",
        Dimensions: [
          { Name: "BucketName", Value: bucketName },
          { Name: "StorageType", Value: "StandardStorage" },
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 86400, // 1 day
        Statistics: ["Average"],
      }),
    );

    const datapoints = res.Datapoints ?? [];
    if (datapoints.length === 0) return 0;

    // Pick the most recent Average value.
    const sorted = [...datapoints].sort(
      (a, b) => (a.Timestamp?.getTime() ?? 0) - (b.Timestamp?.getTime() ?? 0),
    );
    const latest = sorted[sorted.length - 1];
    return latest?.Average ?? 0;
  } catch (err) {
    console.error(
      `[fetchS3BucketSizeBytes] GetMetricStatistics failed for ${bucketName} (non-fatal):`,
      err,
    );
    return 0;
  }
}

/**
 * Returns all S3 buckets on the account, annotated with region, creation date,
 * and CloudWatch-reported size in bytes.
 *
 * Non-fatal at every level:
 *   - ListBuckets failure → return []
 *   - Per-bucket GetBucketLocation failure → skip that bucket
 *   - Per-bucket CloudWatch failure → sizeBytes = 0 (still include the bucket)
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

    // CloudWatch BucketSizeBytes — non-fatal, defaults to 0 on any failure.
    const sizeBytes = await fetchS3BucketSizeBytes(
      s3,
      credentials,
      bucket.Name,
      region,
    );

    records.push({
      bucketName: bucket.Name,
      region,
      creationDate,
      sizeBytes,
    });
  }

  return records;
}
