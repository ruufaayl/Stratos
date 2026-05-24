import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { postAuthRedirectFor } from "@/lib/auth/post-auth-redirect";

/**
 * /post-auth — membership-aware post-authentication redirect.
 *
 * Clerk is configured with afterSignInUrl="/post-auth" and
 * afterSignUpUrl="/post-auth" so every successful auth lands here.
 *
 * Logic (delegated to postAuthRedirectFor):
 *  - returnTo param present → honour it (internal paths only)
 *  - 0 orgs  → /orgs/create
 *  - 1 org   → /app/<slug>
 *  - N orgs  → /orgs
 *
 * This is a server component with no UI — it exists purely to
 * perform the server-side redirect.
 */
export default async function PostAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const { userId } = await auth();

  // Gate: must be authenticated (middleware already enforces this, but
  // belt-and-suspenders for any misconfigured public-route list).
  if (!userId) {
    redirect("/sign-in");
  }

  const { return_to: returnTo } = await searchParams;
  const destination = await postAuthRedirectFor(userId, returnTo);
  redirect(destination);
}
