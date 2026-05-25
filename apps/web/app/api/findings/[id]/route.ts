import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db";

const PatchBody = z.object({
  action: z.enum(["apply", "dismiss", "undo_apply", "undo_dismiss"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { userId, orgId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!orgId) return NextResponse.json({ error: "No active organization" }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  // Verify the finding belongs to this org via INNER JOIN
  const rows = await db
    .select({ id: schema.opportunities.id })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(and(
      eq(schema.opportunities.id, params.id),
      eq(schema.accounts.orgId, orgId),
    ))
    .limit(1);

  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date();
  const { action } = parsed.data;

  const update =
    action === "apply"        ? { appliedAt: now }  :
    action === "dismiss"      ? { dismissedAt: now } :
    action === "undo_apply"   ? { appliedAt: null }  :
                                { dismissedAt: null };

  await db
    .update(schema.opportunities)
    .set(update)
    .where(eq(schema.opportunities.id, params.id));

  return NextResponse.json({ ok: true });
}
