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

function kindIcon(kind: Opportunity["kind"]): string {
  switch (kind) {
    case "zombie":
      return "💀";
    case "idle":
      return "💤";
    case "rightsize":
      return "⬇️";
    case "anomaly":
      return "⚡";
    case "commitment":
      return "🔒";
  }
}

function kindBorderClass(kind: Opportunity["kind"]): string {
  switch (kind) {
    case "zombie":
      return "border-waste-500/40 hover:border-waste-500/70";
    case "idle":
      return "border-warn/40 hover:border-warn/70";
    case "rightsize":
      return "border-intel-500/40 hover:border-intel-500/70";
    case "anomaly":
      return "border-warn/40 hover:border-warn/70";
    case "commitment":
      return "border-savings-500/40 hover:border-savings-500/70";
  }
}

function kindBadgeClass(kind: Opportunity["kind"]): string {
  switch (kind) {
    case "zombie":
      return "bg-waste-500/10 text-waste-400";
    case "idle":
      return "bg-warn/10 text-warn";
    case "rightsize":
      return "bg-intel-500/10 text-intel-300";
    case "anomaly":
      return "bg-warn/10 text-warn";
    case "commitment":
      return "bg-savings-500/10 text-savings-400";
  }
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className={cn(
        "rounded-xl border bg-bg-surface p-5",
        "transition-colors",
        kindBorderClass(opp.kind),
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-xs font-mono px-2 py-0.5 rounded-full",
            kindBadgeClass(opp.kind),
          )}
        >
          {kindIcon(opp.kind)} {opp.kind.toUpperCase()}
        </span>
        <div className="text-mono-sm font-mono text-text-muted">
          <span className="text-intel-300">{confidenceDots(opp.risk)}</span>
          <span className="ml-2 tabular">
            {((1 - (opp.risk ?? 0)) * 100).toFixed(0)}% conf
          </span>
        </div>
      </div>
      <div className="text-kpi-sm font-semibold tabular text-savings-500">
        💰 Save {usd(opp.monthly_savings)}/mo
      </div>
      <div className="mt-2 text-text-primary font-medium">{headline(opp)}</div>
      <div className="mt-1 text-text-muted text-sm">{evidence(opp)}</div>
      {explanation && (
        <div className="mt-3 pt-3 border-t border-border-subtle text-text-muted text-sm">
          <span className="text-text-faint font-mono text-xs uppercase mr-2">
            Why?
          </span>
          {explanation}
        </div>
      )}
    </motion.div>
  );
}
