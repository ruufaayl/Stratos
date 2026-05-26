import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-ec2", () => ({
  EC2Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  DescribeVolumesCommand: vi.fn((input: unknown) => input),
}));

import { listEbsVolumes } from "./ebs-lister";

const FAKE_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

beforeEach(() => mockSend.mockReset());

describe("listEbsVolumes", () => {
  it("returns only unattached volumes (filters out in-use)", async () => {
    mockSend.mockResolvedValueOnce({
      Volumes: [
        {
          VolumeId: "vol-zombie",
          State: "available",
          Size: 100,
          VolumeType: "gp3",
          AvailabilityZone: "us-east-1a",
          CreateTime: new Date("2026-01-01T00:00:00Z"),
        },
        {
          VolumeId: "vol-attached",
          State: "in-use",
          Size: 50,
          VolumeType: "gp3",
          AvailabilityZone: "us-east-1a",
          CreateTime: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      NextToken: undefined,
    });

    const result = await listEbsVolumes(FAKE_CREDS, "us-east-1");

    expect(result).toHaveLength(1);
    expect(result[0]!.volumeId).toBe("vol-zombie");
    expect(result[0]!.state).toBe("available");
    expect(result[0]!.region).toBe("us-east-1");
    expect(result[0]!.availabilityZone).toBe("us-east-1a");
  });

  it("follows NextToken pagination", async () => {
    mockSend
      .mockResolvedValueOnce({
        Volumes: [
          {
            VolumeId: "vol-1",
            State: "available",
            Size: 10,
            VolumeType: "gp3",
            AvailabilityZone: "us-east-1a",
            CreateTime: new Date("2026-01-01T00:00:00Z"),
          },
        ],
        NextToken: "page2",
      })
      .mockResolvedValueOnce({
        Volumes: [
          {
            VolumeId: "vol-2",
            State: "error",
            Size: 20,
            VolumeType: "gp2",
            AvailabilityZone: "us-east-1b",
            CreateTime: new Date("2026-01-01T00:00:00Z"),
          },
        ],
        NextToken: undefined,
      });

    const result = await listEbsVolumes(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.volumeId)).toEqual(["vol-1", "vol-2"]);
  });

  it("returns [] on DescribeVolumes error (non-fatal)", async () => {
    mockSend.mockRejectedValueOnce(new Error("AccessDenied"));

    const result = await listEbsVolumes(FAKE_CREDS, "us-east-1");
    expect(result).toEqual([]);
  });

  it("skips volumes missing VolumeId", async () => {
    mockSend.mockResolvedValueOnce({
      Volumes: [
        {
          VolumeId: undefined,
          State: "available",
          Size: 50,
          VolumeType: "gp3",
        },
        {
          VolumeId: "vol-ok",
          State: "available",
          Size: 50,
          VolumeType: "gp3",
          AvailabilityZone: "us-east-1a",
          CreateTime: new Date("2026-01-01T00:00:00Z"),
        },
      ],
      NextToken: undefined,
    });

    const result = await listEbsVolumes(FAKE_CREDS, "us-east-1");
    expect(result).toHaveLength(1);
    expect(result[0]!.volumeId).toBe("vol-ok");
  });
});
