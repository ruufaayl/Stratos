"use client";

/**
 * Toggle between the synthetic /proof view (live engine, 10 VMs) and the
 * real-data view (static summary from 248,458 Azure production VMs).
 *
 * Synthetic = deterministic, live engine roundtrip every page load,
 * shows the SSE ticker animating in.
 *
 * Real = pre-computed static summary, the headline you screenshot for HN.
 *
 * The toggle just swaps the query-string mode; the page renders
 * server-side based on it.
 */

import { useRouter, useSearchParams } from "next/navigation";

type Mode = "real" | "synthetic";

interface ProofModeToggleProps {
  current: Mode;
  haveReal: boolean;
}

export function ProofModeToggle({ current, haveReal }: ProofModeToggleProps) {
  const router = useRouter();
  const params = useSearchParams();

  function setMode(mode: Mode) {
    const next = new URLSearchParams(params.toString());
    if (mode === "synthetic") {
      next.set("mode", "synthetic");
    } else {
      next.delete("mode");
    }
    router.push(`/proof${next.toString() ? "?" + next.toString() : ""}`);
  }

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-bg-raised p-0.5 text-data-sm font-mono">
      <button
        onClick={() => setMode("real")}
        disabled={!haveReal}
        title={!haveReal ? "Real-data summary not generated yet" : undefined}
        className={`px-3 py-1.5 rounded-md transition-colors ${
          current === "real"
            ? "bg-brand text-fg"
            : "text-fg-muted hover:text-fg disabled:opacity-40 disabled:cursor-not-allowed"
        }`}
      >
        Real data · 248K VMs
      </button>
      <button
        onClick={() => setMode("synthetic")}
        className={`px-3 py-1.5 rounded-md transition-colors ${
          current === "synthetic"
            ? "bg-brand text-fg"
            : "text-fg-muted hover:text-fg"
        }`}
      >
        Live engine · 10 VMs
      </button>
    </div>
  );
}
