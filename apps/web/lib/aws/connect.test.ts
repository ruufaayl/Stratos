import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared before any imports that use them
// ---------------------------------------------------------------------------

const stsSendMock = vi.fn();
const ec2SendMock = vi.fn();

vi.mock("@aws-sdk/client-sts", () => ({
  STSClient: vi.fn().mockImplementation(() => ({ send: stsSendMock })),
  AssumeRoleCommand: vi.fn(),
  GetCallerIdentityCommand: vi.fn(),
}));

vi.mock("@aws-sdk/client-ec2", () => ({
  EC2Client: vi.fn().mockImplementation(() => ({ send: ec2SendMock })),
  DescribeRegionsCommand: vi.fn(),
}));

// Import after mocks are set up
import { validateAwsRole } from "./connect";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_CREDS = {
  AccessKeyId: "AKIAIOSFODNN7EXAMPLE",
  SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  SessionToken: "AQoDYXdzEJr...",
};

const MOCK_ACCOUNT_ID = "123456789012";
const MOCK_CALLER_ARN = "arn:aws:sts::123456789012:assumed-role/StratosReadOnly/StratosConnectionTest";

function makeAssumeRoleSuccess() {
  return { Credentials: MOCK_CREDS };
}

function makeCallerIdentitySuccess() {
  return { Account: MOCK_ACCOUNT_ID, Arn: MOCK_CALLER_ARN };
}

function makeDescribeRegionsSuccess() {
  return { Regions: [{ RegionName: "us-east-1" }, { RegionName: "eu-west-1" }] };
}

function makeAwsError(name: string, message: string): Error {
  const err = new Error(message);
  err.name = name;
  return err;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validateAwsRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — returns ok:true with accountId and callerArn", async () => {
    // STS send: first call = AssumeRole, second call = GetCallerIdentity
    stsSendMock
      .mockResolvedValueOnce(makeAssumeRoleSuccess())
      .mockResolvedValueOnce(makeCallerIdentitySuccess());
    ec2SendMock.mockResolvedValueOnce(makeDescribeRegionsSuccess());

    const result = await validateAwsRole(
      "arn:aws:iam::123456789012:role/StratosReadOnly",
      "stratos-abc123",
    );

    expect(result).toEqual({
      ok: true,
      accountId: MOCK_ACCOUNT_ID,
      callerArn: MOCK_CALLER_ARN,
    });
  });

  it("AccessDenied on AssumeRole → friendly trust-policy message", async () => {
    stsSendMock.mockRejectedValueOnce(
      makeAwsError("AccessDeniedException", "User is not authorized to assume role"),
    );

    const result = await validateAwsRole(
      "arn:aws:iam::123456789012:role/StratosReadOnly",
      "stratos-abc123",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Stratos cannot assume this role");
    expect(result.error).toContain("trust policy");
  });

  it("NoSuchEntity on AssumeRole → friendly 'role does not exist' message", async () => {
    stsSendMock.mockRejectedValueOnce(
      makeAwsError("NoSuchEntityException", "Role arn:aws:iam::123456789012:role/Missing does not exist"),
    );

    const result = await validateAwsRole(
      "arn:aws:iam::123456789012:role/Missing",
      "stratos-abc123",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("This role does not exist");
  });

  it("AccessDenied on DescribeRegions → friendly ec2:Describe* message", async () => {
    // AssumeRole and GetCallerIdentity succeed; DescribeRegions fails
    stsSendMock
      .mockResolvedValueOnce(makeAssumeRoleSuccess())
      .mockResolvedValueOnce(makeCallerIdentitySuccess());
    ec2SendMock.mockRejectedValueOnce(
      makeAwsError("AccessDeniedException", "not authorized to perform: ec2:DescribeRegions"),
    );

    const result = await validateAwsRole(
      "arn:aws:iam::123456789012:role/StratosReadOnly",
      "stratos-abc123",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Role assumed, but it cannot list regions");
    expect(result.error).toContain("ec2:Describe*");
  });
});
