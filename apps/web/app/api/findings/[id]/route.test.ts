import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
}));
vi.mock("@/lib/posthog/server", () => ({ capture: vi.fn().mockResolvedValue(undefined) }));

const FINDING_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

const { limitMock, innerJoinMock, whereMock } = vi.hoisted(() => {
  const limitMock = vi.fn().mockResolvedValue([]);
  const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
  const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
  return { limitMock, innerJoinMock, whereMock };
});

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: innerJoinMock,
    where: whereMock,
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
  schema: {
    opportunities: { id: "opp.id", accountId: "opp.account_id", appliedAt: "opp.applied_at", dismissedAt: "opp.dismissed_at" },
    accounts: { id: "acc.id", orgId: "acc.org_id" },
  },
}));

import { auth } from "@clerk/nextjs/server";
import { GET, PATCH } from "./route";

function makeGetReq() {
  return new Request(`http://localhost/api/findings/${FINDING_ID}`, { method: "GET" });
}

function makePatchReq(action: string) {
  return new Request(`http://localhost/api/findings/${FINDING_ID}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

const params = { id: FINDING_ID };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);
  // Default: finding exists
  limitMock.mockResolvedValue([{
    opp: { id: FINDING_ID, accountId: "acc_1", appliedAt: null, dismissedAt: null, kind: "idle", monthlySavings: "120.00" }
  }]);
  innerJoinMock.mockReturnValue({ where: whereMock });
  whereMock.mockReturnValue({ limit: limitMock });
});

describe("GET /api/findings/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when finding not found", async () => {
    limitMock.mockResolvedValue([]);
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(404);
  });

  it("returns 200 with finding when found", async () => {
    const res = await GET(makeGetReq(), { params });
    expect(res.status).toBe(200);
    const body = await res.json() as { finding: { id: string } };
    expect(body.finding.id).toBe(FINDING_ID);
  });
});

describe("PATCH /api/findings/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    // For PATCH the first query is an existence check (returns [{ id }])
    limitMock.mockResolvedValue([{ id: FINDING_ID }]);
    const res = await PATCH(makePatchReq("apply"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when finding not in org", async () => {
    limitMock.mockResolvedValue([]);
    const res = await PATCH(makePatchReq("apply"), { params });
    expect(res.status).toBe(404);
  });

  it("returns 200 ok on valid action", async () => {
    // PATCH existence check returns [{ id }] shape
    limitMock.mockResolvedValue([{ id: FINDING_ID }]);
    const res = await PATCH(makePatchReq("dismiss"), { params });
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 400 on invalid action", async () => {
    const res = await PATCH(makePatchReq("invalid_action"), { params });
    expect(res.status).toBe(400);
  });
});
