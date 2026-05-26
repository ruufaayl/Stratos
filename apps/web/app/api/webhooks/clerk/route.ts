/**
 * POST /api/webhooks/clerk
 * Handles Clerk webhook events. Currently handles user.created → welcome email.
 *
 * Verification: Clerk signs webhook payloads with svix. We verify using
 * CLERK_WEBHOOK_SECRET (set in Clerk dashboard → Webhooks → Signing Secret).
 * In dev, verification is skipped when secret is absent.
 *
 * NOTE: `svix` is not yet in package.json. Until it is installed, signature
 * verification is skipped entirely (see TODO below). To enable:
 *   pnpm add svix --filter web
 * then the verification block below will activate automatically once
 * CLERK_WEBHOOK_SECRET is set.
 *
 * MIDDLEWARE: Ensure /api/webhooks/(.*) is in the public routes list in
 * middleware.ts — Clerk POSTs here with no user session cookie.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";

import { welcomeEmailHtml, welcomeEmailSubject } from "@/lib/email/welcome";

// Route must run in the Node.js runtime to access raw body + svix
export const runtime = "nodejs";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const body = await req.text();

  // Verify svix signature when the secret is present.
  // TODO: `svix` is not yet installed. Run `pnpm add svix --filter web` to
  // enable signature verification. Until then this block is unreachable in
  // production (CLERK_WEBHOOK_SECRET will not be set without svix).
  if (webhookSecret) {
    try {
      // Dynamic import so the build doesn't hard-fail when svix is absent.
      // @ts-expect-error — svix not yet in package.json; run `pnpm add svix --filter web`
      const { Webhook } = await import("svix") as { Webhook: new (secret: string) => { verify(body: string, headers: Record<string, string>): void } };
      const wh = new Webhook(webhookSecret);
      const headers = {
        "svix-id": req.headers.get("svix-id") ?? "",
        "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
        "svix-signature": req.headers.get("svix-signature") ?? "",
      };
      wh.verify(body, headers);
    } catch (err) {
      console.error("[clerk-webhook] signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body) as typeof event;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const userData = event.data;
    const email = (
      userData.email_addresses as Array<{ email_address: string }>
    )?.[0]?.email_address;
    const firstName = userData.first_name as string | undefined;

    if (email && resend) {
      try {
        await resend.emails.send({
          from: "Stratos <hello@stratos.ai>",
          to: email,
          subject: welcomeEmailSubject,
          html: welcomeEmailHtml({ firstName }),
        });
        console.log(`[clerk-webhook] Welcome email sent to ${email}`);
      } catch (err) {
        // Non-fatal: email failure should not block webhook acknowledgement.
        // Clerk will not retry on a 200, so we log and move on.
        console.error("[clerk-webhook] Failed to send welcome email:", err);
      }
    } else if (!resend) {
      console.warn("[clerk-webhook] RESEND_API_KEY not set — welcome email skipped.");
    }
  }

  return NextResponse.json({ received: true });
}
