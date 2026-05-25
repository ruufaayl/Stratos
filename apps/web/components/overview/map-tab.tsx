import { CostMap } from "@/components/dashboard/cost-map";
import { Empty } from "@/components/ui/empty";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

interface MapTabProps {
  findings: DbFinding[];
}

/**
 * Cost Map tab.
 * Derives CostMapNode[] from findings:
 *   - area (monthly_cost) = monthlySavings (the waste, not total spend)
 *   - color (waste_intensity) = risk score
 */
export function MapTab({ findings }: MapTabProps) {
  const nodes = findings
    .filter((f): f is typeof f & { resourceId: string } => f.resourceId !== null)
    .map((f) => ({
      id: f.resourceId,
      monthly_cost: Number(f.monthlySavings),
      waste_intensity: f.risk !== null ? Number(f.risk) : 0.5,
    }));

  if (nodes.length === 0) {
    return (
      <Empty
        title="No cost map data yet"
        body="The cost map populates after at least one finding is recorded with a resource ID."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-faint">
        Rectangle size ∝ monthly waste identified · Color:{" "}
        <span className="text-savings-500">green</span> = low risk ·{" "}
        <span className="text-amber-500">amber</span> = moderate ·{" "}
        <span className="text-waste-500">red</span> = high waste
      </p>
      <CostMap nodes={nodes} />
    </div>
  );
}
