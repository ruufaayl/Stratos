import { PulseStrip } from "@/components/dashboard/pulse-strip";

const KIND_LABELS: Record<string, string> = {
  idle: "Idle",
  rightsize: "Rightsize",
  anomaly: "Anomaly",
  commitment: "Commitment",
  zombie: "Zombie",
};

const KIND_COLORS: Record<string, string> = {
  idle:       "text-waste-400",
  rightsize:  "text-intel-400",
  anomaly:    "text-risk-400",
  commitment: "text-savings-400",
  zombie:     "text-text-muted",
};

interface KindBreakdown {
  kind: string;
  count: number;
  savings: number;
}

interface PulseTabProps {
  /** Total monthly waste in USD from the latest run. */
  totalMonthlyWaste: number;
  /** Number of resources scanned in the latest run. */
  resourceCount: number;
  /** Sum of monthlySavings for findings where appliedAt IS NOT NULL, in USD. */
  realizedSavings: number;
  /** Per-kind breakdown of findings for the latest run. */
  kindBreakdown: KindBreakdown[];
}

/**
 * Pulse tab — top-line waste metrics + kind breakdown grid.
 * Wave 1 simplifications:
 *   runRate = waste + realizedSavings (no real billing data yet)
 *   forecastQuarter = waste * 3 (linear extrapolation)
 */
export function PulseTab({ totalMonthlyWaste, resourceCount, realizedSavings, kindBreakdown }: PulseTabProps) {
  const runRate = totalMonthlyWaste + realizedSavings;
  const forecastQuarter = totalMonthlyWaste * 3;

  return (
    <div className="space-y-6">
      <PulseStrip
        runRate={runRate}
        waste={totalMonthlyWaste}
        realizedSavings={realizedSavings}
        forecastQuarter={forecastQuarter}
      />

      {kindBreakdown.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {kindBreakdown.map((k) => (
            <div
              key={k.kind}
              className="bg-bg-elevated border border-border-subtle rounded-xl px-4 py-3 space-y-1"
            >
              <div className={`font-mono uppercase text-[10px] tracking-widest ${KIND_COLORS[k.kind] ?? "text-text-muted"}`}>
                {KIND_LABELS[k.kind] ?? k.kind}
              </div>
              <div className="text-text-primary font-semibold tabular-nums text-lg">
                {k.count}
              </div>
              <div className="text-text-faint text-xs tabular-nums">
                ${k.savings.toFixed(0)}/mo
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-faint text-center">
        Based on {resourceCount.toLocaleString()}&nbsp;resource
        {resourceCount !== 1 ? "s" : ""} scanned
      </p>
    </div>
  );
}
