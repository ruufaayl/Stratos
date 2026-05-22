/**
 * GET /api/engine/health
 *
 * Server-side proxy to the Python engine's /health. Used as an in-app
 * status indicator without exposing the engine URL to the browser.
 * (The /engine/* rewrite in next.config.mjs is the public path.)
 */

import { NextResponse } from "next/server";

import { engineHealth, EngineError } from "@/lib/engine/client";

export async function GET() {
  try {
    const data = await engineHealth();
    return NextResponse.json(data);
  } catch (err) {
    const status = err instanceof EngineError ? err.status ?? 502 : 502;
    return NextResponse.json(
      { status: "unreachable", error: (err as Error).message },
      { status },
    );
  }
}
