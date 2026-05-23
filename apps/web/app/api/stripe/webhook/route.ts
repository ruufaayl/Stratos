/**
 * POST /api/stripe/webhook
 * Handles Stripe events. This is the ONLY place that writes the tier field
 * on an account row — not the checkout redirect (which can be spoofed).
 *
 * Events handled:
 *   checkout.session.completed   → upgrade account tier to "pro"
 *   customer.subscription.deleted → downgrade back to "free"
 *
 * In production, verify the webhook signature. In dev, signature check is
 * bypassed when STRIPE_WEBHOOK_SECRET is absent.
 */

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

// Stripe sends raw bytes; we need the raw body for signature verification.
export const runtime = "nodejs";

async function updateAccountTier(clerkUserId: string, tier: string) {
  // An account row may not exist yet if the user upgraded before connecting
  // their AWS account. Update if present; create on first onboarding.
  await db
    .update(schema.accounts)
    .set({ tier })
    .where(eq(schema.accounts.clerkUserId, clerkUserId));
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
  }

  const body = await req.text();
  const sig = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      console.error("[stripe/webhook] signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  } else {
    // Dev fallback — parse without verification
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // clerk_user_id is stored in checkout session metadata (set at creation)
        const clerkUserId = session.metadata?.clerk_user_id;

        if (clerkUserId) {
          // Also stash the Stripe customer ID for billing portal later
          if (session.customer && typeof session.customer === "string") {
            await db
              .update(schema.accounts)
              .set({ stripeCustomerId: session.customer })
              .where(eq(schema.accounts.clerkUserId, clerkUserId));
          }
          await updateAccountTier(clerkUserId, "pro");
          console.log(`[stripe] upgraded ${clerkUserId} to pro`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const clerkUserId = sub.metadata?.clerk_user_id;
        if (clerkUserId) {
          await updateAccountTier(clerkUserId, "free");
          console.log(`[stripe] downgraded ${clerkUserId} to free`);
        }
        break;
      }

      default:
        // We ignore events we don't handle
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
