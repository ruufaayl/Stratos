import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, count, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { checkOrgTier } from "@/lib/billing/gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  const tier = await checkOrgTier(orgId);
  const FREE_SCAN_LIMIT = 10;

  if (tier === "pro") {
    return NextResponse.json({ tier: "pro", scansUsed: null, scansLimit: null });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const result = await db
    .select({ count: count() })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        gte(schema.runs.startedAt, startOfMonth),
        lte(schema.runs.startedAt, endOfMonth),
        eq(schema.runs.status, "succeeded"),
      )
    );

  const scansUsed = result[0]?.count ?? 0;
  return NextResponse.json({ tier: "free", scansUsed, scansLimit: FREE_SCAN_LIMIT });
}
