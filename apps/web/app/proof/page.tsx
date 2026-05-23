import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CostMap } from "@/components/dashboard/cost-map";
import { OpportunityFeed } from "@/components/dashboard/opportunity-feed";
import { PulseStrip } from "@/components/dashboard/pulse-strip";
import { ForecastCone } from "@/components/dashboard/forecast-cone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveScanTicker } from "@/components/dashboard/live-scan-ticker";
import { fetchSyntheticProof } from "@/lib/engine/proof";
import { usd } from "@/lib/utils";

// The proof page is intentionally public — no auth gate (see middleware.ts).
// We re-fetch on every request so a stranger always sees the live engine output.
export const dynamic = "force-dynamic";

export default async function ProofPage() {
  let data;
  try {
    data = await fetchSyntheticProof();
  } catch (err) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <div className="text-bad text-data-sm font-mono">engine unreachable</div>
          <div className="text-fg-muted">
            The Stratos engine isn&apos;t responding. Start it locally with{" "}
            <code className="bg-bg-subtle px-1.5 py-0.5 rounded font-mono text-sm">
              pnpm engine:dev
            </code>
            .
          </div>
          <div className="text-fg-subtle text-sm font-mono">
            {err instanceof Error ? err.message : "unknown error"}
          </div>
        </div>
      </main>
    );
  }

  // Build the Pulse numbers from real engine output.
  const dailyAvg =
    data.daily_cost_series.reduce((a, b) => a + b, 0) /
    Math.max(1, data.daily_cost_series.length);
  const runRate = dailyAvg * 30;
  const realizedSavings = 0; // demo data has no actioned savings
  const sparklines = {
    runRate: data.daily_cost_series.slice(-30),
    waste: Array.from({ length: 30 }, (_, i) =>
      data.total_monthly_waste * (0.6 + 0.4 * (i / 29)),
    ),
    realizedSavings: Array.from({ length: 30 }, () => 0),
    forecastQuarter: data.forecast.forecast.slice(0, 30),
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-good animate-pulse-dot" />
            <Link href="/" className="text-fg font-semibold">
              Stratos
            </Link>
            <span className="text-fg-subtle text-data-sm font-mono">
              / proof
            </span>
          </div>
          <div className="flex items-center gap-4 text-data-sm font-mono">
            <SignedOut>
              <Link
                href="/sign-up"
                className="text-brand hover:text-brand-hover"
              >
                connect your account →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-fg-muted hover:text-fg">
                dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Hero headline */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-fg-muted text-data-sm font-mono uppercase tracking-wide">
              Live demo · {data.source}
            </div>
            <LiveScanTicker />
          </div>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Stratos found{" "}
            <span className="text-bad tabular">
              {usd(data.total_monthly_waste, { compact: true })}
            </span>{" "}
            of monthly waste
          </h1>
          <p className="text-fg-muted text-lg">
            Analyzed {data.resource_count} VMs in milliseconds.
            Surfaced {data.opportunity_count} ranked, dollar-quantified opportunities.
            All math is computed by Python — never invented by an LLM.
          </p>
        </section>

        {/* Zone A — Pulse */}
        <section>
          <PulseStrip
            runRate={runRate}
            waste={data.total_monthly_waste}
            realizedSavings={realizedSavings}
            forecastQuarter={data.forecast.projected_quarter_total}
            sparklines={sparklines}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Zone B — Feed */}
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-fg font-medium">Opportunities</h2>
              <span className="text-fg-subtle text-data-sm font-mono tabular">
                {data.opportunity_count} ranked by $/mo
              </span>
            </div>
            <OpportunityFeed opportunities={data.opportunities} />
          </section>

          {/* Right column: Cost Map + Forecast */}
          <section className="space-y-4">
            {/* Zone C — Cost Map */}
            <Card>
              <CardHeader>
                <CardTitle>Cost map</CardTitle>
              </CardHeader>
              <CardContent>
                <CostMap nodes={data.cost_map} />
                <div className="mt-3 flex items-center justify-between text-xs font-mono text-fg-subtle">
                  <span>area = monthly cost</span>
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-sm bg-good" /> efficient
                    <span className="size-2 rounded-sm bg-warn ml-2" /> risky
                    <span className="size-2 rounded-sm bg-bad ml-2" /> wasteful
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Zone D — Forecast cone */}
            <Card>
              <CardHeader>
                <CardTitle>Spend forecast (90 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ForecastCone
                  history={data.daily_cost_series}
                  forecast={data.forecast.forecast}
                  upper={data.forecast.upper}
                  lower={data.forecast.lower}
                  anomalyDays={data.planted_anomaly_days}
                />
                <div className="mt-3 grid grid-cols-2 gap-3 text-data-sm">
                  <div>
                    <div className="text-fg-subtle font-mono uppercase text-xs">
                      Quarter projection
                    </div>
                    <div className="tabular text-fg">
                      {usd(data.forecast.projected_quarter_total)}
                    </div>
                  </div>
                  <div>
                    <div className="text-fg-subtle font-mono uppercase text-xs">
                      Uncertainty @ T
                    </div>
                    <div className="tabular text-fg">
                      ±{usd(data.forecast.uncertainty_at_horizon)}/day
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-fg-subtle text-xs font-mono">
                  Confidence band widens with √t (uncertainty compounds).
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>The math</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-fg-muted">
                <p>
                  <span className="text-fg font-medium">Python owns truth.</span>{" "}
                  The engine computes every dollar figure deterministically. The
                  LLM only writes prose — never numbers.
                </p>
                <p>
                  <span className="text-fg font-medium">No black boxes.</span>{" "}
                  Each opportunity ships with its risk score, the percentile of
                  demand it&apos;s based on, and the exact engine input.
                </p>
                <p className="text-xs font-mono pt-2 border-t border-border">
                  Engine:{" "}
                  <a
                    href="/engine/health"
                    className="text-brand hover:text-brand-hover underline underline-offset-4"
                  >
                    /engine/health
                  </a>
                </p>
              </CardContent>
            </Card>
          </section>
        </div>

        <footer className="text-center text-fg-subtle text-xs font-mono py-8 border-t border-border">
          Real engine output. Deterministic synthetic fleet. Numbers reproduce on
          every reload — that&apos;s the whole point.
        </footer>
      </div>
    </main>
  );
}
