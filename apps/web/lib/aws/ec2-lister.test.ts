import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-ec2", () => ({
  EC2Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  DescribeInstancesCommand: vi.fn((input: unknown) => input),
}));

import { listEc2Instances } from "./ec2-lister";

const FAKE_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

beforeEach(() => mockSend.mockReset());

describe("listEc2Instances", () => {
  it("returns instances with pricing from catalog", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: "i-0abc123",
              InstanceType: "t3.medium",
              State: { Name: "running" },
              Tags: [{ Key: "Name", Value: "web-server" }],
            },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      instanceId: "i-0abc123",
      instanceType: "t3.medium",
      region: "us-east-1",
      state: "running",
      hourlyOnDemandUsd: 0.0416,
      tags: { Name: "web-server" },
    });
  });

  it("uses DEFAULT_HOURLY_USD for unknown instance types", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            {
              InstanceId: "i-0xyz999",
              InstanceType: "x1e.32xlarge",
              State: { Name: "stopped" },
              Tags: [],
            },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "eu-west-1");
    expect(result[0]!.hourlyOnDemandUsd).toBe(0.096);
  });

  it("follows NextToken pagination", async () => {
    mockSend
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              { InstanceId: "i-1", InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] },
            ],
          },
        ],
        NextToken: "page2",
      })
      .mockResolvedValueOnce({
        Reservations: [
          {
            Instances: [
              { InstanceId: "i-2", InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] },
            ],
          },
        ],
        NextToken: undefined,
      });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.instanceId)).toEqual(["i-1", "i-2"]);
  });

  it("skips instances missing InstanceId or InstanceType", async () => {
    mockSend.mockResolvedValueOnce({
      Reservations: [
        {
          Instances: [
            { InstanceId: undefined, InstanceType: "t3.micro", State: { Name: "running" }, Tags: [] },
            { InstanceId: "i-valid", InstanceType: undefined, State: { Name: "running" }, Tags: [] },
          ],
        },
      ],
      NextToken: undefined,
    });

    const result = await listEc2Instances(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(0);
  });
});
