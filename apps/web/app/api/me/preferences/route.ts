import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.railCollapsed !== "boolean") return new NextResponse("Bad request", { status: 400 });

  await (await clerkClient()).users.updateUserMetadata(userId, {
    publicMetadata: { railCollapsed: body.railCollapsed },
  });
  return new NextResponse(null, { status: 204 });
}
