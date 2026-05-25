import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 });
  }

  // Join opportunities → accounts so we can filter by orgId without
  // exposing opportunities from other orgs.
  const rows = await db
    .select({ opp: schema.opportunities })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(eq(schema.accounts.orgId, orgId))
    .orderBy(desc(schema.opportunities.createdAt))
    .limit(50);

  return NextResponse.json({ findings: rows.map((r) => r.opp) });
}
