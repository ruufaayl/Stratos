import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

// Cap requests so a runaway client can't blow up the DB / serverless quota.
const MAX_IDS = 200;

const PatchBody = z.object({
  ids: z.array(z.string().uuid()).min(1).max(MAX_IDS),
  action: z.enum(["apply", "dismiss", "undo_apply", "undo_dismiss"]),
});

export async function PATCH(req: Request) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { ids, action } = parsed.data;

  // Find which of the requested IDs actually belong to this org by joining
  // through accounts. Any ID not present here is silently skipped — preventing
  // org A from mutating org B's data through a guessed UUID.
  const ownedRows = await db
    .select({ id: schema.opportunities.id })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(and(
      eq(schema.accounts.orgId, orgId),
      inArray(schema.opportunities.id, ids),
    ));

  const ownedIds = ownedRows.map((r) => r.id);
  const skipped = ids.length - ownedIds.length;

  if (ownedIds.length === 0) {
    return NextResponse.json({ updated: 0, skipped });
  }

  const now = new Date();
  const update =
    action === "apply"        ? { appliedAt: now }   :
    action === "dismiss"      ? { dismissedAt: now } :
    action === "undo_apply"   ? { appliedAt: null }  :
                                { dismissedAt: null };

  await db
    .update(schema.opportunities)
    .set(update)
    .where(inArray(schema.opportunities.id, ownedIds));

  return NextResponse.json({ updated: ownedIds.length, skipped });
}
