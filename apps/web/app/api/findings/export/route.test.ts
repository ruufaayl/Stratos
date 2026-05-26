import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/posthog/server", () => ({ capture: vi.fn() }));
vi.mock("@/lib/billing/gate", () => ({
  checkOrgTier: vi.fn().mockResolvedValue("pro"),
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ _eq: [a, b] })),
  and: vi.fn((...args) => ({ _and: args })),
  desc: vi.fn((col) => ({ _desc: col })),
}));

// We track how many times db.select() has been called so we can return
// different results for the run-lookup vs. the findings query.
let dbSelectCallCount = 0;

const { runResolve, findingsResolve } = vi.hoisted(() => ({
  runResolve: vi.fn().mockResolvedValue([]),
  findingsResolve: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/db", () => {
  // Build a fluent chain that ultimately resolves via the correct mock.
  function makeChain(resolve: ReturnType<typeof vi.fn>) {
    const chain: Record<string, unknown> = {};
    const terminal = resolve;
    // Every method in the chain returns the same chain object so callers can
    // append as many clauses as they like.  The final .limit() / .then() /
    // direct await resolves via `terminal`.
    const self = new Proxy(chain, {
      get(_t, prop) {
        if (prop === "then") {
          // Awaiting the chain directly (no terminal .limit())
          return terminal().then.bind(terminal());
        }
        if (prop === "limit") {
          // .limit(n) → returns a promise
          return () => terminal();
        }
        // All other method names (select, from, innerJoin, where, orderBy)
        // return the same proxy so chaining works.
        return () => self;
      },
    });
    return self;
  }

  const db = {
    select: vi.fn().mockImplementation(() => {
      dbSelectCallCount += 1;
      // First call = run lookup; second call = findings query.
      return dbSelectCallCount === 1
        ? makeChain(runResolve)
        : makeChain(findingsResolve);
    }),
  };

  return {
    db,
    schema: {
      opportunities: {
        id: "opp.id",
        runId: "opp.run_id",
        accountId: "opp.account_id",
        kind: "opp.kind",
        resourceId: "opp.resource_id",
        monthlySavings: "opp.monthly_savings",
        risk: "opp.risk",
        appliedAt: "opp.applied_at",
        dismissedAt: "opp.dismissed_at",
        createdAt: "opp.created_at",
        explanation: "opp.explanation",
      },
      accounts: {
        id: "acc.id",
        orgId: "acc.org_id",
        region: "acc.region",
      },
      runs: {
        id: "run.id",
        accountId: "run.account_id",
        status: "run.status",
        finishedAt: "run.finished_at",
      },
    },
  };
});

import { auth } from "@clerk/nextjs/server";
import { checkOrgTier } from "@/lib/billing/gate";
import { GET } from "./route";

const RUN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function makeRow(overrides: Partial<{
  id: string;
  kind: string;
  resourceId: string | null;
  region: string;
  monthlySavings: string;
  risk: string | null;
  appliedAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
  explanation: string | null;
}> = {}) {
  return {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    kind: "idle",
    resourceId: "i-0abc123",
    region: "us-east-1",
    monthlySavings: "500.00",
    risk: "0.200",
    appliedAt: null,
    dismissedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    explanation: "This instance is idle.",
    ...overrides,
  };
}

function makeRequest(runId?: string) {
  const url = runId
    ? `http://localhost/api/findings/export?runId=${runId}`
    : "http://localhost/api/findings/export";
  return new Request(url);
}

beforeEach(() => {
  dbSelectCallCount = 0;
  vi.clearAllMocks();
  // Default: authenticated org user
  vi.mocked(auth).mockResolvedValue({ orgId: "org_1" } as never);
  // Default: run lookup succeeds
  runResolve.mockResolvedValue([{ id: RUN_ID }]);
  // Default: findings query returns one row
  findingsResolve.mockResolvedValue([makeRow()]);
});

describe("GET /api/findings/export", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(auth).mockResolvedValue({ orgId: null } as never);
    const res = await GET(makeRequest(RUN_ID));
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when runId not found or belongs to other org", async () => {
    runResolve.mockResolvedValue([]);
    const res = await GET(makeRequest(RUN_ID));
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("run_not_found");
  });

  it("returns 404 when no runId supplied and no succeeded run exists", async () => {
    runResolve.mockResolvedValue([]);
    const res = await GET(makeRequest());
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("run_not_found");
  });

  it("returns CSV with correct headers for a valid run", async () => {
    const res = await GET(makeRequest(RUN_ID));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    const firstLine = text.split("\r\n")[0];
    expect(firstLine).toBe(
      "id,kind,resourceId,region,monthlySavings,annualSavings,risk,status,detectedAt,explanation",
    );
  });

  it("annualSavings equals monthlySavings * 12", async () => {
    findingsResolve.mockResolvedValue([makeRow({ monthlySavings: "100.00" })]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    // annualSavings is the 6th column (index 5) — wrapped in double-quotes
    const fields = dataLine.split(",");
    const annual = fields[5]!.replace(/"/g, "");
    expect(annual).toBe("1200.00");
  });

  it("escapes commas in explanation field", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ explanation: "Save money, reduce waste" }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    expect(dataLine).toContain('"Save money, reduce waste"');
  });

  it("escapes double-quotes in explanation field", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ explanation: 'She said "hello"' }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    expect(dataLine).toContain('"She said ""hello"""');
  });

  it("escapes newlines in explanation field", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ explanation: "Line one\nLine two" }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    // The field wrapping should contain the literal newline wrapped in quotes
    expect(text).toContain('"Line one\nLine two"');
  });

  it("status is 'applied' when appliedAt is set", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ appliedAt: new Date("2026-05-10T00:00:00.000Z"), dismissedAt: null }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    expect(dataLine).toContain('"applied"');
  });

  it("status is 'dismissed' when dismissedAt is set and appliedAt is null", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ appliedAt: null, dismissedAt: new Date("2026-05-10T00:00:00.000Z") }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    expect(dataLine).toContain('"dismissed"');
  });

  it("status is 'open' when both appliedAt and dismissedAt are null", async () => {
    findingsResolve.mockResolvedValue([
      makeRow({ appliedAt: null, dismissedAt: null }),
    ]);
    const res = await GET(makeRequest(RUN_ID));
    const text = await res.text();
    const dataLine = text.split("\r\n")[1]!;
    expect(dataLine).toContain('"open"');
  });

  it("Content-Disposition includes the runId", async () => {
    const res = await GET(makeRequest(RUN_ID));
    expect(res.headers.get("Content-Disposition")).toBe(
      `attachment; filename="stratos-findings-${RUN_ID}.csv"`,
    );
  });

  it("returns 402 with upgrade_required when org is on free tier", async () => {
    vi.mocked(checkOrgTier).mockResolvedValueOnce("free");
    const res = await GET(makeRequest(RUN_ID));
    expect(res.status).toBe(402);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("upgrade_required");
  });
});
