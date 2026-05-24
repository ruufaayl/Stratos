import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/orgs/[orgId]/clouds
 *
 * Returns the list of connected cloud providers for the given org.
 *
 * v1 stub: always returns ["aws"].
 * TODO (wave 4 — org/billing): query accounts table grouped by provider
 *   e.g. SELECT DISTINCT provider FROM accounts WHERE org_id = $1
 *   and return the resulting array.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json({ clouds: ["aws"] });
}
