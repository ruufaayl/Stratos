import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
  gte: vi.fn((a, b) => ({ _gte: [a, b] })),
  lte: vi.fn((a, b) => ({ _lte: [a, b] })),
  desc: vi.fn((a) => ({ _desc: a })),
  count: vi.fn(() => ({ _count: true })),
}));

vi.mock("@/lib/billing/gate", () => ({
  checkOrgTier: vi.fn().mockResolvedValue("pro"),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 20, remaining: 19, reset: Date.now() + 3600000 }),
  rateLimitExceededResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "rate_limit_exceeded" }), { status: 429 })),
}));

const ACCOUNT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const RUN_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

// All mocks referenced in vi.mock factories must live in vi.hoisted().
const {
  limitForAccountsMock,
  limitForRunsMock,
  orderByMock,
  whereMock,
  resetDbState,
} = vi.hoisted(() => {
  const limitForAccountsMock = vi.fn().mockResolvedValue([
    {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      orgId: "org_1",
      roleArn: "arn:aws:iam::123456789012:role/StratosRole",
      externalId: "ext-123",
      region: "us-east-1",
    },
  ]);
  const limitForRunsMock = vi.fn().mockResolvedValue([]);
  const orderByMock = vi.fn().mockReturnValue({ limit: limitForRunsMock });

  // Track call count to return different chain shapes for accounts vs runs.
  let count = 0;
  const whereMock = vi.fn().mockImplementation(() => {
    count += 1;
    if (count === 1) {
      // accounts query: .where(...).limit(1)
      return { limit: limitForAccountsMock };
    }
    // runs query: .where(...).orderBy(...).limit(1)
    return { orderBy: orderByMock };
  });

  const resetDbState = () => {
    count = 0;
  };

  return { limitForAccountsMock, limitForRunsMock, orderByMock, whereMock, resetDbState };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: whereMock,
  },
  schema: {
    accounts: {
      id: "acc.id",
      orgId: "acc.org_id",
      roleArn: "acc.role_arn",
      externalId: "acc.external_id",
    },
    runs: {
      id: "runs.id",
      accountId: "runs.account_id",
      status: "runs.status",
      startedAt: "runs.started_at",
    },
  },
}));

vi.mock("@/lib/scan/run-scan", () => ({
  runScan: vi.fn().mockResolvedValue({
    status: "succeeded",
    runId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    totalFindings: 3,
    totalSavingsCents: 50000,
  }),
}));

import { auth } from "@clerk/nextjs/server";
import { POST } from "./route";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetDbState();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);

  // Restore defaults after vi.clearAllMocks() wipes them
  limitForAccountsMock.mockResolvedValue([
    {
      id: ACCOUNT_ID,
      orgId: "org_1",
      roleArn: "arn:aws:iam::123456789012:role/StratosRole",
      externalId: "ext-123",
      region: "us-east-1",
    },
  ]);
  limitForRunsMock.mockResolvedValue([]);
  orderByMock.mockReturnValue({ limit: limitForRunsMock });

  // Re-apply whereMock after vi.clearAllMocks() cleared it
  let count = 0;
  whereMock.mockImplementation(() => {
    count += 1;
    if (count === 1) {
      return { limit: limitForAccountsMock };
    }
    return { orderBy: orderByMock };
  });
});

describe("POST /api/scan", () => {
  it("returns 409 when a scan with status 'running' exists within the last 5 minutes", async () => {
    const runningRun = {
      id: RUN_ID,
      status: "running",
      startedAt: new Date(Date.now() - 60_000), // 1 minute ago
    };
    limitForRunsMock.mockResolvedValue([runningRun]);

    const res = await POST(makeReq({ accountId: ACCOUNT_ID }));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; runId: string };
    expect(body.error).toBe("scan_in_progress");
    expect(body.runId).toBe(RUN_ID);
  });

  it("returns 429 with retryAfterSeconds when last run succeeded within 5 minutes", async () => {
    const startedAt = new Date(Date.now() - 2 * 60_000); // 2 minutes ago
    const succeededRun = { id: RUN_ID, status: "succeeded", startedAt };
    limitForRunsMock.mockResolvedValue([succeededRun]);

    const res = await POST(makeReq({ accountId: ACCOUNT_ID }));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; retryAfterSeconds: number };
    expect(body.error).toBe("rate_limited");
    expect(typeof body.retryAfterSeconds).toBe("number");
    // ~3 minutes remain → should be ~180 seconds (±5 for timing jitter)
    expect(body.retryAfterSeconds).toBeGreaterThan(170);
    expect(body.retryAfterSeconds).toBeLessThanOrEqual(180);
    expect(res.headers.get("Retry-After")).toBe(String(body.retryAfterSeconds));
  });

  it("returns 429 when last run failed within 5 minutes", async () => {
    const startedAt = new Date(Date.now() - 3 * 60_000); // 3 minutes ago
    const failedRun = { id: RUN_ID, status: "failed", startedAt };
    limitForRunsMock.mockResolvedValue([failedRun]);

    const res = await POST(makeReq({ accountId: ACCOUNT_ID }));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; retryAfterSeconds: number };
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("allows scan when last run started more than 5 minutes ago", async () => {
    // DB query filters by gte(startedAt, fiveMinutesAgo) so route receives []
    limitForRunsMock.mockResolvedValue([]);

    const res = await POST(makeReq({ accountId: ACCOUNT_ID }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { runId: string };
    expect(body.runId).toBe(RUN_ID);
  });
});
