import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/posthog/server", () => ({ capture: vi.fn() }));
vi.mock("@/lib/billing/gate", () => ({
  checkOrgTier: vi.fn().mockResolvedValue("pro"),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, limit: 60, remaining: 59, reset: Date.now() + 3600000 }),
  rateLimitExceededResponse: vi.fn().mockReturnValue(new Response(JSON.stringify({ error: "rate_limit_exceeded" }), { status: 429 })),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
  inArray: vi.fn((col, vals) => ({ _inArray: [col, vals] })),
}));

const { whereSelectMock, updateWhereMock, updateSetMock } = vi.hoisted(() => ({
  whereSelectMock: vi.fn(),
  updateWhereMock: vi.fn().mockResolvedValue(undefined),
  updateSetMock: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const db = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: whereSelectMock,
    update: vi.fn().mockReturnThis(),
    set: updateSetMock,
  };
  updateSetMock.mockReturnValue({ where: updateWhereMock });
  return {
    db,
    schema: {
      opportunities: { id: "opp.id", accountId: "opp.account_id" },
      accounts: { id: "acc.id", orgId: "acc.org_id" },
    },
  };
});

import { auth } from "@clerk/nextjs/server";
import { checkOrgTier } from "@/lib/billing/gate";
import { PATCH } from "./route";

const ID_A = "11111111-1111-1111-1111-111111111111";
const ID_B = "22222222-2222-2222-2222-222222222222";
const ID_C = "33333333-3333-3333-3333-333333333333";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/findings/bulk", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: "org_1" } as never);
  whereSelectMock.mockResolvedValue([{ id: ID_A }, { id: ID_B }]);
  updateSetMock.mockReturnValue({ where: updateWhereMock });
  updateWhereMock.mockResolvedValue(undefined);
});

describe("PATCH /api/findings/bulk", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null, orgId: null } as never);
    const res = await PATCH(makeReq({ ids: [ID_A], action: "apply" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no active organization", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user_1", orgId: null } as never);
    const res = await PATCH(makeReq({ ids: [ID_A], action: "apply" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const res = await PATCH(makeReq("not json{"));
    expect(res.status).toBe(400);
  });

  it("returns 400 on bad body (missing fields)", async () => {
    const res = await PATCH(makeReq({ action: "apply" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when action is not in enum", async () => {
    const res = await PATCH(makeReq({ ids: [ID_A], action: "delete" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids exceeds max (200)", async () => {
    const tooMany = Array.from({ length: 201 }, () => ID_A);
    const res = await PATCH(makeReq({ ids: tooMany, action: "apply" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids is empty", async () => {
    const res = await PATCH(makeReq({ ids: [], action: "apply" }));
    expect(res.status).toBe(400);
  });

  it("applies owned ids and reports skipped count for ids not owned by org", async () => {
    // Caller asked for 3 ids; org owns only 2 of them.
    whereSelectMock.mockResolvedValue([{ id: ID_A }, { id: ID_B }]);
    const res = await PATCH(makeReq({ ids: [ID_A, ID_B, ID_C], action: "apply" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: number; skipped: number };
    expect(body.updated).toBe(2);
    expect(body.skipped).toBe(1);
    // The update was issued with appliedAt set on a Date
    expect(updateSetMock).toHaveBeenCalledOnce();
    const setArg = updateSetMock.mock.calls[0]![0] as { appliedAt: Date };
    expect(setArg.appliedAt).toBeInstanceOf(Date);
  });

  it("dismiss action sets dismissedAt", async () => {
    whereSelectMock.mockResolvedValue([{ id: ID_A }]);
    const res = await PATCH(makeReq({ ids: [ID_A], action: "dismiss" }));
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]![0] as { dismissedAt: Date };
    expect(setArg.dismissedAt).toBeInstanceOf(Date);
  });

  it("undo_apply action nulls appliedAt", async () => {
    whereSelectMock.mockResolvedValue([{ id: ID_A }]);
    const res = await PATCH(makeReq({ ids: [ID_A], action: "undo_apply" }));
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]![0] as { appliedAt: null };
    expect(setArg.appliedAt).toBeNull();
  });

  it("undo_dismiss action nulls dismissedAt", async () => {
    whereSelectMock.mockResolvedValue([{ id: ID_A }]);
    const res = await PATCH(makeReq({ ids: [ID_A], action: "undo_dismiss" }));
    expect(res.status).toBe(200);
    const setArg = updateSetMock.mock.calls[0]![0] as { dismissedAt: null };
    expect(setArg.dismissedAt).toBeNull();
  });

  it("skips update when no requested ids belong to org", async () => {
    whereSelectMock.mockResolvedValue([]);
    const res = await PATCH(makeReq({ ids: [ID_A, ID_B], action: "apply" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { updated: number; skipped: number };
    expect(body.updated).toBe(0);
    expect(body.skipped).toBe(2);
    expect(updateSetMock).not.toHaveBeenCalled();
  });

  it("returns 402 with upgrade_required when org is on free tier", async () => {
    vi.mocked(checkOrgTier).mockResolvedValueOnce("free");
    const res = await PATCH(makeReq({ ids: [ID_A], action: "apply" }));
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("upgrade_required");
  });
});
