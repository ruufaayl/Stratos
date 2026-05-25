/**
 * GET /api/digest/cron
 * Vercel cron endpoint — sends weekly digest to all Pro users.
 * Runs every Monday at 09:00 UTC (see vercel.json).
 */

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

import { db, schema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // prevent static prerender at build time
export const maxDuration = 300; // 5 min budget for large user lists

export async function GET(req: Request) {
  // Vercel Cron sends Authorization: Bearer CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find all Pro accounts
  const proAccounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.tier, "pro"));

  const results: { userId: string; status: string }[] = [];

  for (const account of proAccounts) {
    try {
      // Fetch email from Clerk
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(account.clerkUserId);
      const email = user.emailAddresses?.[0]?.emailAddress;

      if (!email) {
        results.push({ userId: account.clerkUserId, status: "no_email" });
        continue;
      }

      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://stratoscloud.io";

      const res = await fetch(`${origin}/api/digest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
        },
        body: JSON.stringify({ userId: account.clerkUserId, email }),
      });

      const data = await res.json() as { sent?: boolean; skipped?: boolean; error?: string };
      results.push({
        userId: account.clerkUserId,
        status: data.sent ? "sent" : data.skipped ? "skipped" : `error: ${data.error}`,
      });
    } catch (err) {
      results.push({
        userId: account.clerkUserId,
        status: `error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  console.log("[digest/cron] results:", results);

  return NextResponse.json({
    processed: results.length,
    results,
  });
}
