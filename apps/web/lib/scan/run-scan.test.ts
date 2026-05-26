import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AWS helpers
vi.mock("@/lib/aws/assume-role", () => ({ assumeRole: vi.fn() }));
vi.mock("@/lib/aws/ec2-lister", () => ({ listEc2Instances: vi.fn() }));
vi.mock("@/lib/aws/ebs-lister", () => ({ listEbsVolumes: vi.fn() }));
vi.mock("@/lib/aws/rds-lister", () => ({ listRdsInstances: vi.fn() }));
vi.mock("@/lib/aws/s3-lister", () => ({ listS3Buckets: vi.fn() }));
vi.mock("@/lib/aws/regions", () => ({
  getEnabledRegions: vi.fn(),
  DEFAULT_SCAN_REGIONS: ["us-east-1"],
}));
vi.mock("@/lib/aws/cloudwatch-fetcher", () => ({
  fetchInstanceTelemetry: vi.fn(),
  fetchRdsCpuMetrics: vi.fn(),
}));
vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: vi.fn(),
}));
// Mock engine client
vi.mock("@/lib/engine/client", () => ({ analyze: vi.fn() }));
// Mock drizzle-orm
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a, b) => ({ _eq: [a, b] })) }));

// vi.hoisted ensures these are available when the vi.mock factory runs
const { insertMock, updateMock } = vi.hoisted(() => {
  const insertMock = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  const updateMock = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  return { insertMock, updateMock };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue(insertMock),
    update: vi.fn().mockReturnValue(updateMock),
  },
  schema: {
    runs: { id: "runs.id" },
    opportunities: {},
    accounts: { id: "accounts.id" },
  },
}));

import { assumeRole } from "@/lib/aws/assume-role";
import { listEc2Instances } from "@/lib/aws/ec2-lister";
import { listEbsVolumes } from "@/lib/aws/ebs-lister";
import { listRdsInstances } from "@/lib/aws/rds-lister";
import { listS3Buckets } from "@/lib/aws/s3-lister";
import { getEnabledRegions } from "@/lib/aws/regions";
import {
  fetchInstanceTelemetry,
  fetchRdsCpuMetrics,
} from "@/lib/aws/cloudwatch-fetcher";
import { analyze } from "@/lib/engine/client";
import { db } from "@/lib/db";
import { runScan } from "./run-scan";

const MOCK_ACCOUNT = {
  id: "acc-uuid-1",
  orgId: "org_abc",
  roleArn: "arn:aws:iam::123456789012:role/StratosReadOnly",
  externalId: "stratos-abc123",
  region: "us-east-1",
};

const MOCK_CREDS = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

const MOCK_INSTANCES_USE1 = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    state: "running",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
  },
];

const MOCK_INSTANCES_USW2 = [
  {
    instanceId: "i-0def",
    instanceType: "m5.large",
    region: "us-west-2",
    state: "running",
    hourlyOnDemandUsd: 0.096,
    tags: {},
  },
];

const MOCK_TELEMETRY_USE1 = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
    cpu: new Array(672).fill(2.0),
  },
];

const MOCK_TELEMETRY_USW2 = [
  {
    instanceId: "i-0def",
    instanceType: "m5.large",
    region: "us-west-2",
    hourlyOnDemandUsd: 0.096,
    tags: {},
    cpu: new Array(672).fill(3.0),
  },
];

