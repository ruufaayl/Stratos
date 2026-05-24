import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Hash-based sigil color from a 7-color palette.
 * Deterministic: same org ID always gets the same color.
 */
function sigilFor(id: string): string {
  const palette = [
    "#6366F1", // intel/indigo
    "#10B981", // savings/emerald
    "#F59E0B", // risk/amber
    "#EF4444", // waste/red
    "#A855F7", // purple
    "#06B6D4", // cyan
    "#EAB308", // yellow
  ];
  let h = 0;
  for (const c of id) h = ((h * 31 + c.charCodeAt(0)) >>> 0);
  return palette[h % palette.length] ?? palette[0]!;
}

export default async function OrgLayout({
  params,
  children,
}: {
  params: { org: string };
  children: React.ReactNode;
}) {
  const { userId, orgId, orgSlug, orgRole } = await auth();

  // Unauthenticated → sign-in
  if (!userId) redirect(`/sign-in?redirect_url=/app/${params.org}`);

  // No active org (user signed in but hasn't activated one) → org creation
  if (!orgId) redirect("/orgs/create");

  // The middleware handles slug mismatch; this is a belt-and-suspenders guard.
  if (orgSlug !== params.org) redirect(`/orgs?error=not-member`);

  const client = await clerkClient();

  const [user, memberships] = await Promise.all([
    client.users.getUser(userId),
    client.users.getOrganizationMembershipList({ userId }),
  ]);

  // rail preference (default: collapsed = false, i.e. expanded by default)
  const initialRailCollapsed =
    typeof user.publicMetadata?.railCollapsed === "boolean"
      ? (user.publicMetadata.railCollapsed as boolean)
      : false;

  const orgs = memberships.data.map((m) => ({
    id: m.organization.id,
    slug: m.organization.slug ?? m.organization.id,
    name: m.organization.name,
    sigilColor: sigilFor(m.organization.id),
  }));

  // v1 stub: clouds always ["aws"] until accounts table is wired (wave 4)
  const available = ["aws"] as const;
  const initialCloud = available[0];

  const activeOrgName =
    memberships.data.find((m) => m.organization.id === orgId)?.organization
      .name ?? params.org;

  return (
    <AppShell
      org={{
        org: {
          id: orgId,
          slug: params.org,
          name: activeOrgName,
          sigilColor: sigilFor(orgId),
        },
        role: ((orgRole?.replace("org:", "") ?? "member") as
          | "owner"
          | "admin"
          | "member"),
        // switchTo is a client-side concern handled by OrgSwitcher navigation
        switchTo: async () => {},
      }}
      orgs={orgs}
      clouds={{ available, initial: initialCloud }}
      initialRailCollapsed={initialRailCollapsed}
    >
      {children}
    </AppShell>
  );
}
