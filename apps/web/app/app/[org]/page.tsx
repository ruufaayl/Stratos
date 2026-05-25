import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
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

  // Count runs across all accounts in this org
  const runCount = await db
    .select({ id: schema.runs.id })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  if (runCount.length === 0) {
    // No runs yet — show "Scan queued" for each account
    return <ScanQueuedView accounts={accountList} orgSlug={params.org} />;
  }

  // TODO(D4): runs exist — render the real overview tabs (Pulse / Feed / Cost Map / Forecast).
  // For now, fall through to the existing placeholder.
  return (
    <div className="p-8">
      <div className="text-text-faint text-mono-sm font-mono mb-2">
        SHELL · READY
      </div>
      <h1 className="text-h2 text-text-primary">Shell mounted</h1>
      <p className="text-text-muted mt-2">
        Sub-project C complete. Next: wave 1 — sign-up → org-create → welcome
        wizard → first finding.
      </p>
    </div>
  );
}
