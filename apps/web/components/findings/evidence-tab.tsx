import type { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";

interface EvidenceTabProps {
  opportunity: Opportunity;
}

function EvidenceRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="font-mono uppercase text-xs text-text-muted">{label}</span>
      <span className="text-text-primary font-medium text-sm tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function EvidenceTab({ opportunity: opp }: EvidenceTabProps) {
  return (
    <Card>
      <CardBody className="space-y-0 divide-y-0">
        {opp.kind === "idle" && (
          <>
            <EvidenceRow label="Idle score" value={opp.idle_score.toFixed(3)} />
            <EvidenceRow label="Peak CPU" value={`${opp.peak_cpu_pct.toFixed(2)}%`} />
            <EvidenceRow
              label="Peak network"
              value={
                opp.peak_net_bps !== null
                  ? `${(opp.peak_net_bps / 1024).toFixed(1)} KB/s`
                  : "No data"
              }
            />
            <EvidenceRow label="Monthly cost" value={usd(opp.monthly_cost)} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
          </>
        )}

        {opp.kind === "rightsize" && (
          <>
            <EvidenceRow label="Current type" value={opp.from_type} />
            <EvidenceRow label="Recommended type" value={opp.to_type} />
            <EvidenceRow label="p95 CPU" value={`${opp.p95_cpu_pct.toFixed(1)}%`} />
            <EvidenceRow
              label="Demand (with headroom)"
              value={`${opp.demand_vcpu_with_headroom.toFixed(2)} vCPU`}
            />
            <EvidenceRow label="Current cost/hr" value={`$${opp.from_price_hr.toFixed(4)}`} />
            <EvidenceRow label="Target cost/hr" value={`$${opp.to_price_hr.toFixed(4)}`} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
            {opp.amber && (
              <div className="mt-3 p-3 rounded-lg bg-risk-950 border border-risk-800 text-risk-300 text-xs">
                ⚠ Amber: CPU runs close to ceiling — review before resizing.
              </div>
            )}
          </>
        )}

        {opp.kind === "anomaly" && (
          <>
            <EvidenceRow label="Day index" value={opp.day_index} />
            <EvidenceRow label="Actual spend" value={usd(opp.actual)} />
            <EvidenceRow label="Expected spend" value={usd(opp.expected)} />
            <EvidenceRow label="Overspend" value={usd(opp.overspend)} />
            <EvidenceRow label="Sigma (deviation)" value={`${opp.sigma.toFixed(2)}σ`} />
            <EvidenceRow label="Monthly savings (est.)" value={usd(opp.monthly_savings)} />
          </>
        )}

        {opp.kind === "commitment" && (
          <>
            <EvidenceRow label="Optimal commit level" value={opp.commit_level.toFixed(4)} />
            <EvidenceRow label="Critical quantile" value={opp.critical_quantile.toFixed(4)} />
            <EvidenceRow label="Current monthly" value={usd(opp.current_monthly)} />
            <EvidenceRow label="Optimized monthly" value={usd(opp.optimized_monthly)} />
            <EvidenceRow
              label="Savings %"
              value={`${(opp.savings_pct * 100).toFixed(1)}%`}
            />
            <EvidenceRow
              label="Coverage"
              value={`${opp.coverage_pct.toFixed(1)}%`}
            />
            <EvidenceRow label="Samples" value={opp.samples} />
          </>
        )}

        {opp.kind === "zombie" && (
          <>
            <EvidenceRow
              label="Status"
              value={
                opp.zombie_label === "stopped"
                  ? "Fully stopped"
                  : "Near-zero activity"
              }
            />
            <EvidenceRow label="Max CPU" value={`${opp.max_cpu_pct.toFixed(3)}%`} />
            <EvidenceRow label="Data days" value={opp.data_days} />
            <EvidenceRow
              label="Confidence"
              value={`${(opp.confidence * 100).toFixed(0)}%`}
            />
            <EvidenceRow label="Monthly cost" value={usd(opp.monthly_cost)} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
          </>
        )}
      </CardBody>
    </Card>
  );
}
