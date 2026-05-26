/**
 * Welcome email template.
 *
 * Plain HTML with inline styles — no React Email dependency needed.
 * Email clients strip <style> tags; every style must be inline.
 *
 * Matches the Stratos dark-theme design language:
 *   #0A0A0F background · #6366F1 indigo · #10B981 emerald · Inter UI font
 */

export const welcomeEmailSubject =
  "Welcome to Stratos — your cloud, optimized 🚀";

export function welcomeEmailHtml(opts: { firstName?: string }): string {
  const greeting = opts.firstName ? `Hey ${opts.firstName},` : "Hey,";
  const appUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.stratos.ai") + "/app";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Stratos</title>
</head>
<body style="background-color: #0a0a0f; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0f; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- Header: wordmark + green pulse dot -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; margin-right: 8px; vertical-align: middle;"></span>
                    <span style="color: #f1f5f9; font-weight: 700; font-size: 18px; vertical-align: middle; letter-spacing: -0.01em;">Stratos</span>
                  </td>
                  <td align="right" style="color: #475569; font-family: monospace; font-size: 12px;">
                    cloud cost intelligence
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background: #0f0f1a; border: 1px solid #1e1e2e; border-radius: 12px; padding: 36px 32px;">

              <!-- Greeting -->
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 20px;">
                ${greeting}
              </p>

              <!-- Headline -->
              <h1 style="color: #f1f5f9; font-size: 28px; font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; margin: 0 0 20px;">
                Your cloud waste detector<br />is ready.
              </h1>

              <!-- Body copy -->
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.65; margin: 0 0 12px;">
                Thanks for signing up. Stratos uses real AWS CloudWatch data and
                statistical algorithms to find idle EC2 instances, oversized RDS
                databases, zombie EBS volumes, and commitment gaps &mdash; automatically.
              </p>
              <p style="color: #94a3b8; font-size: 15px; line-height: 1.65; margin: 0 0 28px;">
                To get started: connect your AWS account with a read-only IAM role
                and run your first scan.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 8px; background: #6366f1;">
                    <a href="${appUrl}"
                       style="display: inline-block; color: #f1f5f9; text-decoration: none; padding: 13px 28px; font-size: 15px; font-weight: 600; border-radius: 8px; letter-spacing: 0.01em;">
                      Connect your AWS account &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- What we find — three pillars -->
          <tr>
            <td style="padding-top: 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="padding: 16px 12px 16px 0; vertical-align: top;">
                    <p style="color: #10b981; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px;">Idle</p>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                      EC2 &amp; RDS instances with &lt;5% CPU over 14 days
                    </p>
                  </td>
                  <td width="33%" style="padding: 16px 6px; vertical-align: top;">
                    <p style="color: #f59e0b; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px;">Oversize</p>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                      Rightsizing opportunities from CloudWatch percentiles
                    </p>
                  </td>
                  <td width="33%" style="padding: 16px 0 16px 12px; vertical-align: top;">
                    <p style="color: #6366f1; font-family: monospace; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 6px;">Commit</p>
                    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 0;">
                      Reserved Instance &amp; Savings Plan gaps
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 8px 0;">
              <hr style="border: none; border-top: 1px solid #1e1e2e; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 20px; text-align: center; color: #334155; font-size: 12px; font-family: monospace; line-height: 1.8;">
              Stratos &middot; Global &middot; No HQ &middot; AWS read-only, never writes to your infrastructure<br />
              <span style="color: #1e293b;">You&rsquo;re receiving this because you created a Stratos account.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
