import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";

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

// Matches /app/[org] and all sub-paths
const isAppOrg = createRouteMatcher(["/app/:orgSlug(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // 1. Public routes pass through unconditionally
  if (isPublic(req)) return;

  // 2. All non-public routes require auth
  const { userId, orgId, orgSlug } = await auth();
  if (!userId) {
    const url = new URL("/sign-in", req.url);
    url.searchParams.set("redirect_url", req.url);
    return NextResponse.redirect(url);
  }

  // 3. /app/[org]/* gating
  if (isAppOrg(req)) {
    // Extract the URL's org slug from the path: /app/<urlSlug>/...
    const pathSegments = req.nextUrl.pathname.split("/");
    // pathSegments = ["", "app", "<urlSlug>", ...]
    const urlSlug = pathSegments[2];

    if (!urlSlug) {
      // Malformed path — redirect to orgs list
      return NextResponse.redirect(new URL("/orgs", req.url));
    }

    // Slug mismatch: active org in Clerk session doesn't match the URL slug.
    // Check if the user is a member of the org whose slug matches the URL.
    if (orgSlug !== urlSlug) {
      const client = await clerkClient();

      // Fetch the user's memberships to check if they belong to the URL's org
      const memberships = await client.users.getOrganizationMembershipList({
        userId,
      });

      const matchingMembership = memberships.data.find(
        (m) => m.organization.slug === urlSlug,
      );

      if (!matchingMembership) {
        // User is not a member of this org — redirect with error
        return NextResponse.redirect(
          new URL("/orgs?error=not-member", req.url),
        );
      }

      // User IS a member but has a different active org — set active org via Clerk
      // and redirect to same URL so the session refreshes with the correct org context.
      await client.users.updateUser(userId, {
        // NOTE: Clerk v6 doesn't expose a direct "setActiveOrganization" on the server;
        // the active org is determined by the session token. The proper flow is to use
        // Clerk's client-side setActive() or redirect through Clerk's org selection flow.
        // For v1, we redirect to /orgs with a hint so the client can pick up from there.
        // TODO (wave 1 — org flow): implement server-side org activation or handle this
        // cleanly with Clerk's organization session switching.
      });

      // Redirect to the same URL — the layout's belt-and-suspenders guard will
      // catch any remaining mismatch and redirect to /orgs.
      return NextResponse.redirect(new URL(req.url));
    }

    // TODO (wave 1 — welcome wizard): check for connected cloud via publicMetadata.hasConnectedCloud
    // or accounts table. Skip for v1 to avoid redirect loops before the welcome wizard exists.
    // When wave 1 lands, add:
    //   const hasCloud = user.publicMetadata?.hasConnectedCloud === true;
    //   const isWelcomeOrConnect = /\/(welcome|integrations\/connect)/.test(req.nextUrl.pathname);
    //   if (!hasCloud && !isWelcomeOrConnect) {
    //     return NextResponse.redirect(new URL(`/app/${urlSlug}/welcome`, req.url));
    //   }
  }
});

export const config = {
  // Run on everything except static files + Next internals.
  // /__clerk/(.*) is required for Clerk's dev-browser sync & handshake.
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)", "/__clerk/(.*)"],
};
