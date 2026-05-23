import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CostMap } from "@/components/dashboard/cost-map";
import { OpportunityFeed } from "@/components/dashboard/opportunity-feed";
import { PulseStrip } from "@/components/dashboard/pulse-strip";
import { ForecastCone } from "@/components/dashboard/forecast-cone";
import { LiveScanTicker } from "@/components/dashboard/live-scan-ticker";
import { ProofModeToggle } from "@/components/dashboard/proof-mode-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchSyntheticProof } from "@/lib/engine/proof";
import { loadRealProof } from "@/lib/engine/real-proof";
import { usd } from "@/lib/utils";

// Public — no auth gate (see middleware.ts). Re-render on every request.
export const dynamic = "force-dynamic";

type SearchParams = { mode?: string };

export default async function ProofPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const real = await loadRealProof();
  // Default to real when available — that's the headline we want strangers
  // to see on first visit. Explicit ?mode=synthetic flips to the live engine.
  const mode: "real" | "synthetic" =
    searchParams.mode === "synthetic" || !real ? "synthetic" : "real";

  return (
    <main className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-good animate-pulse-dot" />
            <Link href="/" className="text-fg font-semibold">
              Stratos
            </Link>
            <span className="text-fg-subtle text-data-sm font-mono">/ proof</span>
          </div>
          <div className="flex items-center gap-4 text-data-sm font-mono">
            <SignedOut>
              <Link href="/pricing" className="text-fg-muted hover:text-fg">pricing</Link>
              <Link href="/sign-up" className="text-brand hover:text-brand-hover">
                connect your account →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-fg-muted hover:text-fg">dashboard</Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <ProofModeToggle current={mode} haveReal={!!real} />
            {mode === "synthetic" && <LiveScanTicker />}
            {mode === "real" && real && (
              <div className="text-data-sm font-mono text-fg-subtle">
                analysed in {real.analysis_time_seconds.toFixed(1)}s · {real.throughput_vms_per_sec.toLocaleString()} VMs/s
              </div>
            )}
          </div>
        </section>

        {mode === "real" && real ? (
          <RealProofView data={real} />
        ) : (
          <SyntheticProofView />
        )}

        <footer className="text-center text-fg-subtle text-xs font-mono py-8 border-t border-border">
          Real engine output. Python owns truth — every dollar reproduces.
          Source data and methodology in PROVENANCE.md (open source).
        </footer>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// REAL — static summary from full Azure run (the HN headline)
// ---------------------------------------------------------------------------

async function RealProofView({ data }: { data: NonNullable<Awaited<ReturnType<typeof loadRealProof>>> }) {
  return (
    <>
      <section className="space-y-3">
        <div className="text-fg-muted text-data-sm font-mono uppercase tracking-wide">
          {data.source} · {data.license}
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Stratos found{" "}
          <span className="text-bad tabular">
            {usd(data.total_monthly_waste, { compact: true })}/mo
          </span>{" "}
          of waste in real Azure data
        </h1>
        <p className="text-fg-muted text-lg">
          Analysed{" "}
          <span className="text-fg tabular">{data.resource_count.toLocaleString()}</span>{" "}
          real production VMs in{" "}
          <span className="text-fg tabular">{data.analysis_time_seconds.toFixed(1)}s</span>.
          Surfaced{" "}
          <span className="text-fg tabular">{data.opportunity_count.toLocaleString()}</span>{" "}
          ranked, dollar-quantified opportunities. Every number computed by Python — never invented by an LLM.
        </p>

        {/* Four stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <StatTile
            label="Monthly waste"
            value={usd(data.total_monthly_waste, { compact: true })}
            sub="identified"
            color="bad"
          />
          <StatTile
            label="Annualised"
            value={usd(data.annual_waste, { compact: true })}
            sub="if not actioned"
            color="bad"
          />
          <StatTile
            label="VMs analysed"
            value={data.resource_count.toLocaleString()}
            sub="real production"
          />
          <StatTile
            label="Avg / VM"
            value={`${usd(data.avg_savings_per_vm)}/mo`}
            sub="over-provisioned"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-fg font-medium">Top opportunities</h2>
            <span className="text-fg-subtle text-data-sm font-mono tabular">
              showing top {data.top_opportunities.length} of {data.opportunity_count.toLocaleString()}
            </span>
          </div>
          <OpportunityFeed opportunities={data.top_opportunities} />
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How the engine sees it</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-fg-muted">
              {Object.entries(data.opportunity_count_by_kind).map(([kind, count]) => (
                <div key={kind} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <span className="capitalize text-fg">{kind}</span>
                  <span className="tabular text-fg-subtle font-mono">
                    {count.toLocaleString()} opps
                  </span>
                </div>
              ))}
              <p className="text-xs font-mono text-fg-subtle pt-2 border-t border-border">
                Generated {new Date(data.generated_at).toUTCString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reproducibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-fg-muted">
              <p>
                These numbers are deterministic. Re-run the proof harness
                against{" "}
                <a
                  href={data.source_url}
                  className="text-brand hover:text-brand-hover underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  the same public dataset
                </a>{" "}
                and you&apos;ll get{" "}
                <span className="tabular text-fg">{usd(data.total_monthly_waste)}</span>{" "}
                back, every time.
              </p>
              <p className="text-xs font-mono text-fg-subtle pt-2 border-t border-border">
                Source: <span className="text-fg">proof/results/azure-v2-full-run.txt</span>
                <br />
                Code: <span className="text-fg">proof/loaders/azure_v2.py</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Want this on your real account?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-fg-muted">
              <p>
                Read-only IAM. Under 10 minutes to connect. Stratos describes
                your resources and pulls CloudWatch metrics — never writes.
              </p>
              <Link
                href="/pricing"
                className="inline-block px-4 py-2 rounded-md bg-brand hover:bg-brand-hover text-fg font-medium text-sm transition-colors"
              >
                See pricing →
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}

function StatTile({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color?: "bad";
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-raised p-4">
      <div className="text-fg-subtle text-data-sm font-mono uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tabular ${
          color === "bad" ? "text-bad" : "text-fg"
        }`}
      >
        {value}
      </div>
      <div className="text-fg-subtle text-xs font-mono">{sub}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SYNTHETIC — live engine roundtrip (the deterministic 10-VM fleet)
// ---------------------------------------------------------------------------

async function SyntheticProofView() {
  let data;
  try {
    data = await fetchSyntheticProof();
  } catch (err) {
    return (
      <div className="text-center space-y-3 py-20">
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
    );
  }

  // Build Pulse numbers from engine output
  const dailyAvg =
    data.daily_cost_series.reduce((a, b) => a + b, 0) /
    Math.max(1, data.daily_cost_series.length);
  const runRate = dailyAvg * 30;
  const sparklines = {
    runRate: data.daily_cost_series.slice(-30),
    waste: Array.from({ length: 30 }, (_, i) =>
      data.total_monthly_waste * (0.6 + 0.4 * (i / 29)),
    ),
    realizedSavings: Array.from({ length: 30 }, () => 0),
    forecastQuarter: data.forecast.forecast.slice(0, 30),
  };

  return (
    <>
      <section className="space-y-3">
        <div className="text-fg-muted text-data-sm font-mono uppercase tracking-wide">
          Live demo · {data.source}
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Stratos found{" "}
          <span className="text-bad tabular">
            {usd(data.total_monthly_waste, { compact: true })}
          </span>{" "}
          of monthly waste
        </h1>
        <p className="text-fg-muted text-lg">
          Analyzed {data.resource_count} VMs in milliseconds. Surfaced{" "}
          {data.opportunity_count} ranked, dollar-quantified opportunities. All
          math is computed by Python — never invented by an LLM.
        </p>
      </section>

      <section>
        <PulseStrip
          runRate={runRate}
          waste={data.total_monthly_waste}
          realizedSavings={0}
          forecastQuarter={data.forecast.projected_quarter_total}
          sparklines={sparklines}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-fg font-medium">Opportunities</h2>
            <span className="text-fg-subtle text-data-sm font-mono tabular">
              {data.opportunity_count} ranked by $/mo
            </span>
          </div>
          <OpportunityFeed opportunities={data.opportunities} />
        </section>

        <section className="space-y-4">
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
        </section>
      </div>
    </>
  );
}
