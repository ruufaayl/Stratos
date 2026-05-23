/**
 * POST /api/digest
 * Sends the weekly digest email to a single user.
 *
 * Body: { userId: string }
 *
 * In production this is called by a Vercel cron job (vercel.json) once a week.
 * It can also be called ad-hoc (e.g., triggered immediately after a run).
 *
 * Authorization: requires CRON_SECRET header (set in env) to prevent
 * unauthenticated triggering. The header check is bypassed in dev.
 */

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { eq, desc } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { renderDigestHtml, renderDigestText } from "@/lib/email/digest";
import type { DigestData, DigestOpportunity } from "@/lib/email/digest";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(req: Request) {
  // Auth gate
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && process.env.NODE_ENV === "production") {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!resend) {
    return NextResponse.json(
      { error: "RESEND_API_KEY not configured." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({})) as { userId?: string; email?: string };
  const { userId, email } = body;
  if (!userId || !email) {
    return NextResponse.json(
      { error: "userId and email are required." },
      { status: 400 },
    );
  }

  // Load the user's most recent account + last run + top opportunities
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.clerkUserId, userId))
    .limit(1);

  if (!accounts[0]) {
    return NextResponse.json({ error: "No accounts found for user." }, { status: 404 });
  }

  const account = accounts[0];

  const recentRuns = await db
    .select()
    .from(schema.runs)
    .where(eq(schema.runs.accountId, account.id))
    .orderBy(desc(schema.runs.startedAt))
    .limit(1);

  if (!recentRuns[0]) {
    return NextResponse.json({ skipped: true, reason: "No runs yet." });
  }

  const run = recentRuns[0];

  const rawOpps = await db
    .select()
    .from(schema.opportunities)
    .where(eq(schema.opportunities.runId, run.id))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(5);

  const topOpportunities: DigestOpportunity[] = rawOpps.map((o) => ({
    kind: o.kind,
    resourceId: o.resourceId,
    monthlySavings: o.monthlySavings,
    explanation: o.explanation,
  }));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://stratoscloud.io";

  const digestData: DigestData = {
    userEmail: email,
    totalMonthlyWaste: Number(run.totalMonthlyWaste ?? 0),
    opportunityCount: run.opportunityCount ?? 0,
    accountName: account.name,
    topOpportunities,
    runDate: run.startedAt.toISOString(),
    dashboardUrl: `${origin}/dashboard`,
  };

  const { data, error } = await resend.emails.send({
    from: "Stratos <digest@stratoscloud.io>",
    to: email,
    subject: `Your cloud wasted ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(digestData.totalMonthlyWaste)} this month — ${account.name}`,
    html: renderDigestHtml(digestData),
    text: renderDigestText(digestData),
  });

  if (error) {
    console.error("[digest] resend error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sent: true, emailId: data?.id });
}
