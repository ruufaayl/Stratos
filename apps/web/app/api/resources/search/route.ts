// apps/web/app/api/resources/search/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/resources/search?org=<orgSlug>&q=<query>
 *
 * Stub: returns empty results for v1.
 * Real implementation ships when the Resources screen is built.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(req.url);
  const org = searchParams.get("org");
  const q = searchParams.get("q");

  if (!org || !q) {
    return new NextResponse("Missing required params: org, q", { status: 400 });
  }

  // TODO: Query resources table when Resources screen ships.
  return NextResponse.json({ results: [] });
}
