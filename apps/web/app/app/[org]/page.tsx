import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

// ---------------------------------------------------------------------------
// ScanQueuedView — shown when accounts exist but no engine runs yet
// ---------------------------------------------------------------------------

type AccountSummary = {
  id: string;
  name: string;
  awsAccountId: string | null;
  region: string;
  status: string;
};

function ScanQueuedView({
  accounts,
}: {
  accounts: AccountSummary[];
  orgSlug: string;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
      <div className="text-mono-sm font-mono text-text-faint">
        STRATOS · OVERVIEW
      </div>
      <h1 className="text-h2 text-text-primary">Scan queued</h1>
      <p className="text-text-muted">
        Stratos has connected{" "}
        {accounts.length === 1
          ? "your AWS account"
          : `your ${accounts.length} AWS accounts`}
        . The engine will analyze your resources shortly. You&apos;ll see findings
        here when the first scan completes.
      </p>
      <div className="grid gap-3">
        {accounts.map((a) => (
          <Card key={a.id}>
            <CardBody className="flex items-center justify-between">
              <div>
                <div className="text-text-primary font-medium">{a.name}</div>
                <div className="text-text-faint text-mono-sm font-mono">
                  AWS {a.awsAccountId ?? "—"} · {a.region}
                </div>
              </div>
              <Chip kind={a.status === "validated" ? "savings" : "neutral"}>
                {a.status === "validated" ? "Connected" : a.status}
              </Chip>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScanCompleteView — shown when at least one scan run exists
// ---------------------------------------------------------------------------

type Finding = {
  id: string;
  kind: string;
  resourceId: string | null;
  monthlySavings: string;
  risk: string | null;
};

type RunSummary = {
  totalMonthlyWaste: string | null;
  opportunityCount: number | null;
  resourceCount: number | null;
  finishedAt: Date | null;
};

const KIND_LABEL: Record<string, string> = {
  idle: "Idle resource",
  rightsize: "Oversized",
  anomaly: "Anomaly",
  commitment: "Reserved instance",
  zombie: "Zombie resource",
};

function ScanCompleteView({
  run,
  topFindings,
}: {
  run: RunSummary;
  topFindings: Finding[];
}) {
  const totalSavings = Math.round(Number(run.totalMonthlyWaste ?? 0));
  const findingCount = run.opportunityCount ?? 0;
  const resourceCount = run.resourceCount ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="text-mono-sm font-mono text-text-faint">STRATOS · OVERVIEW</div>

      {/* Headline metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <p className="text-text-faint text-xs mb-1">Monthly savings found</p>
            <p className="text-2xl font-bold text-savings-500">
              ${totalSavings.toLocaleString()}/mo
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-text-faint text-xs mb-1">Optimizations</p>
            <p className="text-2xl font-bold text-text-primary">{findingCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-text-faint text-xs mb-1">Resources scanned</p>
            <p className="text-2xl font-bold text-text-primary">{resourceCount}</p>
          </CardBody>
        </Card>
      </div>

      {/* Top findings */}
      {topFindings.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-h3 text-text-primary">Top findings</h2>
          <div className="grid gap-3">
            {topFindings.map((f) => {
              const savings = Math.round(Number(f.monthlySavings));
              const riskNum = f.risk !== null ? Number(f.risk) : null;
              const confidence =
                riskNum !== null ? Math.round((1 - riskNum) * 100) : null;

              return (
                <Card key={f.id}>
                  <CardBody className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Chip kind="waste">
                        {KIND_LABEL[f.kind] ?? f.kind}
                      </Chip>
                      <span className="text-text-muted font-mono text-sm truncate">
                        {f.resourceId ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {confidence !== null && (
                        <span className="text-xs text-text-faint">
                          {confidence}% confident
                        </span>
                      )}
                      <span className="text-savings-500 font-semibold tabular-nums">
                        ${savings.toLocaleString()}/mo
                      </span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
          {findingCount > topFindings.length && (
            <p className="text-text-faint text-xs text-center">
              Showing top {topFindings.length} of {findingCount} findings
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-text-muted text-sm">
          No waste found yet — check back after 24 hours of data collection.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrgRoot({
  params,
}: {
  params: { org: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}`);

  const accounts = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  // No connected accounts yet — send to the welcome wizard
  if (accounts.length === 0) redirect(`/app/${params.org}/welcome`);

  // Load full account list for this org
  const accountList = await db
    .select({
      id: schema.accounts.id,
      name: schema.accounts.name,
      awsAccountId: schema.accounts.awsAccountId,
      region: schema.accounts.region,
      status: schema.accounts.status,
    })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId));

  // Find the most recent successful run for this org
  const recentRuns = await db
    .select({
      id: schema.runs.id,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
      resourceCount: schema.runs.resourceCount,
      finishedAt: schema.runs.finishedAt,
    })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.runs.finishedAt))
    .limit(1);

  if (recentRuns.length === 0) {
    // No runs yet — show "Scan queued" for each account
    return <ScanQueuedView accounts={accountList} orgSlug={params.org} />;
  }

  const latestRun = recentRuns[0]!;

  // Load top 5 findings for the latest run, ordered by savings desc
  const topFindings = await db
    .select({
      id: schema.opportunities.id,
      kind: schema.opportunities.kind,
      resourceId: schema.opportunities.resourceId,
      monthlySavings: schema.opportunities.monthlySavings,
      risk: schema.opportunities.risk,
    })
    .from(schema.opportunities)
    .where(eq(schema.opportunities.runId, latestRun.id))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(5);

  return <ScanCompleteView run={latestRun} topFindings={topFindings} />;
}
