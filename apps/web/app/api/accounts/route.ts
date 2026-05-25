/**
 * POST /api/accounts
 * Creates a new AWS account connection for the active organisation.
 *
 * 1. Auth gate — must be signed in with an active org.
 * 2. Admin gate — only org owners and admins can connect accounts.
 * 3. Validates the IAM role (read-only, cross-account, org-scoped external ID).
 * 4. Persists the account row to Postgres.
 *
 * GET /api/accounts
 * Returns all accounts belonging to the active organisation.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { validateAwsRole } from "@/lib/aws/connect";
import { externalIdForOrg } from "@/lib/aws/external-id";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(64),
  roleArn: z.string().regex(
    /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/,
    "Invalid IAM role ARN format",
  ),
  region: z.string().default("us-east-1"),
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
  const { userId, orgId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Active organization required." }, { status: 400 });
  }

  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId));

  return NextResponse.json({ accounts });
}

// ---------------------------------------------------------------------------
// POST — create + validate
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!orgId) {
    return NextResponse.json({ error: "Active organization required." }, { status: 400 });
  }

  // Admin gate: only owners and admins may connect accounts
  const role = orgRole?.replace("org:", "") ?? "member";
  if (role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Admin role required." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, roleArn, region } = parsed.data;

  // Derive the org-scoped external ID server-side (confused-deputy protection)
  const externalId = externalIdForOrg(orgId);

  // Validate the IAM role before persisting anything
  const validation = await validateAwsRole(roleArn, externalId);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  // Persist account using dedicated columns (not the config jsonb blob)
  const rows = await db
    .insert(schema.accounts)
    .values({
      orgId,
      clerkUserId: userId,
      name,
      provider: "aws",
      roleArn,
      externalId,
      region,
      awsAccountId: validation.accountId,
      status: "validated",
    })
    .returning();

  const account = rows[0];
  if (!account) {
    return NextResponse.json({ error: "Failed to persist account." }, { status: 500 });
  }

  return NextResponse.json({
    account: {
      id: account.id,
      awsAccountId: account.awsAccountId,
      name: account.name,
      region: account.region,
      status: account.status,
    },
  });
}
