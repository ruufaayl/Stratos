/**
 * Real-data proof summary loader.
 *
 * The Stratos engine was run once against the full Azure Public Dataset V2
 * vmtable.csv (248,458 long-lived production VMs). The full output is too
 * large to ship in HTML on every page render, so we ship a compact summary
 * JSON (top 50 opportunities + aggregate counts) committed to the repo at
 * apps/web/public/proof/azure-v2-summary.json.
 *
 * The page renders the headline (deterministic, identical to what the
 * engine computes on re-run), plus the top 50 cards. The full result
 * archive lives in proof/results/azure-v2-full-run.txt — committed to repo.
 *
 * To regenerate: run
 *   engine\.venv\Scripts\python -m proof.run_proof ^
 *     --azure-vmtable data/azure/vmtable.csv ^
 *     --emit-summary apps/web/public/proof/azure-v2-summary.json
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

import { opportunity } from "./types";

export const realProofSummary = z.object({
  source: z.string(),
  source_url: z.string(),
  license: z.string(),
  generated_at: z.string(),
  resource_count: z.number(),
  opportunity_count: z.number(),
  total_monthly_waste: z.number(),
  annual_waste: z.number(),
  analysis_time_seconds: z.number(),
  throughput_vms_per_sec: z.number(),
  avg_savings_per_vm: z.number(),
  opportunity_count_by_kind: z.record(z.string(), z.number()),
  top_opportunities: z.array(opportunity),
});

export type RealProofSummary = z.infer<typeof realProofSummary>;

/**
 * Read the static summary JSON committed to /public/proof/.
 * Returns null if the file is missing (proof hasn't been regenerated).
 */
export async function loadRealProof(): Promise<RealProofSummary | null> {
  try {
    const p = join(process.cwd(), "public", "proof", "azure-v2-summary.json");
    const raw = await readFile(p, "utf8");
    return realProofSummary.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