const MOCK_ENGINE_RESULT = {
  resource_count: 1,
  opportunity_count: 1,
  total_monthly_waste: 121.47,
  opportunities: [
    {
      kind: "idle" as const,
      resource_id: "i-0abc",
      resource_type: "t3.xlarge",
      monthly_savings: 121.47,
      risk: 0.1,
      idle_score: 0.95,
      peak_cpu_pct: 2.0,
      peak_net_bps: null,
      monthly_cost: 121.47,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();

  // Reset chain mocks
  insertMock.values.mockReturnThis();
  insertMock.returning.mockResolvedValue([{ id: "run-uuid-1" }]);
  updateMock.set.mockReturnThis();
  updateMock.where.mockReturnThis();

  vi.mocked(db.insert).mockReturnValue(insertMock as never);
  vi.mocked(db.update).mockReturnValue(updateMock as never);

  vi.mocked(assumeRole).mockResolvedValue(MOCK_CREDS);
  // Default: single-region scan keeps the legacy single-region test semantics.
  vi.mocked(getEnabledRegions).mockResolvedValue(["us-east-1"]);

  // Region-aware EC2 lister mock: returns instances for the matching region.
  vi.mocked(listEc2Instances).mockImplementation(async (_creds, region) => {
    if (region === "us-east-1") return MOCK_INSTANCES_USE1;
    if (region === "us-west-2") return MOCK_INSTANCES_USW2;
    return [];
  });
  vi.mocked(listEbsVolumes).mockResolvedValue([]);
  vi.mocked(listRdsInstances).mockResolvedValue([]);
  vi.mocked(listS3Buckets).mockResolvedValue([]);

  // Region-aware telemetry mock.
  vi.mocked(fetchInstanceTelemetry).mockImplementation(async (_creds, instances) => {
    if (instances.length === 0) return [];
    if (instances[0]!.region === "us-east-1") return MOCK_TELEMETRY_USE1;
    if (instances[0]!.region === "us-west-2") return MOCK_TELEMETRY_USW2;
    return [];
  });

  vi.mocked(fetchRdsCpuMetrics).mockResolvedValue([]);
  vi.mocked(analyze).mockResolvedValue(MOCK_ENGINE_RESULT);
});

describe("runScan", () => {
  it("returns succeeded status with finding count + savings cents", async () => {
    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(1);
    expect(result.totalSavingsCents).toBe(12147); // Math.round(121.47 * 100)
    expect(result.runId).toBe("run-uuid-1");
  });

  it("calls assumeRole with the account roleArn + externalId", async () => {
    await runScan(MOCK_ACCOUNT);
    expect(assumeRole).toHaveBeenCalledWith(
      MOCK_ACCOUNT.roleArn,
      MOCK_ACCOUNT.externalId,
      "StratosScan",
    );
  });

  it("calls listEc2Instances with assumed credentials + region", async () => {
    await runScan(MOCK_ACCOUNT);
    expect(listEc2Instances).toHaveBeenCalledWith(MOCK_CREDS, MOCK_ACCOUNT.region);
  });

  it("returns succeeded with 0 findings when account has no instances", async () => {
    vi.mocked(listEc2Instances).mockResolvedValue([]);

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(0);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("returns failed status on engine error", async () => {
    vi.mocked(analyze).mockRejectedValue(new Error("engine unreachable"));

    const result = await runScan(MOCK_ACCOUNT);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("engine unreachable");
  });

  it("forwards EBS volumes to the engine payload (D9-D)", async () => {
    vi.mocked(listEbsVolumes).mockResolvedValue([
      {
        volumeId: "vol-abc",
        state: "available",
        sizeGb: 500,
        volumeType: "gp3",
        region: "us-east-1",
        createTime: "2026-01-01T00:00:00.000Z",
        availabilityZone: "us-east-1a",
      },
    ]);

    await runScan(MOCK_ACCOUNT);

    expect(analyze).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.ebs_volumes).toEqual([
      {
        volume_id: "vol-abc",
        state: "available",
        size_gb: 500,
        volume_type: "gp3",
        region: "us-east-1",
        create_time: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("still scans when only EBS volumes are present (no EC2)", async () => {
    vi.mocked(listEc2Instances).mockResolvedValue([]);
    vi.mocked(listEbsVolumes).mockResolvedValue([
      {
        volumeId: "vol-orphan",
        state: "available",
        sizeGb: 200,
        volumeType: "gp2",
        region: "us-east-1",
        createTime: "2026-01-01T00:00:00.000Z",
        availabilityZone: "us-east-1a",
      },
    ]);
    vi.mocked(analyze).mockResolvedValue({
      resource_count: 1,
      opportunity_count: 1,
      total_monthly_waste: 20,
      opportunities: [
        {
          kind: "zombie" as const,
          resource_id: "vol-orphan",
          resource_type: "ebs:gp2",
          monthly_cost: 20,
          monthly_savings: 20,
          zombie_label: "stopped" as const,
          max_cpu_pct: 0,
          data_days: 8,
          confidence: 1.0,
          risk: 0.0,
        },
      ],
    });

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(1);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it("returns succeeded with 0 findings when neither EC2 nor EBS present", async () => {
    vi.mocked(listEc2Instances).mockResolvedValue([]);
    vi.mocked(listEbsVolumes).mockResolvedValue([]);

    const result = await runScan(MOCK_ACCOUNT);
    expect(result.status).toBe("succeeded");
    expect(analyze).not.toHaveBeenCalled();
  });

  it("forwards RDS instances + CPU telemetry to the engine payload (D10-B)", async () => {
    vi.mocked(listRdsInstances).mockResolvedValue([
      {
        instanceId: "stratos-prod-db",
        instanceClass: "db.r5.2xlarge",
        engine: "postgres",
        multiAz: false,
        storageGb: 500,
        availabilityZone: "us-east-1a",
        region: "us-east-1",
        createTime: "2025-01-01T00:00:00.000Z",
      },
    ]);
    vi.mocked(fetchRdsCpuMetrics).mockResolvedValue(new Array(672).fill(1.5));

    await runScan(MOCK_ACCOUNT);

    expect(fetchRdsCpuMetrics).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.rds_instances).toHaveLength(1);
    expect(payload.rds_instances![0]).toMatchObject({
      instance_id: "stratos-prod-db",
      instance_class: "db.r5.2xlarge",
      engine: "postgres",
      multi_az: false,
      storage_gb: 500,
      region: "us-east-1",
      hourly_cost: 0,
    });
    expect(payload.rds_instances![0]!.cpu_utilization_pct).toHaveLength(672);
  });

  it("drops RDS instances with insufficient CPU history", async () => {
    vi.mocked(listRdsInstances).mockResolvedValue([
      {
        instanceId: "stratos-newdb",
        instanceClass: "db.t3.medium",
        engine: "mysql",
        multiAz: false,
        storageGb: 20,
        availabilityZone: "us-east-1a",
        region: "us-east-1",
        createTime: "2026-05-25T00:00:00.000Z",
      },
    ]);
    vi.mocked(fetchRdsCpuMetrics).mockResolvedValue(new Array(10).fill(0));

    await runScan(MOCK_ACCOUNT);

    expect(analyze).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.rds_instances).toEqual([]);
  });

  // === D11-A: multi-region + S3 ===

  it("aggregates EC2 instances across all enabled regions (D11-A)", async () => {
    vi.mocked(getEnabledRegions).mockResolvedValue(["us-east-1", "us-west-2"]);

    await runScan(MOCK_ACCOUNT);

    expect(listEc2Instances).toHaveBeenCalledWith(MOCK_CREDS, "us-east-1");
    expect(listEc2Instances).toHaveBeenCalledWith(MOCK_CREDS, "us-west-2");
    expect(analyze).toHaveBeenCalledTimes(1);

    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.resources).toHaveLength(2);
    const ids = payload.resources.map((r) => r.resource_id).sort();
    expect(ids).toEqual(["i-0abc", "i-0def"]);
  });

  it("forwards S3 buckets to the engine payload (D11-A)", async () => {
    vi.mocked(listS3Buckets).mockResolvedValue([
      {
        bucketName: "stratos-prod-logs",
        region: "us-east-1",
        creationDate: "2024-06-01T00:00:00.000Z",
        sizeBytes: 0,
      },
      {
        bucketName: "stratos-old-backups",
        region: "eu-west-1",
        creationDate: "2023-01-15T00:00:00.000Z",
        sizeBytes: 0,
      },
    ]);

    await runScan(MOCK_ACCOUNT);

    expect(listS3Buckets).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.s3_buckets).toEqual([
      {
        bucket_name: "stratos-prod-logs",
        region: "us-east-1",
        creation_date: "2024-06-01T00:00:00.000Z",
        size_bytes: 0,
      },
      {
        bucket_name: "stratos-old-backups",
        region: "eu-west-1",
        creation_date: "2023-01-15T00:00:00.000Z",
        size_bytes: 0,
      },
    ]);
  });

  it("scans S3 globally (one call, no region iteration)", async () => {
    vi.mocked(getEnabledRegions).mockResolvedValue([
      "us-east-1",
      "us-west-2",
      "eu-west-1",
    ]);
    vi.mocked(listS3Buckets).mockResolvedValue([
      {
        bucketName: "global-bucket",
        region: "us-east-1",
        creationDate: "2024-01-01T00:00:00.000Z",
        sizeBytes: 0,
      },
    ]);

    await runScan(MOCK_ACCOUNT);

    // S3 is a global service — exactly one ListBuckets call regardless of
    // how many regions we scan.
    expect(listS3Buckets).toHaveBeenCalledTimes(1);
  });

  it("does not abort the whole scan when a single region fails (D11-A)", async () => {
    vi.mocked(getEnabledRegions).mockResolvedValue(["us-east-1", "us-west-2"]);
    // us-west-2 EC2 lister blows up; us-east-1 continues normally.
    vi.mocked(listEc2Instances).mockImplementation(async (_creds, region) => {
      if (region === "us-east-1") return MOCK_INSTANCES_USE1;
      if (region === "us-west-2") {
        throw new Error("AccessDenied for us-west-2");
      }
      return [];
    });

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(analyze).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    // Only us-east-1 contributed an instance.
    expect(payload.resources).toHaveLength(1);
    expect(payload.resources[0]!.resource_id).toBe("i-0abc");
  });

  it("falls back gracefully when listS3Buckets throws (D11-A)", async () => {
    vi.mocked(listS3Buckets).mockRejectedValue(new Error("S3 perms missing"));

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    const payload = vi.mocked(analyze).mock.calls[0]![0];
    expect(payload.s3_buckets).toEqual([]);
  });

  it("includes S3 bucket count in total resourceCount even with no scoreable resources", async () => {
    // No EC2/EBS/RDS, but buckets exist — engine should not be called but the
    // run should still succeed and the resource count should reflect buckets.
    vi.mocked(listEc2Instances).mockResolvedValue([]);
    vi.mocked(listEbsVolumes).mockResolvedValue([]);
    vi.mocked(listRdsInstances).mockResolvedValue([]);
    vi.mocked(listS3Buckets).mockResolvedValue([
      {
        bucketName: "only-bucket",
        region: "us-east-1",
        creationDate: "2024-01-01T00:00:00.000Z",
        sizeBytes: 0,
      },
    ]);

    const result = await runScan(MOCK_ACCOUNT);

    expect(result.status).toBe("succeeded");
    expect(result.totalFindings).toBe(0);
    expect(analyze).not.toHaveBeenCalled();
  });
});
