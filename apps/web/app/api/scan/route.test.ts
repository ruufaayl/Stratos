import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
}));

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: limitMock,
  },
  schema: {
    accounts: { id: "accounts.id", orgId: "accounts.orgId" },
  },
}));

vi.mock("@/lib/scan/run-scan", () => ({ runScan: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { runScan } from "@/lib/scan/run-scan";
import { POST } from "./route";

const MOCK_ACCOUNT = {
  id: "acc-1",
  orgId: "org_1",
  roleArn: "arn:aws:iam::123456789012:role/R",
  externalId: "stratos-abc",
  region: "us-east-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({
    userId: "user_1",
    orgId: "org_1",
  } as never);
  limitMock.mockResolvedValue([MOCK_ACCOUNT]);
  vi.mocked(runScan).mockResolvedValue({
    runId: "run-1",
    status: "succeeded",
    totalFindings: 3,
    totalSavingsCents: 50000,
  });
});

function makeReq(body: unknown) {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/scan", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await POST(makeReq({ accountId: "acc00000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when orgId missing", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: null } as never);
    const res = await POST(makeReq({ accountId: "acc00000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid accountId (not a UUID)", async () => {
    const res = await POST(makeReq({ accountId: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when account not found in org", async () => {
    limitMock.mockResolvedValue([]);
    const res = await POST(makeReq({ accountId: "acc00000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(404);
  });

  it("returns scan result on success", async () => {
    const res = await POST(makeReq({ accountId: "acc00000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runId: string; totalFindings: number; totalSavingsCents: number };
    expect(body.runId).toBe("run-1");
    expect(body.totalFindings).toBe(3);
    expect(body.totalSavingsCents).toBe(50000);
  });

  it("returns 502 when scan fails", async () => {
    vi.mocked(runScan).mockResolvedValue({
      runId: "run-1",
      status: "failed",
      totalFindings: 0,
      totalSavingsCents: 0,
      error: "engine unreachable",
    });
    const res = await POST(makeReq({ accountId: "acc00000-0000-0000-0000-000000000001" }));
    expect(res.status).toBe(502);
  });
});
