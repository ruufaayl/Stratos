import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, schema } from "@/lib/db";
import { usd } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    return null; // middleware will have redirected; this is belt-and-suspenders
  }

  const userAccounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.clerkUserId, userId));

  const recentRuns =
    userAccounts.length > 0
      ? await db
          .select()
          .from(schema.runs)
          .where(eq(schema.runs.accountId, userAccounts[0]!.id))
          .orderBy(desc(schema.runs.startedAt))
          .limit(5)
      : [];

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-good animate-pulse-dot" />
            <Link href="/" className="text-fg font-semibold">
              Stratos
            </Link>
            <span className="text-fg-subtle text-data-sm font-mono">
              / dashboard
            </span>
          </div>
          <Link
            href="/proof"
            className="text-data-sm font-mono text-fg-muted hover:text-fg"
          >
            public demo →
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Your dashboard</h1>
          <p className="text-fg-muted mt-1">
            Connect a cloud account to see waste analysis on your real
            infrastructure.
          </p>
        </div>

        {userAccounts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect your first account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-fg-muted">
                AWS connection is read-only — Stratos describes your resources
                and pulls CloudWatch metrics, never writes to your account.
                Setup takes under 10 minutes via a cross-account IAM role.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  disabled
                  className="px-4 py-2 rounded-md bg-brand/40 text-fg font-medium cursor-not-allowed"
                  title="Account onboarding ships in Phase 4"
                >
                  Connect AWS account
                </button>
                <Link
                  href="/proof"
                  className="text-data-sm font-mono text-brand hover:text-brand-hover"
                >
                  see the engine running on public data →
                </Link>
              </div>
              <p className="text-xs font-mono text-fg-subtle pt-2 border-t border-border">
                Account onboarding flow ships in Phase 4 (week 11). Until then
                this page is the empty state new users see.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {userAccounts.map((a) => (
                    <li
                      key={a.id}
                      className="flex justify-between items-center py-2 border-b border-border last:border-0"
                    >
                      <span className="text-fg font-medium">{a.name}</span>
                      <span className="text-fg-subtle font-mono text-xs">
                        {a.provider}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent runs</CardTitle>
              </CardHeader>
              <CardContent>
                {recentRuns.length === 0 ? (
                  <div className="text-fg-muted text-sm">No runs yet.</div>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {recentRuns.map((r) => (
                      <li
                        key={r.id}
                        className="flex justify-between items-center py-2 border-b border-border last:border-0"
                      >
                        <span className="text-fg-subtle font-mono text-xs">
                          {new Date(r.startedAt).toLocaleString()}
                        </span>
                        <span className="text-fg tabular">
                          {r.totalMonthlyWaste
                            ? usd(Number(r.totalMonthlyWaste))
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
