import { PulseStrip } from "@/components/dashboard/pulse-strip";

interface PulseTabProps {
  /** Total monthly waste in USD from the latest run. */
  totalMonthlyWaste: number;
  /** Number of resources scanned in the latest run. */
  resourceCount: number;
  /** Sum of monthlySavings for findings where appliedAt IS NOT NULL, in USD. */
  realizedSavings: number;
}

/**
 * Pulse tab — top-line waste metrics. Forwards to PulseStrip.
 * Wave 1 simplifications:
 *   runRate = waste + realizedSavings (no real billing data yet)
 *   forecastQuarter = waste * 3 (linear extrapolation)
 */
export function PulseTab({ totalMonthlyWaste, resourceCount, realizedSavings }: PulseTabProps) {
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
      <p className="text-xs text-text-faint text-center">
        Based on {resourceCount.toLocaleString()}&nbsp;resource
        {resourceCount !== 1 ? "s" : ""} scanned · sparklines show historical trend (Wave 2)
      </p>
    </div>
  );
}
