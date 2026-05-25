import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Opportunity } from "@/lib/engine/types";

const KIND_ALGORITHM: Record<
  Opportunity["kind"],
  { name: string; description: string }
> = {
  idle: {
    name: "Idle Detection (IQR + Net-zero)",
    description:
      "Computes idle_score = 0.7 × cpu_norm + 0.3 × net_norm. CPU normalized against p95 IQR baseline. idle_score ≥ 0.80 and peak_cpu_pct ≤ 5% triggers an idle finding.",
  },
  rightsize: {
    name: "Rightsizing (p95 CPU demand model)",
    description:
      "Measures p95 CPU utilization, maps to vCPU demand with 20% headroom, selects the cheapest instance type satisfying that demand. Flags amber when demand_vcpu_with_headroom exceeds 85% of the target type's vCPUs.",
  },
  anomaly: {
    name: "Anomaly Detection (Bollinger Bands on daily cost)",
    description:
      "Computes 7-day rolling mean and 2σ upper band on the daily cost series. day_index is the position within the 14-day window. sigma measures how many standard deviations above the upper band the actual spend was.",
  },
  commitment: {
    name: "Commitment Optimizer (Newsvendor model)",
    description:
      "Fits a log-normal distribution to daily usage samples. Solves the newsvendor critical ratio c_u/(c_u + c_o) to find the commit_level that minimises expected underage + overage cost. coverage_pct is the percentile of demand covered at that level.",
  },
  zombie: {
    name: "Zombie Detection (stopped + near-zero threshold)",
    description:
      "Classifies 'stopped' if there are 0 non-zero CPU datapoints across all data_days. Classifies 'near-stopped' if max_cpu_pct < 0.1%. confidence = 1 − (max_cpu_pct / 0.1) for near-stopped, 1.0 for stopped.",
  },
};

interface MathTabProps {
  opportunity: Opportunity;
  rawEngineData: Record<string, unknown>;
}

export function MathTab({ opportunity: opp, rawEngineData }: MathTabProps) {
  const alg = KIND_ALGORITHM[opp.kind];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Algorithm</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-text-primary font-medium text-sm mb-2">{alg.name}</div>
          <div className="text-text-muted text-sm leading-relaxed">{alg.description}</div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Raw engine output</CardTitle>
        </CardHeader>
        <CardBody>
          <pre className="text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(rawEngineData, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
