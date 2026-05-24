import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/sparkline";
import type { SemanticKind } from "@/lib/design/tokens";
import { cn, usd } from "@/lib/utils";

interface PulseTileProps {
  label: string;
  value: number;
  delta?: number;          // signed % vs prior period
  sparkline?: number[];
  /** "good": green when positive (savings). "bad": red when positive (waste). */
  semantic?: "good" | "bad" | "neutral";
  format?: "currency" | "count";
}

export function PulseTile({
  label,
  value,
  delta,
  sparkline,
  semantic = "neutral",
  format = "currency",
}: PulseTileProps) {
  const deltaPositive = delta !== undefined && delta > 0;
  const deltaIsGood =
    semantic === "good" ? deltaPositive : semantic === "bad" ? !deltaPositive : true;

  const deltaColor =
    delta === undefined
      ? "text-text-faint"
      : deltaIsGood
        ? "text-savings-500"
        : "text-waste-500";

  const sparklineKind: SemanticKind =
    semantic === "good" ? "savings" : semantic === "bad" ? "waste" : "intelligence";

  return (
    <Card className="p-5">
      <div className="text-mono-sm font-mono uppercase tracking-wide text-text-muted">
        {label}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-kpi font-semibold tabular text-text-primary">
          {format === "currency" ? usd(value, { compact: true }) : value.toLocaleString()}
        </div>
        {sparkline && sparkline.length > 1 && (
          <div className="text-text-muted">
            <Sparkline
              data={sparkline}
              kind={sparklineKind}
              width={88}
              height={28}
            />
          </div>
        )}
      </div>
      {delta !== undefined && (
        <div className={cn("mt-2 text-mono-sm font-mono tabular", deltaColor)}>
          {deltaPositive ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          <span className="ml-1 text-text-faint">vs last week</span>
        </div>
      )}
    </Card>
  );
}
