"use client";

/**
 * ProofStream — connects to the engine SSE at /engine/proof/stream and renders
 * the live feed of findings as they arrive. Animates each row in; shows a running
 * waste total; closes with a conversion CTA once done (or after 5 s timeout).
 *
 * Designed to be embedded in the /proof page server component.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import { cn, usd } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

// ── Types ────────────────────────────────────────────────────────────────────

type Phase = "connecting" | "scanning" | "done" | "error" | "timeout";

interface StreamOpportunity {
  kind: string;
  resource_id?: string;
  monthly_savings: number;
  running_total: number;
}

interface DonePayload {
  total_monthly_waste: number;
  opportunity_count: number;
  resource_count: number;
  analysis_time_seconds?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function kindChipVariant(kind: string): "waste" | "risk" | "savings" | "intelligence" | "neutral" {
  switch (kind) {
    case "idle":
    case "zombie":
      return "waste";
    case "rightsize":
      return "risk";
    case "anomaly":
      return "risk";
    case "commitment":
      return "savings";
    default:
      return "neutral";
  }
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "idle":        return "idle";
    case "zombie":      return "zombie";
    case "rightsize":   return "rightsize";
    case "anomaly":     return "anomaly";
    case "commitment":  return "commitment";
    default:            return kind;
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LiveDot({ phase }: { phase: Phase }) {
  if (phase === "scanning" || phase === "connecting") {
    return (
      <span className="relative flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-waste-500 animate-pulse-dot" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-waste-500">
          Live
        </span>
      </span>
    );
  }
  if (phase === "done") {
    return (
      <span className="relative flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-savings-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-savings-500">
          Complete
        </span>
      </span>
    );
  }
  return (
    <span className="relative flex items-center gap-1.5">
      <span className="size-2 rounded-full bg-text-faint" />
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-faint">
        {phase === "timeout" ? "timed out" : "error"}
      </span>
    </span>
  );
}

function FindingRow({ opp, index }: { opp: StreamOpportunity; index: number }) {
  const rid = opp.resource_id ?? `opp-${index}`;
  return (
    <motion.div
      key={rid + index}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 py-2 border-b border-border-subtle last:border-0"
    >
      {/* Resource ID */}
      <span className="font-mono text-[11px] text-text-faint min-w-0 truncate flex-1">
        {opp.resource_id ? (
          <span className="text-text-primary">{opp.resource_id}</span>
        ) : (
          <span className="text-text-faint italic">—</span>
        )}
      </span>

      {/* Kind chip */}
      <Chip kind={kindChipVariant(opp.kind)} size="sm">
        {kindLabel(opp.kind)}
      </Chip>

      {/* Savings */}
      <span className="font-mono tabular text-[12px] text-savings-500 shrink-0">
        {usd(opp.monthly_savings)}/mo
      </span>
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export interface ProofStreamProps {
  /** Max findings rows to show (defaults to 20). */
  maxRows?: number;
}

