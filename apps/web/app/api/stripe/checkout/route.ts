/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for the Pro plan and redirects.
 *
 * Body: { priceId?: string }  — defaults to STRIPE_PRO_PRICE_ID env var.
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { stripe, PLANS } from "@/lib/stripe";

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured — set STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const body = await req.json().catch(() => ({})) as { priceId?: string };
  const priceId = body.priceId ?? PLANS.pro.priceId;

  if (!priceId) {
    return NextResponse.json(
      { error: "No Stripe price ID configured. Set STRIPE_PRO_PRICE_ID." },
      { status: 503 },
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    // Pre-fill email if available
    ...(email ? { customer_email: email } : {}),
    // Stash Clerk userId in metadata so the webhook can find the account
    metadata: { clerk_user_id: userId },
    subscription_data: {
      metadata: { clerk_user_id: userId },
    },
  });

  return NextResponse.json({ url: session.url });
}
