import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isReservedSlug, isValidSlugFormat } from "@/lib/auth/reserved-slugs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const sigilColor = String(body.sigilColor ?? "#6366F1");

  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!isValidSlugFormat(slug)) {
    return NextResponse.json({ error: "slug invalid format" }, { status: 400 });
  }
  if (isReservedSlug(slug)) {
    return NextResponse.json({ error: "slug reserved" }, { status: 400 });
  }

  const client = await clerkClient();
  const org = await client.organizations.createOrganization({
    name,
    slug,
    createdBy: userId,
    publicMetadata: { sigilColor },
  });

  return NextResponse.json({ orgSlug: org.slug });
}
