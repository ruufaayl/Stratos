import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { sigilColorFromString } from "@/components/auth/sigil-picker";

/**
 * Compute the display sigil color for an org.
 * Prefers org.publicMetadata.sigilColor, falls back to hash-from-id.
 */
function resolveColor(orgId: string, meta: Record<string, unknown>): string {
  if (typeof meta.sigilColor === "string" && meta.sigilColor) {
    return meta.sigilColor;
  }
  return sigilColorFromString(orgId);
}

export default async function OrgsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { userId } = await auth();
  // Layout already guards auth, but be defensive
  if (!userId) redirect("/sign-in?return_to=/orgs");

  const client = await clerkClient();
  const membershipsRes = await client.users.getOrganizationMembershipList({
    userId,
  });
  const memberships = membershipsRes.data;

  // TODO: pull pending invitations when Clerk SDK exposes user invitations
  const pendingInviteCount = 0;

  // Routing shortcuts
  if (memberships.length === 0 && pendingInviteCount === 0) {
    redirect("/orgs/create");
  }
  if (memberships.length === 1 && pendingInviteCount === 0) {
    const slug = memberships[0]!.organization.slug ?? memberships[0]!.organization.id;
    redirect(`/app/${slug}`);
  }

  const notMemberError = searchParams.error === "not-member";

  return (
    <div className="w-full max-w-[480px] space-y-4">
      {notMemberError && (
        <div className="rounded-md border border-waste-500 bg-waste-500/10 px-4 py-3 text-sm text-text-primary">
          You are not a member of that organization.
        </div>
      )}

      <h1 className="text-h2 text-text-primary font-semibold">
        Your organizations
      </h1>

      <div className="space-y-3">
        {memberships.map((m) => {
          const org = m.organization;
          const slug = org.slug ?? org.id;
          const color = resolveColor(
            org.id,
            (org.publicMetadata ?? {}) as Record<string, unknown>,
          );

          return (
            <div
              key={org.id}
              className="flex items-center gap-4 rounded-card border border-border-subtle bg-bg-elevated p-4"
            >
              {/* Sigil swatch */}
              <div
                className="size-10 flex-shrink-0 rounded-md"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />

              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium truncate">
                  {org.name}
                </p>
                <p className="text-text-faint font-mono text-xs truncate">
                  {slug}
                </p>
              </div>

              <Link
                href={`/app/${slug}`}
                className="flex-shrink-0 rounded px-3 py-1.5 text-sm font-medium bg-intel-500/10 text-intel-400 hover:bg-intel-500/20 transition-colors"
              >
                Open
              </Link>
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <Link
          href="/orgs/create"
          className="text-sm text-text-muted hover:text-text-primary transition-colors"
        >
          + Create another organization
        </Link>
      </div>
    </div>
  );
}
