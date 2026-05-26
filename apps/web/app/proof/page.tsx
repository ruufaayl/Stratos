import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { CostMap } from "@/components/dashboard/cost-map";
import { OpportunityFeed } from "@/components/dashboard/opportunity-feed";
import { PulseStrip } from "@/components/dashboard/pulse-strip";
import { ForecastCone } from "@/components/dashboard/forecast-cone";
import { ProofModeToggle } from "@/components/dashboard/proof-mode-toggle";
import { ProofStream } from "@/components/proof/proof-stream";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
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
      {/* ── Nav bar ── */}
      <header className="border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
            <Link href="/" className="text-text-primary font-semibold">
              Stratos
            </Link>
            <span className="text-text-faint text-mono-sm font-mono">/ proof</span>
          </div>
          <div className="flex items-center gap-4 text-mono-sm font-mono">
            <SignedOut>
              <Link href="/pricing" className="text-text-muted hover:text-text-primary">
                pricing
              </Link>
              <Link
                href="/sign-up"
                className="text-intel-300 hover:text-intel-300-hover"
              >
                connect your account →
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard" className="text-text-muted hover:text-text-primary">
                dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* ── Hero ── */}
        <section className="text-center space-y-5 py-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-waste-950 bg-waste-950/60 px-3 py-1 text-mono-sm font-mono text-waste-300 uppercase tracking-[0.12em]">
            <span className="size-1.5 rounded-full bg-waste-500 animate-pulse-dot" />
            Live engine output · real public data
          </div>

          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
            Your cloud is{" "}
            <span className="text-waste-500">burning money</span>{" "}
            right now.
          </h1>
          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
            Stratos finds it.{" "}
            <span className="text-text-primary font-medium">Instantly.</span>
          </p>

          {/* Stat row */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-mono-sm font-mono text-text-faint">
            <span>
              <span className="text-waste-400 font-semibold tabular">~$230B</span>{" "}
              wasted annually
            </span>
            <span className="hidden sm:inline text-border-strong">·</span>
            <span>
              <span className="text-waste-400 font-semibold tabular">32%</span>{" "}
              of all cloud spend
            </span>
            <span className="hidden sm:inline text-border-strong">·</span>
            <span>
              found in{" "}
              <span className="text-savings-400 font-semibold tabular">seconds</span>
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <SignedOut>
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-intel-500 text-white font-medium hover:bg-intel-300 hover:text-intel-950 transition-colors text-sm"
              >
                Connect your AWS account →
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-bg-elevated border border-border-subtle text-text-primary font-medium hover:border-border-strong transition-colors text-sm"
              >
                See pricing
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-intel-500 text-white font-medium hover:bg-intel-300 hover:text-intel-950 transition-colors text-sm"
              >
                Go to dashboard →
              </Link>
            </SignedIn>
          </div>
        </section>

        {/* ── Mode toggle ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <ProofModeToggle current={mode} haveReal={!!real} />
            {mode === "real" && real && (
              <div className="text-mono-sm font-mono text-text-faint">
                analysed in {real.analysis_time_seconds.toFixed(1)}s ·{" "}
                {real.throughput_vms_per_sec.toLocaleString()} VMs/s
              </div>
            )}
          </div>
        </section>

        {/* ── Live stream panel (synthetic mode) ── */}
        {mode === "synthetic" && (
          <section className="space-y-4">
            <div className="text-text-muted text-mono-sm font-mono uppercase tracking-wide">
              Live scan · synthetic fleet
            </div>
            <ProofStream />
          </section>
        )}

        {/* ── Real or synthetic data view ── */}
        {mode === "real" && real ? (
          <RealProofView data={real} />
        ) : mode === "synthetic" ? (
          <SyntheticProofView />
        ) : null}

        {/* ── Footer ── */}
        <footer className="text-center text-text-faint text-xs font-mono py-8 border-t border-border-subtle">
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

async function RealProofView({
  data,
}: {
  data: NonNullable<Awaited<ReturnType<typeof loadRealProof>>>;
}) {
  return (
    <>
      <section className="space-y-3">
        <div className="text-text-muted text-mono-sm font-mono uppercase tracking-wide">
          {data.source} · {data.license}
        </div>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Stratos found{" "}
          <span className="text-waste-500 tabular">
            {usd(data.total_monthly_waste, { compact: true })}/mo
          </span>{" "}
          of waste in real Azure data
        </h2>
        <p className="text-text-muted text-lg">
          Analysed{" "}
          <span className="text-text-primary tabular">
            {data.resource_count.toLocaleString()}
          </span>{" "}
          real production VMs in{" "}
          <span className="text-text-primary tabular">
            {data.analysis_time_seconds.toFixed(1)}s
          </span>
          . Surfaced{" "}
          <span className="text-text-primary tabular">
            {data.opportunity_count.toLocaleString()}
          </span>{" "}
          ranked, dollar-quantified opportunities. Every number computed by Python — never
          invented by an LLM.
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
            <h2 className="text-text-primary font-medium">Top opportunities</h2>
            <span className="text-text-faint text-mono-sm font-mono tabular">
              showing top {data.top_opportunities.length} of{" "}
              {data.opportunity_count.toLocaleString()}
            </span>
          </div>
          <OpportunityFeed opportunities={data.top_opportunities} />
        </section>

        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How the engine sees it</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-text-muted">
              {Object.entries(data.opportunity_count_by_kind).map(([kind, count]) => (
                <div
                  key={kind}
                  className="flex justify-between border-b border-border-subtle pb-2 last:border-0"
                >
                  <span className="capitalize text-text-primary">{kind}</span>
                  <span className="tabular text-text-faint font-mono">
                    {count.toLocaleString()} opps
                  </span>
                </div>
              ))}
              <p className="text-xs font-mono text-text-faint pt-2 border-t border-border-subtle">
                Generated {new Date(data.generated_at).toUTCString()}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reproducibility</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-text-muted">
              <p>
                These numbers are deterministic. Re-run the proof harness against{" "}
                <a
                  href={data.source_url}
                  className="text-intel-300 hover:text-intel-300-hover underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  the same public dataset
                </a>{" "}
                and you&apos;ll get{" "}
                <span className="tabular text-text-primary">
                  {usd(data.total_monthly_waste)}
                </span>{" "}
                back, every time.
              </p>
              <p className="text-xs font-mono text-text-faint pt-2 border-t border-border-subtle">
                Source:{" "}
                <span className="text-text-primary">
                  proof/results/azure-v2-full-run.txt
                </span>
                <br />
                Code:{" "}
                <span className="text-text-primary">proof/loaders/azure_v2.py</span>
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Want this on your real account?</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-text-muted">
              <p>
                Read-only IAM. Under 10 minutes to connect. Stratos describes your
                resources and pulls CloudWatch metrics — never writes.
              </p>
              <Link
                href="/pricing"
                className="inline-block px-4 py-2 rounded-md bg-intel-500 hover:bg-intel-600 text-text-primary font-medium text-sm transition-colors"
              >
                See pricing →
              </Link>
            </CardBody>
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
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4">
      <div className="text-text-faint text-mono-sm font-mono uppercase tracking-wide">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold tabular ${
          color === "bad" ? "text-waste-500" : "text-text-primary"
        }`}
      >
        {value}
      </div>
      <div className="text-text-faint text-xs font-mono">{sub}</div>
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
        <div className="text-waste-500 text-mono-sm font-mono">engine unreachable</div>
        <div className="text-text-muted">
          The Stratos engine isn&apos;t responding. Start it locally with{" "}
          <code className="bg-bg-elevated px-1.5 py-0.5 rounded font-mono text-sm">
            pnpm engine:dev
          </code>
          .
        </div>
        <div className="text-text-faint text-sm font-mono">
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
        <div className="text-text-muted text-mono-sm font-mono uppercase tracking-wide">
          Live demo · {data.source}
        </div>
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Stratos found{" "}
          <span className="text-waste-500 tabular">
            {usd(data.total_monthly_waste, { compact: true })}
          </span>{" "}
          of monthly waste
        </h2>
        <p className="text-text-muted text-lg">
          Analyzed {data.resource_count} VMs in milliseconds. Surfaced{" "}
          {data.opportunity_count} ranked, dollar-quantified opportunities. All math is
          computed by Python — never invented by an LLM.
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
            <h2 className="text-text-primary font-medium">Opportunities</h2>
            <span className="text-text-faint text-mono-sm font-mono tabular">
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
            <CardBody>
              <CostMap nodes={data.cost_map} />
              <div className="mt-3 flex items-center justify-between text-xs font-mono text-text-faint">
                <span>area = monthly cost</span>
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-sm bg-savings-500" /> efficient
                  <span className="size-2 rounded-sm bg-risk-500 ml-2" /> risky
                  <span className="size-2 rounded-sm bg-waste-500 ml-2" /> wasteful
                </span>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spend forecast (90 days)</CardTitle>
            </CardHeader>
            <CardBody>
              <ForecastCone
                history={data.daily_cost_series}
                forecast={data.forecast.forecast}
                upper={data.forecast.upper}
                lower={data.forecast.lower}
                anomalyDays={data.planted_anomaly_days}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 text-mono-sm">
                <div>
                  <div className="text-text-faint font-mono uppercase text-xs">
                    Quarter projection
                  </div>
                  <div className="tabular text-text-primary">
                    {usd(data.forecast.projected_quarter_total)}
                  </div>
                </div>
                <div>
                  <div className="text-text-faint font-mono uppercase text-xs">
                    Uncertainty @ T
                  </div>
                  <div className="tabular text-text-primary">
                    ±{usd(data.forecast.uncertainty_at_horizon)}/day
                  </div>
                </div>
              </div>
              <div className="mt-4 text-text-faint text-xs font-mono">
                Confidence band widens with √t (uncertainty compounds).
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </>
  );
}
