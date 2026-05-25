import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { Chip } from "@/components/ui/chip";

export default async function SettingsPage({
  params,
}: {
  params: { org: string };
}) {
  const { userId, orgId, orgRole } = await auth();
  if (!userId || !orgId) {
    redirect(`/sign-in?return_to=/app/${params.org}/settings`);
  }

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });

  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.accounts.createdAt));

  const role = (orgRole?.replace("org:", "") ?? "member") as
    | "owner"
    | "admin"
    | "member";
  const roleChipKind: "savings" | "neutral" =
    role === "owner" ? "savings" : "neutral";

  function maskArn(arn: string | null): string {
    if (!arn) return "—";
    // arn:aws:iam::123456789012:role/StratosRole → arn:aws:iam::***:role/StratosRole
    return arn.replace(/::(\d+):/, "::***:");
  }

  function lastScanned(date: Date | null): string {
    if (!date) return "Never";
    const diff = Date.now() - date.getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", { dateStyle: "medium" });
  }

  const orgSlug = org.slug ?? params.org;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div className="font-mono text-[11px] text-text-faint">
        STRATOS · SETTINGS
      </div>

      {/* Organization */}
      <section className="space-y-4">
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-widest">
          Organization
        </h2>
        <div className="bg-bg-elevated border border-border-subtle rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-primary font-medium">{org.name}</div>
              <div className="text-text-faint font-mono text-xs mt-0.5">
                /{orgSlug}
              </div>
            </div>
            <Chip kind={roleChipKind}>{role}</Chip>
          </div>
          {role === "owner" || role === "admin" ? (
            <a
              href="https://dashboard.clerk.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-intel-400 hover:text-intel-300 transition-colors"
            >
              Manage members ↗
            </a>
          ) : null}
        </div>
      </section>

      {/* Connected accounts */}
      <section className="space-y-4">
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-widest">
          Connected accounts
        </h2>
        {accounts.length === 0 ? (
          <div className="bg-bg-elevated border border-border-subtle rounded-xl px-5 py-4 text-text-muted text-sm">
            No accounts connected.{" "}
            <Link
              href={`/app/${params.org}/welcome`}
              className="text-intel-400 hover:text-intel-300 transition-colors"
            >
              Connect one →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="bg-bg-elevated border border-border-subtle rounded-xl px-5 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-text-primary text-sm font-medium">
                      {account.name}
                    </div>
                    <div className="text-text-faint font-mono text-xs mt-0.5">
                      {account.region}
                    </div>
                  </div>
                  <Chip kind="savings">{account.provider}</Chip>
                </div>
                <div className="mt-2 space-y-1 text-xs text-text-muted">
                  <div>
                    Role:{" "}
                    <span className="font-mono text-text-faint">
                      {maskArn(account.roleArn)}
                    </span>
                  </div>
                  <div>
                    Last scanned:{" "}
                    <span className="text-text-primary">
                      {lastScanned(account.lastScanAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <Link
              href={`/app/${params.org}/welcome`}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors pt-1"
            >
              + Add another account
            </Link>
          </div>
        )}
      </section>

      {/* Billing */}
      <section className="space-y-4">
        <h2 className="text-text-primary font-semibold text-sm uppercase tracking-widest">
          Billing
        </h2>
        <div className="bg-bg-elevated border border-border-subtle rounded-xl px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-text-primary font-medium text-sm">
                Free plan
              </div>
              <div className="text-text-faint text-xs mt-0.5">
                1 account · 1 scan/day · unlimited findings
              </div>
            </div>
            <a
              href="#"
              className="inline-flex items-center justify-center h-8 px-3 text-[12px] font-medium rounded border border-intel-700 text-intel-400 hover:bg-intel-950 transition-colors"
            >
              Upgrade
            </a>
          </div>
          <p className="text-xs text-text-faint">
            Stripe billing activates at first revenue milestone. Pricing will be
            usage-based.
          </p>
        </div>
      </section>
    </div>
  );
}
