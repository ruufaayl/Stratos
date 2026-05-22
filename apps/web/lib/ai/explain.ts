/**
 * Brain 3 — the reasoning layer (ENGINE.md §7).
 *
 * Claude turns the engine's numbers into human language. Per architecture law,
 * Claude NEVER alters a figure. The system prompt forbids recomputation; if
 * the model produces a different number than the engine returned, the API
 * route discards the explanation rather than ship it.
 *
 * Model: claude-sonnet-4-6 (latest Sonnet) for explanations. We deliberately
 * use a fixed prompt-cache prefix so per-opportunity calls are cheap.
 */

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";
import type { Opportunity } from "@/lib/engine/types";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — set it in .env.local");
  }
  if (_client === null) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const MODEL = "claude-sonnet-4-6";

// Cached system prompt — same on every call so the prefix is reused.
// Prompt caching: this block is marked ephemeral so Anthropic reuses it.
const SYSTEM_PROMPT = `You are a FinOps advisor inside Stratos. You receive
pre-computed cost-optimization opportunities with EXACT dollar figures and
risk scores. Your job is to turn those numbers into one short, decision-ready
explanation per opportunity.

ABSOLUTE RULES — these are not suggestions:
1. NEVER alter, recompute, round, or estimate any number. Quote figures
   verbatim from the input.
2. NEVER invent a metric, threshold, or risk score not present in the input.
3. Each opportunity gets at most three sentences:
   - First sentence: the action (what to change), with the dollar headline.
   - Second sentence: the evidence in one phrase ("peaks at 38% CPU", etc.).
   - Third sentence (optional): the risk in human terms.
4. No fluff. A CTO reads this in 10 seconds. No "I recommend", no apologies,
   no caveats unless the engine risk score is >= 0.8 — then explicitly call
   it out as "needs human review".
5. Reply with a JSON array of {resource_id, explanation} objects, one per
   opportunity, same order as input. No prose around the JSON.`;

export interface OpportunityExplanation {
  resource_id: string;
  explanation: string;
}

/**
 * Explain a batch of opportunities. Returns one explanation per input,
 * preserving order. Throws on any failure (no silent fallback to a number-
 * inventing model output).
 */
export async function explainOpportunities(
  opps: Opportunity[],
): Promise<OpportunityExplanation[]> {
  if (opps.length === 0) return [];

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Opportunities:\n${JSON.stringify(opps, null, 2)}`,
      },
    ],
  });

  // Extract text content
  const text = msg.content
    .filter((c) => c.type === "text")
    .map((c) => (c as { text: string }).text)
    .join("\n")
    .trim();

  // The model is instructed to return ONLY a JSON array.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `Claude returned non-JSON explanation. Got:\n${text.slice(0, 300)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error("explanation payload was not an array");
  }

  // Validate shape; verify resource_id alignment as best we can.
  return parsed.map((row, i): OpportunityExplanation => {
    if (
      typeof row !== "object" ||
      row === null ||
      typeof (row as Record<string, unknown>).explanation !== "string"
    ) {
      throw new Error(`explanation #${i} malformed`);
    }
    const r = row as { resource_id?: string; explanation: string };
    return {
      resource_id: r.resource_id ?? extractResourceId(opps[i]) ?? `idx-${i}`,
      explanation: r.explanation,
    };
  });
}

function extractResourceId(opp: Opportunity | undefined): string | undefined {
  if (!opp) return undefined;
  if ("resource_id" in opp) return opp.resource_id;
  return undefined;
}
