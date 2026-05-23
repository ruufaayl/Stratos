/**
 * Stripe singleton — server-side only.
 *
 * Usage:
 *   import { stripe } from "@/lib/stripe";
 *   const session = await stripe.checkout.sessions.create(...);
 *
 * IMPORTANT: never import this in client code. The secret key must stay on
 * the server. `@stripe/stripe-js` is the client-safe counterpart.
 */

import Stripe from "stripe";

// Fail fast at startup if key is missing (same guard philosophy as lib/env.ts)
const key = process.env.STRIPE_SECRET_KEY;

// In development (before Stripe is activated) we allow the key to be absent
// but log a warning so it's obvious when features won't work.
let _stripe: Stripe | null = null;

if (key) {
  _stripe = new Stripe(key, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });
} else if (process.env.NODE_ENV === "production") {
  throw new Error(
    "STRIPE_SECRET_KEY is required in production. " +
      "Set it in your environment variables.",
  );
}

export const stripe = _stripe;

// ---------------------------------------------------------------------------
// Price / plan constants — kept here so they're easy to change and testable.
// ---------------------------------------------------------------------------

export const PLANS = {
  free: {
    name: "Free",
    description: "Public data demo — no account required",
    price: 0,
    priceId: null,
    features: [
      "Public synthetic fleet analysis",
      "All four engine algorithms",
      "Read-only demo",
    ],
  },
  pro: {
    name: "Pro",
    description: "Your real AWS account, optimized automatically",
    price: 199,
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      "Connect your AWS account (read-only IAM)",
      "Real-time CloudWatch metric pull",
      "Weekly email digest with ranked opportunities",
      "Claude-powered plain-English explanations",
      "Unlimited runs",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
