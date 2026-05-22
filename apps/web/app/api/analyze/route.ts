/**
 * POST /api/analyze
 *
 * Glue between the web app and the Python engine. Persists raw engine math
 * to Postgres, then asynchronously enriches with Claude explanations.
 *
 * Architecture law: engine.monthly_savings is the source of truth and is
 * NEVER mutated by the LLM. The `explanation` column is the only thing
 * Claude writes.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { analyze } from "@/lib/engine/client";
import { db, schema } from "@/lib/db";
import { analyzeRequest } from "@/lib/engine/types";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new NextResponse("invalid JSON", { status: 400 });
  }

  // accountId is required so opportunities are scoped properly.
  const accountId = req.headers.get("x-account-id");
  if (!accountId) {
    return new NextResponse("missing X-Account-Id header", { status: 400 });
  }

  const reqParsed = analyzeRequest.safeParse(body);
  if (!reqParsed.success) {
    return NextResponse.json(
      { error: "bad request", issues: reqParsed.error.issues },
      { status: 400 },
    );
  }

  const startedAt = new Date();

  // Insert a `runs` row up front; we update it when the engine returns.
  const [run] = await db
    .insert(schema.runs)
    .values({ accountId, startedAt, status: "running" })
    .returning({ id: schema.runs.id });
  if (!run) {
    return new NextResponse("failed to create run", { status: 500 });
  }

  try {
    const result = await analyze(reqParsed.data);

    // Persist opportunities. Use SQL string for numeric to keep precision.
    if (result.opportunities.length > 0) {
      await db.insert(schema.opportunities).values(
        result.opportunities.map((o) => {
          const resourceId =
            "resource_id" in o && typeof o.resource_id === "string"
              ? o.resource_id
              : null;
          return {
            runId: run.id,
            accountId,
            kind: o.kind,
            resourceId,
            monthlySavings: String(o.monthly_savings),
            risk: o.risk !== undefined ? String(o.risk) : null,
            engineData: o,
          };
        }),
      );
    }

    await db
      .update(schema.runs)
      .set({
        finishedAt: new Date(),
        status: "succeeded",
        totalMonthlyWaste: String(result.total_monthly_waste),
        resourceCount: result.resource_count,
        opportunityCount: result.opportunity_count,
        engineRaw: result as Record<string, unknown>,
      })
      .where(eq(schema.runs.id, run.id));

    return NextResponse.json({ runId: run.id, ...result });
  } catch (err) {
    await db
      .update(schema.runs)
      .set({ finishedAt: new Date(), status: "failed" })
      .where(eq(schema.runs.id, run.id));
    const message = err instanceof Error ? err.message : "unknown engine error";
    return NextResponse.json({ runId: run.id, error: message }, { status: 502 });
  }
}

// Drizzle equality helper — small local import to avoid a top-level
// dependency churn; the `eq` function is widely used elsewhere too.
import { eq } from "drizzle-orm";
