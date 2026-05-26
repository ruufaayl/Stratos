/**
 * Billing gate — check if an org has an active Pro subscription.
 * Tier is stored on the accounts table, written by the Stripe webhook.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type Tier = "free" | "pro";

export async function checkOrgTier(orgId: string): Promise<Tier> {
  const rows = await db
    .select({ tier: schema.accounts.tier })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);
  return ((rows[0]?.tier ?? "free") as Tier);
}
