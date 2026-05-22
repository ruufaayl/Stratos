import { env } from "@/lib/env";
import { analyzeResponse, type AnalyzeRequest, type AnalyzeResponse } from "./types";

export class EngineError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "EngineError";
  }
}

/** POST /analyze on the FastAPI engine. Validates the response with Zod. */
export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const url = `${env.ENGINE_URL}/analyze`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Wire shared secret; engine can verify in middleware later.
      "X-Engine-Key": env.ENGINE_API_KEY,
    },
    body: JSON.stringify(req),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new EngineError(
      `engine returned ${res.status}: ${text || res.statusText}`,
      res.status,
    );
  }
  const json = await res.json();
  return analyzeResponse.parse(json);
}

/** GET /health — cheap liveness probe for the engine. */
export async function engineHealth(): Promise<{
  status: string;
  version: string;
  uptime_s: number;
}> {
  const res = await fetch(`${env.ENGINE_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new EngineError(`engine /health: ${res.status}`);
  return res.json();
}
