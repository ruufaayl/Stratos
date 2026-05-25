import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AwsCredentials } from "./assume-role";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-sts", () => ({
  STSClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  AssumeRoleCommand: vi.fn((input: unknown) => input),
}));

import { assumeRole } from "./assume-role";

const TEST_CREDS: AwsCredentials = {
  accessKeyId: "AKIA000",
  secretAccessKey: "secret",
  sessionToken: "token",
};

beforeEach(() => mockSend.mockReset());

describe("assumeRole", () => {
  it("returns credentials on success", async () => {
    mockSend.mockResolvedValueOnce({
      Credentials: {
        AccessKeyId: TEST_CREDS.accessKeyId,
        SecretAccessKey: TEST_CREDS.secretAccessKey,
        SessionToken: TEST_CREDS.sessionToken,
      },
    });

    const result = await assumeRole(
      "arn:aws:iam::123456789012:role/StratosReadOnly",
      "stratos-abc123",
    );

    expect(result).toEqual<AwsCredentials>(TEST_CREDS);
  });

  it("throws if credentials are missing from response", async () => {
    mockSend.mockResolvedValueOnce({ Credentials: null });
    await expect(
      assumeRole("arn:aws:iam::123456789012:role/StratosReadOnly", "stratos-abc123"),
    ).rejects.toThrow("AssumeRole returned no credentials");
  });

  it("propagates STS errors", async () => {
    mockSend.mockRejectedValueOnce(new Error("AccessDenied"));
    await expect(
      assumeRole("arn:aws:iam::123456789012:role/StratosReadOnly", "stratos-abc123"),
    ).rejects.toThrow("AccessDenied");
  });
});
