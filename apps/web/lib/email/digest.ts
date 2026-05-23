/**
 * Weekly digest email renderer.
 *
 * Generates an HTML email summarising the week's top opportunities for a user.
 * Uses a hand-rolled HTML template (no React Email dependency) so it works
 * in any Node runtime without extra build steps.
 *
 * Architecture law: ALL dollar figures passed in come from engine_data.
 * This function only formats them — never computes or rounds differently.
 */

export interface DigestOpportunity {
  kind: string;
  resourceId: string | null;
  monthlySavings: string; // numeric string from DB (e.g., "342.50")
  explanation: string | null;
}

export interface DigestData {
  userEmail: string;
  totalMonthlyWaste: number;
  opportunityCount: number;
  accountName: string;
  topOpportunities: DigestOpportunity[];
  runDate: string; // ISO date string
  dashboardUrl: string;
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "idle": return "Idle resource";
    case "rightsize": return "Overprovisioned";
    case "anomaly": return "Cost anomaly";
    case "commitment": return "Commitment opportunity";
    default: return kind;
  }
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function renderDigestHtml(data: DigestData): string {
  const topRows = data.topOpportunities
    .slice(0, 5)
    .map(
      (o) => `
      <tr style="border-bottom: 1px solid #1e1e2e;">
        <td style="padding: 12px 16px; color: #94a3b8; font-family: monospace; font-size: 12px;">
          ${kindLabel(o.kind)}
        </td>
        <td style="padding: 12px 16px; color: #94a3b8; font-family: monospace; font-size: 12px;">
          ${o.resourceId ?? "—"}
        </td>
        <td style="padding: 12px 16px; color: #ef4444; font-family: monospace; font-size: 14px; font-weight: 600; text-align: right;">
          ${usd(Number(o.monthlySavings))}/mo
        </td>
      </tr>
      <tr style="border-bottom: 1px solid #0a0a0f;">
        <td colspan="3" style="padding: 4px 16px 12px; color: #64748b; font-size: 13px;">
          ${o.explanation ?? ""}
        </td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Stratos weekly digest — ${data.accountName}</title>
</head>
<body style="background-color: #0a0a0f; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                    <span style="color: #f1f5f9; font-weight: 600; font-size: 16px; vertical-align: middle;">Stratos</span>
                    <span style="color: #475569; font-family: monospace; font-size: 12px; vertical-align: middle; margin-left: 8px;">/ weekly digest</span>
                  </td>
                  <td align="right" style="color: #475569; font-family: monospace; font-size: 12px;">
                    ${new Date(data.runDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="background: #0f0f1a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 32px;">
              <p style="color: #64748b; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 12px;">
                ${data.accountName} · this week
              </p>
              <p style="color: #ef4444; font-size: 42px; font-weight: 700; font-family: monospace; margin: 0 0 4px; letter-spacing: -0.02em;">
                ${usd(data.totalMonthlyWaste)}/mo
              </p>
              <p style="color: #94a3b8; font-size: 15px; margin: 0;">
                waste identified across ${data.opportunityCount} opportunity${data.opportunityCount !== 1 ? "ies" : "y"}. Python computed every dollar.
              </p>
            </td>
          </tr>

          <!-- Opportunities table -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="color: #f1f5f9; font-weight: 600; font-size: 14px; margin: 0 0 12px;">Top opportunities</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #0f0f1a; border: 1px solid #1e1e2e; border-radius: 8px; overflow: hidden;">
                ${topRows}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <a href="${data.dashboardUrl}"
                 style="display: inline-block; background: #6366f1; color: #f1f5f9; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 14px;">
                View full analysis →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; border-top: 1px solid #1e1e2e; margin-top: 32px; text-align: center; color: #334155; font-size: 12px; font-family: monospace;">
              Stratos · Global · No HQ · build in public<br />
              Python owns truth. Claude owns language. You own the decision.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderDigestText(data: DigestData): string {
  const lines = [
    `STRATOS WEEKLY DIGEST — ${data.accountName}`,
    `${new Date(data.runDate).toLocaleDateString("en-US")}`,
    ``,
    `WASTE IDENTIFIED: ${usd(data.totalMonthlyWaste)}/mo across ${data.opportunityCount} opportunities`,
    ``,
    `TOP OPPORTUNITIES`,
    ...data.topOpportunities.slice(0, 5).map(
      (o) =>
        `  ${kindLabel(o.kind).padEnd(22)} ${o.resourceId ?? "—"} — ${usd(Number(o.monthlySavings))}/mo`,
    ),
    ``,
    `View full analysis: ${data.dashboardUrl}`,
    ``,
    `Python owns truth. Claude owns language. You own the decision.`,
  ];
  return lines.join("\n");
}
