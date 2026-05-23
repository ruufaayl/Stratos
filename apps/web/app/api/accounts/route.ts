/**
 * POST /api/accounts
 * Creates a new AWS account connection for the signed-in user.
 *
 * 1. Validates the IAM role (read-only, cross-account, external ID).
 * 2. Persists the account row to Postgres.
 * 3. Kicks off the first analysis run immediately.
 *
 * GET /api/accounts
 * Returns all accounts belonging to the signed-in user.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "@/lib/db";
import { validateAwsRole, generateExternalId } from "@/lib/aws/connect";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(64),
  roleArn: z
    .string()
    .regex(
      /^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/,
      "Invalid IAM role ARN format",
    ),
  externalId: z.string().min(8),
  region: z.string().default("us-east-1"),
});

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.clerkUserId, userId));

  return NextResponse.json({ accounts });
}

// ---------------------------------------------------------------------------
// POST — create + validate
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, roleArn, externalId, region } = parsed.data;

  // Validate the IAM role before persisting anything
  const validation = await validateAwsRole(roleArn, externalId);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error },
      { status: 422 },
    );
  }

  // Persist account
  const [account] = await db
    .insert(schema.accounts)
    .values({
      clerkUserId: userId,
      name,
      provider: "aws",
      config: {
        roleArn,
        externalId,
        region,
        awsAccountId: validation.accountId,
      },
    })
    .returning();

  return NextResponse.json(
    {
      account,
      awsAccountId: validation.accountId,
      message: `Connected! AWS account ${validation.accountId} linked as "${name}".`,
    },
    { status: 201 },
  );
}
