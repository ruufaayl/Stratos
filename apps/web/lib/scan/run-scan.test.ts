import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AWS helpers
vi.mock("@/lib/aws/assume-role", () => ({ assumeRole: vi.fn() }));
vi.mock("@/lib/aws/ec2-lister", () => ({ listEc2Instances: vi.fn() }));
vi.mock("@/lib/aws/ebs-lister", () => ({ listEbsVolumes: vi.fn() }));
vi.mock("@/lib/aws/cloudwatch-fetcher", () => ({ fetchInstanceTelemetry: vi.fn() }));
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
import { fetchInstanceTelemetry } from "@/lib/aws/cloudwatch-fetcher";
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

const MOCK_INSTANCES = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    state: "running",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
  },
];

const MOCK_TELEMETRY = [
  {
    instanceId: "i-0abc",
    instanceType: "t3.xlarge",
    region: "us-east-1",
    hourlyOnDemandUsd: 0.1664,
    tags: {},
    cpu: new Array(672).fill(2.0), // 672 points = well above MIN_DATAPOINTS threshold
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
  vi.mocked(listEc2Instances).mockResolvedValue(MOCK_INSTANCES);
  vi.mocked(listEbsVolumes).mockResolvedValue([]);
  vi.mocked(fetchInstanceTelemetry).mockResolvedValue(MOCK_TELEMETRY);
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
});
