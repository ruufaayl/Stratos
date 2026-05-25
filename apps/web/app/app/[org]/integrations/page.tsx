// apps/web/app/app/[org]/integrations/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { Empty } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";
import { usd } from "@/lib/utils";

function IntegrationsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="h-28 bg-bg-elevated rounded-xl" />
      ))}
    </div>
  );
}

async function IntegrationsContent({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.accounts.createdAt));

  if (accounts.length === 0) {
    return (
      <Empty
        title="No accounts connected"
        body="Connect an AWS account to start scanning for waste."
        action={
          <Link
            href={`/app/${orgSlug}/welcome`}
            className="inline-flex items-center justify-center gap-2 font-medium h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong transition-colors"
          >
            Connect account
          </Link>
        }
      />
    );
  }

  // For each account, get its latest run
  const accountsWithRuns = await Promise.all(
    accounts.map(async (account) => {
      const runs = await db
        .select({
          id: schema.runs.id,
          status: schema.runs.status,
          finishedAt: schema.runs.finishedAt,
          opportunityCount: schema.runs.opportunityCount,
          totalMonthlyWaste: schema.runs.totalMonthlyWaste,
        })
        .from(schema.runs)
        .where(eq(schema.runs.accountId, account.id))
        .orderBy(desc(schema.runs.finishedAt))
        .limit(1);
      return { account, latestRun: runs[0] ?? null };
    }),
  );

  type LatestRun = (typeof accountsWithRuns)[0]["latestRun"];

  function statusChip(run: LatestRun) {
    if (!run) return <Chip kind="neutral">Never scanned</Chip>;
    if (run.status === "running") return <Chip kind="neutral">Scanning…</Chip>;
    if (run.status === "succeeded") return <Chip kind="savings">Succeeded</Chip>;
    return <Chip kind="waste">Failed</Chip>;
  }

  function lastScanned(run: LatestRun) {
    if (!run?.finishedAt) return "Never";
    const diff = Date.now() - run.finishedAt.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return run.finishedAt.toLocaleDateString("en-US", { dateStyle: "medium" });
  }

  return (
    <div className="space-y-3">
      {accountsWithRuns.map(({ account, latestRun }) => (
        <div
          key={account.id}
          className="bg-bg-elevated border border-border-subtle rounded-xl px-5 py-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-text-primary font-medium text-sm">
                {account.name}
              </div>
              <div className="text-text-faint font-mono text-xs mt-0.5">
                {account.region}
              </div>
            </div>
            {statusChip(latestRun)}
          </div>

          <div className="flex items-center gap-6 text-xs text-text-muted">
            <span>
              Last scan:{" "}
              <span className="text-text-primary">{lastScanned(latestRun)}</span>
            </span>
            {latestRun?.status === "succeeded" && (
              <>
                <span>
                  Findings:{" "}
                  <span className="text-text-primary">
                    {latestRun.opportunityCount ?? 0}
                  </span>
                </span>
                <span>
                  Waste:{" "}
                  <span className="text-waste-300 font-semibold">
                    {usd(Number(latestRun.totalMonthlyWaste ?? 0))}/mo
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      ))}

      <div className="pt-2">
        <Link
          href={`/app/${orgSlug}/welcome`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          + Add another account
        </Link>
      </div>
    </div>
  );
}

export default async function IntegrationsPage({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}/integrations`);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · INTEGRATIONS
      </div>
      <Suspense fallback={<IntegrationsSkeleton />}>
        <IntegrationsContent orgId={orgId} orgSlug={params.org} />
      </Suspense>
    </div>
  );
}
