/**
 * POST /api/billing/portal
 * Creates a Stripe billing portal session and returns the URL.
 */
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { stripe } from "@/lib/stripe";
import { db, schema } from "@/lib/db";
import { checkRateLimit, rateLimitExceededResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST() {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: "No active org" }, { status: 400 });

  const rl = await checkRateLimit(`portal:${orgId}`, 10, 3600); // 10/hour/org
  if (!rl.allowed) return rateLimitExceededResponse(rl.reset);

  if (!stripe) return NextResponse.json({ error: "Billing not configured." }, { status: 503 });

  // Find stripeCustomerId from any account row for this org
  const rows = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  const stripeCustomerId = rows[0]?.stripeCustomerId;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No billing account. Please subscribe first." },
      { status: 404 }
    );
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/app`;
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
