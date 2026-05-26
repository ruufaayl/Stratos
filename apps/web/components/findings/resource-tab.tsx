"use client";

import type { ReactNode } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";
import type { Opportunity as DbFinding, Account } from "@/lib/db/schema";

interface ResourceTabProps {
  finding: DbFinding;
  account: Account;
  opportunity: Opportunity | null;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="font-mono uppercase text-xs text-text-faint mb-0.5">{label}</dt>
      <dd className="text-text-primary text-sm font-medium font-mono m-0">{value}</dd>
    </div>
  );
}

function riskColor(risk: number): string {
  if (risk < 0.3) return "text-savings-400";
  if (risk < 0.7) return "text-risk-400";
  return "text-waste-400";
}

function formatRelativeDate(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  if (months < 12) return `${months} months ago`;
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

// ---------------------------------------------------------------------------
// Kind-specific detail sections
// ---------------------------------------------------------------------------

function IdleDetails({ opp }: { opp: Extract<Opportunity, { kind: "idle" }> }) {
  return (
    <>
      <MetaRow label="Instance type" value={opp.resource_type} />
      <MetaRow label="Peak CPU" value={`${opp.peak_cpu_pct.toFixed(2)}%`} />
      <MetaRow label="Idle score" value={opp.idle_score.toFixed(3)} />
      <MetaRow
        label="Peak network"
        value={
          opp.peak_net_bps !== null
            ? `${(opp.peak_net_bps / 1024).toFixed(1)} KB/s`
            : "No data"
        }
      />
      <MetaRow label="Monthly cost" value={usd(opp.monthly_cost)} />
    </>
  );
}

function RightsizeDetails({ opp }: { opp: Extract<Opportunity, { kind: "rightsize" }> }) {
  return (
    <>
      <MetaRow label="Current type" value={opp.from_type} />
      <MetaRow label="Recommended type" value={opp.to_type} />
      <MetaRow label="p95 CPU" value={`${opp.p95_cpu_pct.toFixed(1)}%`} />
      <MetaRow
        label="vCPU demand (headroom)"
        value={`${opp.demand_vcpu_with_headroom.toFixed(2)} vCPU`}
      />
      <MetaRow label="Current cost/hr" value={`$${opp.from_price_hr.toFixed(4)}`} />
      <MetaRow label="Target cost/hr" value={`$${opp.to_price_hr.toFixed(4)}`} />
      {opp.amber && (
        <div className="col-span-2 mt-1 p-3 rounded-lg bg-risk-950 border border-risk-800 text-risk-300 text-xs font-mono">
          Warning: CPU runs close to ceiling. Review before resizing.
        </div>
      )}
    </>
  );
}

function ZombieDetails({ opp }: { opp: Extract<Opportunity, { kind: "zombie" }> }) {
  return (
    <>
      <MetaRow label="Instance type" value={opp.resource_type} />
      <MetaRow
        label="Status"
        value={opp.zombie_label === "stopped" ? "Fully stopped" : "Near-zero activity"}
      />
      <MetaRow label="Max CPU" value={`${opp.max_cpu_pct.toFixed(3)}%`} />
      <MetaRow label="Data coverage" value={`${opp.data_days} days`} />
      <MetaRow label="Confidence" value={`${(opp.confidence * 100).toFixed(0)}%`} />
      <MetaRow label="Monthly cost" value={usd(opp.monthly_cost)} />
    </>
  );
}

function AnomalyDetails({ opp }: { opp: Extract<Opportunity, { kind: "anomaly" }> }) {
  return (
    <>
      <MetaRow label="Anomaly sigma" value={`${opp.sigma.toFixed(2)}σ`} />
      <MetaRow label="Actual spend" value={usd(opp.actual)} />
      <MetaRow label="Expected spend" value={usd(opp.expected)} />
      <MetaRow label="Overspend" value={usd(opp.overspend)} />
      <MetaRow label="Day index" value={String(opp.day_index)} />
    </>
  );
}

function CommitmentDetails({ opp }: { opp: Extract<Opportunity, { kind: "commitment" }> }) {
  return (
    <>
      <MetaRow label="Commit level" value={opp.commit_level.toFixed(4)} />
      <MetaRow label="Critical quantile" value={opp.critical_quantile.toFixed(4)} />
      <MetaRow label="Current monthly" value={usd(opp.current_monthly)} />
      <MetaRow label="Optimized monthly" value={usd(opp.optimized_monthly)} />
      <MetaRow label="Savings %" value={`${(opp.savings_pct * 100).toFixed(1)}%`} />
      <MetaRow label="Coverage" value={`${opp.coverage_pct.toFixed(1)}%`} />
      <MetaRow label="Samples" value={String(opp.samples)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const KIND_LABELS: Record<string, string> = {
  idle: "Idle",
  rightsize: "Rightsize",
  anomaly: "Anomaly",
  commitment: "Commitment",
  zombie: "Zombie",
};

export function ResourceTab({ finding, account, opportunity: opp }: ResourceTabProps) {
  // Resolve resource_id — present on idle / rightsize / zombie, not anomaly / commitment
  const resourceId =
    (opp && "resource_id" in opp ? opp.resource_id : null) ??
    finding.resourceId ??
    "—";

  const risk = finding.risk !== null ? Number(finding.risk) : null;

  // Fallback: engine data unavailable
  if (!opp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resource metadata</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="text-text-muted text-sm mb-4">
            Resource metadata unavailable — raw finding data below.
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            <MetaRow label="Resource ID" value={finding.resourceId ?? "—"} />
            <MetaRow label="Region" value={account.region} />
            <div>
              <dt className="font-mono uppercase text-xs text-text-faint mb-0.5">Kind</dt>
              <dd className="m-0">
                <Chip kind="waste">{KIND_LABELS[finding.kind] ?? finding.kind}</Chip>
              </dd>
            </div>
            <MetaRow
              label="Detected"
              value={formatRelativeDate(finding.createdAt)}
            />
          </dl>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Identity card */}
      <Card>
        <CardHeader>
          <CardTitle>Resource identity</CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="space-y-4">
            {/* Resource ID — full width, monospace chip */}
            <div>
              <dt className="font-mono uppercase text-xs text-text-faint mb-1">Resource ID</dt>
              <dd className="m-0">
                <span className="font-mono text-sm text-text-primary bg-bg-elevated border border-border-subtle rounded px-2 py-0.5 break-all">
                  {resourceId}
                </span>
              </dd>
            </div>

            {/* Two-column grid for remaining common fields */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <MetaRow label="Account" value={account.name} />
              <MetaRow label="Region" value={account.region} />

              <div>
                <dt className="font-mono uppercase text-xs text-text-faint mb-0.5">Finding kind</dt>
                <dd className="m-0">
                  <Chip kind="waste">{KIND_LABELS[finding.kind] ?? finding.kind}</Chip>
                </dd>
              </div>

              {risk !== null ? (
                <div>
                  <dt className="font-mono uppercase text-xs text-text-faint mb-0.5">Risk score</dt>
                  <dd className={`m-0 text-sm font-medium font-mono ${riskColor(risk)}`}>
                    {Math.round(risk * 100)}% risk
                  </dd>
                </div>
              ) : null}

              <MetaRow
                label="Detected"
                value={formatRelativeDate(finding.createdAt)}
              />

              <MetaRow
                label="Monthly savings"
                value={
                  <span className="text-savings-400">
                    {usd(Number(finding.monthlySavings))}/mo
                  </span>
                }
              />

              {finding.appliedAt && (
                <MetaRow
                  label="Applied"
                  value={
                    <span className="text-savings-400">
                      {formatRelativeDate(finding.appliedAt)}
                    </span>
                  }
                />
              )}
              {finding.dismissedAt && (
                <MetaRow
                  label="Dismissed"
                  value={formatRelativeDate(finding.dismissedAt)}
                />
              )}
            </div>
          </dl>
        </CardBody>
      </Card>

      {/* Kind-specific detail card */}
      <Card>
        <CardHeader>
          <CardTitle>
            {KIND_LABELS[opp.kind] ?? opp.kind} — engine metrics
          </CardTitle>
        </CardHeader>
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {opp.kind === "idle" && <IdleDetails opp={opp} />}
            {opp.kind === "rightsize" && <RightsizeDetails opp={opp} />}
            {opp.kind === "zombie" && <ZombieDetails opp={opp} />}
            {opp.kind === "anomaly" && <AnomalyDetails opp={opp} />}
            {opp.kind === "commitment" && <CommitmentDetails opp={opp} />}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}
