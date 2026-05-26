import { describe, it, expect } from "vitest";
import { buildDigest, type DigestInput } from "./build-digest";

const BASE_LATEST = {
  finishedAt: new Date("2026-05-25T12:00:00Z"),
  totalMonthlyWaste: 12_345,
  opportunityCount: 8,
  resourceCount: 42,
};

function makeInput(overrides: Partial<DigestInput> = {}): DigestInput {
  return {
    orgName: "Acme",
    latestRun: BASE_LATEST,
    previousRun: null,
    topFindings: [],
    ...overrides,
  };
}

describe("buildDigest", () => {
  it("builds a subject including the dollar total", () => {
    const out = buildDigest(makeInput(), "acme");
    expect(out.subject).toBe("Stratos: $12,345/mo of waste detected");
  });

  it("formats subject with $0 when waste is zero", () => {
    const out = buildDigest(
      makeInput({
        latestRun: { ...BASE_LATEST, totalMonthlyWaste: 0, opportunityCount: 0 },
      }),
      "acme",
    );
    expect(out.subject).toBe("Stratos: $0/mo of waste detected");
  });

  it("rounds subject to whole dollars", () => {
    const out = buildDigest(
      makeInput({
        latestRun: { ...BASE_LATEST, totalMonthlyWaste: 9999.6 },
      }),
      "acme",
    );
    expect(out.subject).toBe("Stratos: $10,000/mo of waste detected");
  });

  it("includes org name + opportunity count in headline", () => {
    const out = buildDigest(makeInput(), "acme");
    expect(out.headline).toContain("Acme");
    expect(out.headline).toContain("8 opportunities");
    expect(out.headline).toContain("42 resources");
  });

  it("uses singular 'opportunity' when count is 1", () => {
    const out = buildDigest(
      makeInput({
        latestRun: { ...BASE_LATEST, opportunityCount: 1 },
      }),
      "acme",
    );
    expect(out.headline).toContain("1 opportunity");
    expect(out.headline).not.toContain("1 opportunities");
  });

  it("uses a zero-waste headline when no findings", () => {
    const out = buildDigest(
      makeInput({
        latestRun: { ...BASE_LATEST, opportunityCount: 0, totalMonthlyWaste: 0 },
      }),
      "acme",
    );
    expect(out.headline).toContain("no waste detected");
  });

  it("exposes raw numbers (not strings) in totals", () => {
    const out = buildDigest(makeInput(), "acme");
    expect(out.totals.wasteMonthly).toBe(12_345);
    expect(out.totals.findings).toBe(8);
    expect(out.totals.resources).toBe(42);
  });

  it("delta is null when there is no previous run", () => {
    const out = buildDigest(makeInput({ previousRun: null }), "acme");
    expect(out.delta).toBeNull();
  });

  it("delta math is positive when waste increased", () => {
    const out = buildDigest(
      makeInput({
        previousRun: { totalMonthlyWaste: 10_000, opportunityCount: 5 },
      }),
      "acme",
    );
    expect(out.delta).toEqual({ wasteMonthly: 2_345, findings: 3 });
  });

  it("delta math is negative when waste decreased", () => {
    const out = buildDigest(
      makeInput({
        latestRun: { ...BASE_LATEST, totalMonthlyWaste: 8_000, opportunityCount: 4 },
        previousRun: { totalMonthlyWaste: 10_000, opportunityCount: 7 },
      }),
      "acme",
    );
    expect(out.delta).toEqual({ wasteMonthly: -2_000, findings: -3 });
  });

  it("delta is zero when totals unchanged", () => {
    const out = buildDigest(
      makeInput({
        previousRun: { totalMonthlyWaste: 12_345, opportunityCount: 8 },
      }),
      "acme",
    );
    expect(out.delta).toEqual({ wasteMonthly: 0, findings: 0 });
  });

  it("handles empty topFindings", () => {
    const out = buildDigest(makeInput({ topFindings: [] }), "acme");
    expect(out.topFindings).toEqual([]);
  });

  it("formats top finding titles with kind + resourceId", () => {
    const out = buildDigest(
      makeInput({
        topFindings: [
          {
            id: "opp-1",
            kind: "idle",
            monthlySavings: 100,
            resourceId: "i-0abc",
            explanation: "It is idle.",
          },
        ],
      }),
      "acme",
    );
    expect(out.topFindings[0]!.title).toBe("Idle EC2 instance i-0abc");
    expect(out.topFindings[0]!.savings).toBe(100);
    expect(out.topFindings[0]!.explanation).toBe("It is idle.");
    expect(out.topFindings[0]!.id).toBe("opp-1");
  });

  it("falls back to kind-only title when resourceId is null", () => {
    const out = buildDigest(
      makeInput({
        topFindings: [
          {
            id: "opp-2",
            kind: "anomaly",
            monthlySavings: 50,
            resourceId: null,
            explanation: null,
          },
        ],
      }),
      "acme",
    );
    expect(out.topFindings[0]!.title).toBe("Cost anomaly");
    expect(out.topFindings[0]!.explanation).toBe("");
  });

  it("preserves caller-provided sort order (savings desc)", () => {
    const out = buildDigest(
      makeInput({
        topFindings: [
          { id: "a", kind: "idle", monthlySavings: 500, resourceId: "i-1", explanation: null },
          { id: "b", kind: "idle", monthlySavings: 300, resourceId: "i-2", explanation: null },
          { id: "c", kind: "idle", monthlySavings: 100, resourceId: "i-3", explanation: null },
        ],
      }),
      "acme",
    );
    expect(out.topFindings.map((f) => f.id)).toEqual(["a", "b", "c"]);
    // Verify descending: each savings >= the next
    for (let i = 0; i < out.topFindings.length - 1; i++) {
      expect(out.topFindings[i]!.savings).toBeGreaterThanOrEqual(out.topFindings[i + 1]!.savings);
    }
  });

  it("caps top findings at 5", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: `opp-${i}`,
      kind: "idle",
      monthlySavings: 1000 - i,
      resourceId: `i-${i}`,
      explanation: null,
    }));
    const out = buildDigest(makeInput({ topFindings: many }), "acme");
    expect(out.topFindings).toHaveLength(5);
    expect(out.topFindings[0]!.id).toBe("opp-0");
    expect(out.topFindings[4]!.id).toBe("opp-4");
  });

  it("labels every supported kind", () => {
    const kinds = ["idle", "rightsize", "anomaly", "commitment", "zombie"];
    const out = buildDigest(
      makeInput({
        topFindings: kinds.map((kind, i) => ({
          id: `o-${i}`,
          kind,
          monthlySavings: 100 - i,
          resourceId: null,
          explanation: null,
        })),
      }),
      "acme",
    );
    expect(out.topFindings.map((f) => f.title)).toEqual([
      "Idle EC2 instance",
      "Oversized EC2 instance",
      "Cost anomaly",
      "Commitment opportunity",
      "Zombie resource",
    ]);
  });

  it("builds CTA url with orgSlug and feed tab", () => {
    const out = buildDigest(makeInput(), "acme-corp");
    expect(out.ctaUrl).toBe("/app/acme-corp/?tab=feed");
    expect(out.ctaLabel).toBe("View full analysis");
  });
});
