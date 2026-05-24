import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isReservedSlug, isValidSlugFormat } from "@/lib/auth/reserved-slugs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();

  if (!isValidSlugFormat(slug)) {
    return NextResponse.json({ ok: false, reason: "format" });
  }
  if (isReservedSlug(slug)) {
    return NextResponse.json({ ok: false, reason: "reserved" });
  }

  const client = await clerkClient();
  const existing = await client.organizations.getOrganizationList({
    query: slug,
    limit: 5,
  });
  // Clerk does fuzzy search — filter to exact slug match
  const taken = existing.data.some((o) => o.slug?.toLowerCase() === slug);
  if (taken) return NextResponse.json({ ok: false, reason: "taken" });

  return NextResponse.json({ ok: true });
}
