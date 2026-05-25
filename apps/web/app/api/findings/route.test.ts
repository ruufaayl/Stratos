import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  desc: vi.fn((a) => ({ _desc: a })),
}));

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: limitMock,
  },
  schema: {
    opportunities: { accountId: "opp.account_id", createdAt: "opp.created_at" },
    accounts: { id: "acc.id", orgId: "acc.org_id" },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { GET } from "./route";

const MOCK_ROWS = [
  {
    opp: {
      id: "opp-1",
      runId: "run-1",
      accountId: "acc-1",
      kind: "idle",
      resourceId: "i-0abc",
      monthlySavings: "121.47",
      risk: "0.100",
      engineData: { peak_cpu_pct: 2.0 },
      explanation: null,
      dismissedAt: null,
      appliedAt: null,
      createdAt: new Date("2024-01-01"),
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);
  limitMock.mockResolvedValue(MOCK_ROWS);
});

function makeReq() {
  return new Request("http://localhost/api/findings");
}

describe("GET /api/findings", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 400 when orgId missing", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: null } as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });

  it("returns 200 with findings array on success", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { findings: Array<{ id: string; kind: string }> };
    expect(Array.isArray(body.findings)).toBe(true);
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0]!.id).toBe("opp-1");
    expect(body.findings[0]!.kind).toBe("idle");
  });

  it("returns empty findings array when no opportunities exist", async () => {
    limitMock.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { findings: unknown[] };
    expect(body.findings).toHaveLength(0);
  });
});