export function ProofStream({ maxRows = 20 }: ProofStreamProps) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [findings, setFindings] = useState<StreamOpportunity[]>([]);
  const [runningTotal, setRunningTotal] = useState(0);
  const [donePayload, setDonePayload] = useState<DonePayload | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    // 5-second timeout — show summary section even if engine is quiet
    timeoutRef.current = setTimeout(() => {
      setPhase((p) => (p === "scanning" || p === "connecting" ? "timeout" : p));
    }, 5000);

    const es = new EventSource("/engine/proof/stream");

    es.addEventListener("start", () => {
      setPhase("scanning");
    });

    es.addEventListener("opportunity", (e: MessageEvent) => {
      const d = JSON.parse(e.data as string) as {
        running_total: number;
        opportunity?: { kind: string; resource_id?: string; monthly_savings?: number };
      };
      setRunningTotal(d.running_total);
      if (d.opportunity) {
        setFindings((prev) => {
          const next: StreamOpportunity = {
            kind: d.opportunity!.kind,
            resource_id: d.opportunity!.resource_id,
            monthly_savings: d.opportunity!.monthly_savings ?? 0,
            running_total: d.running_total,
          };
          return [next, ...prev].slice(0, maxRows);
        });
      }
    });

    es.addEventListener("done", (e: MessageEvent) => {
      const d = JSON.parse(e.data as string) as DonePayload;
      setRunningTotal(d.total_monthly_waste);
      setDonePayload(d);
      setPhase("done");
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });

    es.onerror = () => {
      setPhase("error");
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    return () => {
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [maxRows]);

  const showSummary = phase === "done" || phase === "timeout" || phase === "error";

  return (
    <div className="space-y-6">
      {/* ── Live stream card ── */}
      <Card intent="waste">
        <CardHeader>
          <CardTitle>Real-time waste scan</CardTitle>
          <LiveDot phase={phase} />
        </CardHeader>
        <CardBody className="space-y-3">
          {/* Running total */}
          <div className="flex items-baseline justify-between pb-3 border-b border-border-subtle">
            <span className="font-mono text-mono-xs text-text-faint uppercase tracking-wide">
              Total waste identified
            </span>
            <motion.span
              key={Math.round(runningTotal)}
              initial={{ scale: 1.05, color: "#EF4444" }}
              animate={{ scale: 1, color: "#EF4444" }}
              transition={{ duration: 0.2 }}
              className="font-mono tabular text-xl font-semibold text-waste-500"
            >
              {usd(runningTotal, { compact: true })}/mo
            </motion.span>
          </div>

          {/* Status line */}
          <div className="flex items-center gap-2 text-mono-sm font-mono text-text-faint min-h-[1.5rem]">
            {phase === "connecting" && (
              <span>Connecting to engine<span className="animate-pulse">…</span></span>
            )}
            {phase === "scanning" && (
              <>
                <span>Scanning fleet</span>
                {findings.length > 0 && (
                  <span className="text-text-primary tabular">
                    · {findings.length} finding{findings.length !== 1 ? "s" : ""} so far
                  </span>
                )}
                <span className="ml-auto text-text-faint opacity-60 tabular">{elapsed}s</span>
              </>
            )}
            {phase === "done" && (
              <span className="text-savings-500">
                Scan complete · {elapsed}s
              </span>
            )}
            {phase === "timeout" && (
              <span className="text-text-faint">
                Engine offline — showing static results below
              </span>
            )}
            {phase === "error" && (
              <span className="text-waste-300">
                Stream unavailable — engine may be offline
              </span>
            )}
          </div>

          {/* Findings rows */}
          {findings.length > 0 ? (
            <div className="divide-y divide-border-subtle">
              <AnimatePresence mode="popLayout">
                {findings.map((opp, i) => (
                  <FindingRow key={`${opp.kind}-${opp.resource_id ?? i}`} opp={opp} index={i} />
                ))}
              </AnimatePresence>
            </div>
          ) : phase !== "connecting" && phase !== "error" && phase !== "timeout" ? (
            <div className="py-6 text-center text-text-faint text-sm font-mono">
              Waiting for first finding…
            </div>
          ) : null}

          {/* Empty state when engine is offline */}
          {(phase === "error" || phase === "timeout") && findings.length === 0 && (
            <div className="py-6 text-center space-y-2">
              <div className="text-text-faint text-sm font-mono">No live stream available</div>
              <div className="text-text-faint text-xs">
                Start the engine locally:{" "}
                <code className="bg-bg-elevated px-1.5 py-0.5 rounded font-mono text-xs">
                  pnpm engine:dev
                </code>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Summary card — appears after done / timeout ── */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card intent="intel">
              <CardHeader>
                <CardTitle>Scan summary</CardTitle>
              </CardHeader>
              <CardBody className="space-y-5">
                {donePayload ? (
                  <div className="grid grid-cols-3 gap-4">
                    <SummaryTile
                      label="Waste found"
                      value={usd(donePayload.total_monthly_waste, { compact: true })}
                      unit="/mo"
                      tone="waste"
                    />
                    <SummaryTile
                      label="Findings"
                      value={donePayload.opportunity_count.toLocaleString()}
                      tone="neutral"
                    />
                    <SummaryTile
                      label="Scan time"
                      value={
                        donePayload.analysis_time_seconds !== undefined
                          ? `${donePayload.analysis_time_seconds.toFixed(1)}s`
                          : `${elapsed}s`
                      }
                      tone="neutral"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <SummaryTile label="Waste found" value="—" tone="neutral" />
                    <SummaryTile label="Findings" value="—" tone="neutral" />
                    <SummaryTile label="Scan time" value="—" tone="neutral" />
                  </div>
                )}

                <div className="rounded-lg border border-intel-950 bg-bg-elevated px-4 py-3 text-sm text-text-muted space-y-1">
                  <p>
                    <span className="text-text-primary font-medium">This was public data.</span>{" "}
                    On your account, Stratos would find more — unused EBS volumes, idle RDS
                    instances, over-provisioned Lambda memory, and commitment gaps.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/sign-up"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded",
                      "bg-intel-500 text-white font-medium text-sm",
                      "hover:bg-intel-300 hover:text-intel-950 transition-colors",
                    )}
                  >
                    Start your free scan →
                  </Link>
                  <Link
                    href="/pricing"
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded",
                      "bg-bg-elevated border border-border-subtle text-text-primary font-medium text-sm",
                      "hover:border-border-strong transition-colors",
                    )}
                  >
                    See pricing
                  </Link>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "waste" | "neutral";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">
        {label}
      </span>
      <span
        className={cn(
          "font-mono tabular text-xl font-semibold",
          tone === "waste" ? "text-waste-500" : "text-text-primary",
        )}
      >
        {value}
        {unit && <span className="text-text-faint text-sm font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}
