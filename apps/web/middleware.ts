import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes (no auth required). Everything else is gated.
const isPublic = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/proof(.*)",       // the public demo page is intentionally open
  "/engine/health",   // pass-through to engine health probe
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) {
    await auth.protect();
  }
});

export const config = {
  // Run on everything except static files + Next internals.
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
