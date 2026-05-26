/**
 * Server-side configuration with required env var validation.
 * Import in server components / API routes; never in client code.
 *
 * Throws on startup if required vars are missing in production.
 */

function required(name: string): string {
  const val = process.env[name];
  if (!val && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val ?? "";
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const config = {
  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  engineUrl: optional("STRATOS_ENGINE_URL", "http://localhost:8000"),
  cronSecret: optional("CRON_SECRET"),
  clerkWebhookSecret: optional("CLERK_WEBHOOK_SECRET"),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
  resendApiKey: optional("RESEND_API_KEY"),
  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
} as const;

/** True if all monetization env vars are present (Stripe + Resend). */
export const isMonetizationReady =
  !!process.env.STRIPE_SECRET_KEY &&
  !!process.env.STRIPE_PRO_PRICE_ID &&
  !!process.env.RESEND_API_KEY;
