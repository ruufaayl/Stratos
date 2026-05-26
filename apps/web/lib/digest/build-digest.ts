/**
 * D8-D — Pure digest content builder.
 *
 * Takes the latest scan + previous run + top findings and returns a
 * structured DigestOutput. No I/O, no LLM, no Date.now().
 *
 * ARCHITECTURE LAW: Python owns truth. This file is the deterministic
 * layer for what goes in an email. Claude never invoked here.
 *
 * Numbers are returned RAW (no formatting beyond subject/headline strings).
 * The consumer's render layer (HTML / plaintext) does formatting.
 */

export interface DigestInput {
  orgName: string;
  latestRun: {
    finishedAt: Date;
    totalMonthlyWaste: number;
    opportunityCount: number;
    resourceCount: number;
  };
  previousRun: {
    totalMonthlyWaste: number;
    opportunityCount: number;
  } | null;
  /** Top findings, expected to be pre-sorted by monthlySavings desc by the caller. Max 5. */
  topFindings: Array<{
    id: string;
    kind: string;
    monthlySavings: number;
    resourceId: string | null;
    explanation: string | null;
  }>;
}

export interface DigestOutput {
  subject: string;
  headline: string;
  totals: {
    wasteMonthly: number;
    findings: number;
    resources: number;
  };
  delta: {
    wasteMonthly: number;
    findings: number;
  } | null;
  topFindings: Array<{
    id: string;
    title: string;
    savings: number;
    explanation: string;
  }>;
  ctaUrl: string;
  ctaLabel: string;
}

/** Human label for an opportunity kind, e.g., "Idle EC2 instance". */
function kindLabel(kind: string): string {
  switch (kind) {
    case "idle":
      return "Idle EC2 instance";
    case "rightsize":
      return "Oversized EC2 instance";
    case "anomaly":
      return "Cost anomaly";
    case "commitment":
      return "Commitment opportunity";
    case "zombie":
      return "Zombie resource";
    default:
      return kind;
  }
}

/** Format an integer dollar amount with thousands separators, no decimals. */
function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

/**
 * Build a deterministic digest payload from the latest scan.
 *
 * The caller is responsible for:
 *   - Sorting topFindings by monthlySavings desc and slicing to 5.
 *   - Resolving orgSlug (used to build the dashboard CTA URL).
 */
export function buildDigest(input: DigestInput, orgSlug: string): DigestOutput {
  const { latestRun, previousRun, topFindings, orgName } = input;

  const waste = latestRun.totalMonthlyWaste;
  const findings = latestRun.opportunityCount;
  const resources = latestRun.resourceCount;

  const subject = `Stratos: ${formatUsd(waste)}/mo of waste detected`;

  const findingNoun = findings === 1 ? "opportunity" : "opportunities";
  const headline =
    findings > 0
      ? `${orgName}: ${formatUsd(waste)}/mo of waste across ${findings} ${findingNoun} on ${resources} resources.`
      : `${orgName}: no waste detected across ${resources} resources this scan.`;

  const delta = previousRun
    ? {
        wasteMonthly: waste - previousRun.totalMonthlyWaste,
        findings: findings - previousRun.opportunityCount,
      }
    : null;

  const topOut = topFindings.slice(0, 5).map((f) => ({
    id: f.id,
    title: f.resourceId
      ? `${kindLabel(f.kind)} ${f.resourceId}`
      : kindLabel(f.kind),
    savings: f.monthlySavings,
    explanation: f.explanation ?? "",
  }));

  return {
    subject,
    headline,
    totals: {
      wasteMonthly: waste,
      findings,
      resources,
    },
    delta,
    topFindings: topOut,
    ctaUrl: `/app/${orgSlug}/?tab=feed`,
    ctaLabel: "View full analysis",
  };
}
