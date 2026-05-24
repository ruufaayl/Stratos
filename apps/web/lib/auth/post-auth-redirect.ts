import { clerkClient } from "@clerk/nextjs/server";

/**
 * Determine where to send a freshly-authenticated user.
 *
 * Priority:
 *  1. Explicit `returnTo` path  — honoured if it starts with "/"
 *  2. No orgs             → /orgs/create   (new user onboarding)
 *  3. Exactly one org     → /app/<slug>     (direct into their workspace)
 *  4. Multiple orgs       → /orgs           (org picker)
 */
export async function postAuthRedirectFor(
  userId: string,
  returnTo?: string,
): Promise<string> {
  // 1. Honour explicit return path (must be internal — starts with "/")
  if (returnTo && returnTo.startsWith("/")) return returnTo;

  // 2. Resolve via membership list
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({
    userId,
  });
  const orgs = memberships.data;

  if (orgs.length === 0) return "/orgs/create";
  if (orgs.length === 1) return `/app/${orgs[0].organization.slug}`;
  return "/orgs";
}
