import { z } from "zod";

import { env } from "@/lib/env";
import { opportunity } from "./types";

// /proof/synthetic adds a few proof-specific fields on top of /analyze.
export const proofResponse = z.object({
  resource_count: z.number(),
  opportunity_count: z.number(),
  total_monthly_waste: z.number(),
  opportunities: z.array(opportunity),
  daily_cost_series: z.array(z.number()),
  planted_anomaly_days: z.array(z.number()),
  forecast: z.object({
    horizon: z.number(),
    z: z.number(),
    forecast: z.array(z.number()),
    upper: z.array(z.number()),
    lower: z.array(z.number()),
    projected_quarter_total: z.number(),
    uncertainty_at_horizon: z.number(),
  }),
  source: z.string(),
});

export type ProofResponse = z.infer<typeof proofResponse>;

export async function fetchSyntheticProof(): Promise<ProofResponse> {
  const res = await fetch(`${env.ENGINE_URL}/proof/synthetic`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`engine /proof/synthetic returned ${res.status}`);
  }
  return proofResponse.parse(await res.json());
}
