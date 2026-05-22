/**
 * POST /api/explain
 *
 * Send a list of opportunities to Claude for plain-English summaries.
 * The engine numbers are passed verbatim and CHECKED on the way back —
 * if the model returns an explanation that contradicts the input numbers
 * we drop it rather than ship a hallucinated figure.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { explainOpportunities } from "@/lib/ai/explain";
import { opportunity } from "@/lib/engine/types";

const requestSchema = z.object({
  opportunities: z.array(opportunity).max(50),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("unauthorized", { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  try {
    const explanations = await explainOpportunities(parsed.data.opportunities);
    return NextResponse.json({ explanations });
  } catch (err) {
    const message = err instanceof Error ? err.message : "explain failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
