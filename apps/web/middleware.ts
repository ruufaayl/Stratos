import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes (no auth required). Everything else is gated.
const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing",                // pricing is public (CTA gates work without auth)
  "/proof(.*)",              // the public demo page is intentionally open
  "/engine/health",          // pass-through to engine health probe
  "/api/stripe/webhook",     // Stripe POSTs here with no Clerk session
  "/api/digest(.*)",         // Vercel Cron + per-user digest hits, auth via CRON_SECRET
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;
  const { userId } = await auth();
  if (!userId) {
    // Explicit redirect — auth.protect() rewrites to a 404 in keyless mode,
    // which is technically protected but a terrible UX.
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(url);
  }
});

export const config = {
  // Run on everything except static files + Next internals.
  // /__clerk/(.*) is required for Clerk's dev-browser sync & handshake.
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/__clerk/(.*)"],
};
