"use client";

import { motion } from "framer-motion";

import { cn, usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
  explanation?: string;
}

function confidenceDots(risk: number | undefined): string {
  // Confidence = 1 - risk, on a 5-dot scale.
  const conf = 1 - (risk ?? 0);
  const filled = Math.max(1, Math.min(5, Math.round(conf * 5)));
  return "●".repeat(filled) + "○".repeat(5 - filled);
}

function headline(opp: Opportunity): string {
  switch (opp.kind) {
    case "zombie":
      return `Terminate ${opp.resource_id} — ${opp.zombie_label === "stopped" ? "fully stopped" : "near-zero activity"}, still billing`;
    case "idle":
      return `Stop ${opp.resource_id} — peak CPU ${opp.peak_cpu_pct.toFixed(1)}%`;
    case "rightsize":
      return `Right-size ${opp.resource_id}: ${opp.from_type} → ${opp.to_type}`;
    case "anomaly":
      return `Cost anomaly day ${opp.day_index} — ${opp.sigma.toFixed(1)}σ over expected`;
    case "commitment":
      return `Commit at ${opp.commit_level.toFixed(2)} units (${opp.coverage_pct.toFixed(0)}% coverage)`;
  }
}

function evidence(opp: Opportunity): string {
  switch (opp.kind) {
    case "zombie":
      return `Max CPU ${opp.max_cpu_pct.toFixed(2)}% over ${opp.data_days.toFixed(0)} days. No workload — ${(opp.confidence * 100).toFixed(0)}% confident. Safe to terminate.`;
    case "idle":
      return `Idle score ${opp.idle_score.toFixed(2)}. Both CPU and network are quiet.`;
    case "rightsize":
      return `p95 CPU ${opp.p95_cpu_pct.toFixed(0)}%. ${
        opp.amber ? "Runs close to ceiling — needs human review." : "Safe headroom."
      }`;
    case "anomaly":
      return `Spent ${usd(opp.actual)}; expected ${usd(opp.expected)}.`;
    case "commitment":
      return `Critical quantile ${opp.critical_quantile.toFixed(2)}. From ${usd(opp.current_monthly)} to ${usd(opp.optimized_monthly)}/mo.`;
  }
}

export function OpportunityCard({
  opportunity: opp,
  index,
  explanation,
}: OpportunityCardProps) {
  const isAmber =
    "amber" in opp && opp.amber === true;
  const ringClass = isAmber ? "ring-1 ring-warn/30" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className={cn(
        "rounded-xl border border-border bg-bg-raised p-5",
        "hover:border-border-strong transition-colors",
        ringClass,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-data-lg font-semibold tabular text-good">
          💰 Save {usd(opp.monthly_savings)}/mo
        </div>
        <div className="text-data-sm font-mono text-fg-muted">
          <span className="text-brand">{confidenceDots(opp.risk)}</span>
          <span className="ml-2 tabular">
            {((1 - (opp.risk ?? 0)) * 100).toFixed(0)}% conf
          </span>
        </div>
      </div>
      <div className="mt-2 text-fg font-medium">{headline(opp)}</div>
      <div className="mt-1 text-fg-muted text-sm">{evidence(opp)}</div>
      {explanation && (
        <div className="mt-3 pt-3 border-t border-border text-fg-muted text-sm">
          <span className="text-fg-subtle font-mono text-xs uppercase mr-2">
            Why?
          </span>
          {explanation}
        </div>
      )}
    </motion.div>
  );
}
