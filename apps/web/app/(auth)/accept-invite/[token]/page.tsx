/**
 * /accept-invite/[token]
 *
 * Landing page for Clerk org invitation links. The [token] segment is the
 * Clerk invitation ticket value that was embedded in the emailed invite URL.
 *
 * Behaviour:
 * - Signed out → show "You've been invited" card with sign-in CTA that
 *   preserves the ticket so Clerk auto-accepts the invitation during auth.
 * - Signed in  → look up this user's pending org invitations, find the org,
 *   and redirect through sign-in with __clerk_ticket so Clerk finalises
 *   membership atomically. On failure, show a friendly error.
 *
 * Why redirect through sign-in even when signed in?
 * The Clerk backend API has no "accept invitation by token" endpoint.
 * Accepting a Clerk org invite requires the ticket to flow through the auth
 * flow — that is Clerk's contract. So we pass __clerk_ticket to /sign-in,
 * which Clerk intercepts and uses to create the membership.
 */

import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthLink } from "@/components/auth/auth-link";
import { Button } from "@/components/ui/button";

type Props = {
  params: { token: string };
};

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = params;
  const { userId } = await auth();

  // ── Signed out: show invite card with sign-in CTA ────────────────────────
  if (!userId) {
    const signInHref = `/sign-in?__clerk_ticket=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent(`/accept-invite/${token}`)}`;
    const signUpHref = `/sign-up?__clerk_ticket=${encodeURIComponent(token)}`;

    return (
      <AuthCard
        title="You've been invited"
        subtitle="Sign in (or create an account) to accept your invitation and join your team on Stratos."
      >
        <Link href={signInHref}>
          <Button className="w-full">Sign in to accept</Button>
        </Link>
        <p className="text-text-faint text-mono-sm text-center mt-2">
          New to Stratos?{" "}
          <AuthLink href={signUpHref}>Create an account</AuthLink>
        </p>
      </AuthCard>
    );
  }

  // ── Signed in: find the pending org invitation and redirect to accept ─────
  try {
    const client = await clerkClient();

    // Look up this user's pending org invitations
    const invitationsResult = await client.users.getOrganizationInvitationList({
      userId,
      status: "pending",
      limit: 100,
    });

    const invitations = invitationsResult.data;

    if (invitations.length === 0) {
      // No pending invitations — the invite may already have been accepted or
      // the token belongs to a different user. Fall through to sign-in with
      // the ticket so Clerk can re-evaluate.
      redirect(
        `/sign-in?__clerk_ticket=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent("/")}`,
      );
    }

    // Use the first pending invitation to find the org slug.
    // (Single-invite flow is the common case. Multi-invite disambiguation
    //  requires storing the token in invitation.publicMetadata — deferred.)
    const invitation = invitations[0]!;

    // publicOrganizationData may hold the slug; fall back to org ID lookup
    const orgSlug =
      invitation.publicOrganizationData?.slug ??
      (await (async () => {
        const org = await client.organizations.getOrganization({
          organizationId: invitation.organizationId,
        });
        return org.slug ?? invitation.organizationId;
      })());

    // Redirect through sign-in with the ticket so Clerk creates the membership
    redirect(
      `/sign-in?__clerk_ticket=${encodeURIComponent(token)}&redirect_url=${encodeURIComponent(`/app/${orgSlug}/welcome`)}`,
    );
  } catch (err: unknown) {
    // Let Next.js redirect errors propagate normally
    if (
      err instanceof Error &&
      (err.message.includes("NEXT_REDIRECT") ||
        err.message.includes("NEXT_NOT_FOUND"))
    ) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : "Could not process invitation";

    // Render a friendly error state
    return (
      <AuthCard title="Invitation error" subtitle={message}>
        <p className="text-text-muted text-sm text-center">
          This invite link may have expired or already been used.
        </p>
        <div className="flex flex-col gap-2 mt-2">
          <Link href="/sign-in">
            <Button className="w-full">Go to sign in</Button>
          </Link>
          <p className="text-text-faint text-mono-sm text-center">
            <AuthLink href="/sign-up">Create a new account</AuthLink>
          </p>
        </div>
      </AuthCard>
    );
  }
}
