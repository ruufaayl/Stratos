import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";
import type { Opportunity as DbFinding, Account } from "@/lib/db/schema";

interface ResourceTabProps {
  finding: DbFinding;
  account: Account;
  opportunity: Opportunity;
}

export function ResourceTab({ finding, account, opportunity: opp }: ResourceTabProps) {
  // resource_id exists on idle, rightsize, zombie — not on anomaly/commitment
  const resourceId =
    ("resource_id" in opp ? opp.resource_id : null) ?? finding.resourceId ?? "—";

  const kindLabels: Record<string, string> = {
    idle: "Idle",
    rightsize: "Rightsize",
    anomaly: "Anomaly",
    commitment: "Commitment",
    zombie: "Zombie",
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <div className="font-mono uppercase text-xs text-text-muted mb-1">
            Resource ID
          </div>
          <div className="text-text-primary font-mono text-sm break-all">{resourceId}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Account</div>
            <div className="text-text-primary text-sm">{account.name}</div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Region</div>
            <div className="text-text-primary text-sm font-mono">{account.region}</div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Finding kind</div>
            <Chip kind="waste">{kindLabels[finding.kind] ?? finding.kind}</Chip>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Monthly savings</div>
            <div className="text-savings-500 font-semibold tabular-nums text-sm">
              {usd(Number(finding.monthlySavings))}/mo
            </div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Detected</div>
            <div className="text-text-primary text-sm">
              {finding.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          </div>
          {finding.appliedAt && (
            <div>
              <div className="font-mono uppercase text-xs text-text-muted mb-1">Applied</div>
              <div className="text-savings-500 text-sm">
                {finding.appliedAt.toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
