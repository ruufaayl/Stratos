import { PulseTile } from "./pulse-tile";

interface PulseStripProps {
  runRate: number;          // extrapolated monthly run-rate, $
  waste: number;            // total monthly waste identified, $
  realizedSavings: number;  // cumulative actioned savings, $
  forecastQuarter: number;  // projected quarter total, $
  /** Optional per-tile sparklines (last 30 days). */
  sparklines?: Partial<{
    runRate: number[];
    waste: number[];
    realizedSavings: number[];
    forecastQuarter: number[];
  }>;
}

export function PulseStrip({
  runRate,
  waste,
  realizedSavings,
  forecastQuarter,
  sparklines,
}: PulseStripProps) {
  // Provide a gentle default sparkline if none supplied (proof page uses real
  // ones derived from the engine output).
  const placeholder = (n: number) =>
    Array.from({ length: 14 }, (_, i) => n * (0.92 + 0.08 * Math.sin(i / 2)));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <PulseTile
        label="Monthly run-rate"
        value={runRate}
        sparkline={sparklines?.runRate ?? placeholder(runRate)}
        semantic="neutral"
      />
      <PulseTile
        label="Waste identified"
        value={waste}
        sparkline={sparklines?.waste ?? placeholder(waste)}
        semantic="bad"
      />
      <PulseTile
        label="Realized savings"
        value={realizedSavings}
        sparkline={sparklines?.realizedSavings ?? placeholder(realizedSavings)}
        semantic="good"
      />
      <PulseTile
        label="Forecast (quarter)"
        value={forecastQuarter}
        sparkline={sparklines?.forecastQuarter ?? placeholder(forecastQuarter)}
        semantic="neutral"
      />
    </div>
  );
}
