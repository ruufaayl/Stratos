import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";
import type { Ec2InstanceInfo } from "./ec2-lister";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  GetMetricStatisticsCommand: vi.fn((input: unknown) => input),
}));

import { fetchInstanceTelemetry } from "./cloudwatch-fetcher";

const FAKE_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

const FAKE_INSTANCE: Ec2InstanceInfo = {
  instanceId: "i-0abc123",
  instanceType: "t3.medium",
  region: "us-east-1",
  state: "running",
  hourlyOnDemandUsd: 0.0416,
  tags: { Name: "web-server" },
};

beforeEach(() => mockSend.mockReset());

describe("fetchInstanceTelemetry", () => {
  it("returns telemetry with sorted cpu array", async () => {
    const t1 = new Date("2026-05-01T00:00:00Z");
    const t2 = new Date("2026-05-01T00:30:00Z");
    const t3 = new Date("2026-05-01T01:00:00Z");

    // Return datapoints out of order — fetcher must sort by Timestamp
    mockSend.mockResolvedValueOnce({
      Datapoints: [
        { Timestamp: t3, Average: 30.0 },
        { Timestamp: t1, Average: 10.0 },
        { Timestamp: t2, Average: 20.0 },
      ],
    });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);

    expect(result).toHaveLength(1);
    expect(result[0]!.instanceId).toBe("i-0abc123");
    expect(result[0]!.cpu).toEqual([10.0, 20.0, 30.0]);
    expect(result[0]!.instanceType).toBe("t3.medium");
    expect(result[0]!.hourlyOnDemandUsd).toBe(0.0416);
  });

  it("returns empty cpu array when no datapoints exist", async () => {
    mockSend.mockResolvedValueOnce({ Datapoints: [] });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);
    expect(result[0]!.cpu).toEqual([]);
  });

  it("uses 0 for datapoints with no Average value", async () => {
    mockSend.mockResolvedValueOnce({
      Datapoints: [{ Timestamp: new Date(), Average: undefined }],
    });

    const result = await fetchInstanceTelemetry(FAKE_CREDS, [FAKE_INSTANCE]);
    expect(result[0]!.cpu).toEqual([0]);
  });

  it("calls GetMetricStatistics once per instance", async () => {
    mockSend.mockResolvedValue({ Datapoints: [] });
    const instances: Ec2InstanceInfo[] = [
      { ...FAKE_INSTANCE, instanceId: "i-1" },
      { ...FAKE_INSTANCE, instanceId: "i-2" },
    ];

    await fetchInstanceTelemetry(FAKE_CREDS, instances);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
