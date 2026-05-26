"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
}

type Action = "apply" | "dismiss";

export function BulkActionsBar({ selectedIds, onClear }: BulkActionsBarProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  if (selectedIds.length === 0) return null;

  async function run(action: Action) {
    setPending(action);
    setError(null);
    setUpgradeRequired(false);
    try {
      const res = await fetch("/api/findings/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action }),
      });
      if (res.status === 402) {
        setUpgradeRequired(true);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      router.refresh();
      onClear();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3 rounded-xl border border-border-strong bg-bg-elevated px-4 py-3 shadow-xl">
          <div className="text-sm text-text-primary tabular">
            <span className="font-semibold">{selectedIds.length}</span>
            <span className="text-text-muted ml-1">selected</span>
          </div>
          <div className="h-5 w-px bg-border-subtle" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => run("apply")}
              disabled={pending !== null}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-savings-700 text-savings-400 hover:bg-savings-950 disabled:opacity-50"
            >
              {pending === "apply" ? "Applying…" : "Apply all"}
            </button>
            <button
              type="button"
              onClick={() => run("dismiss")}
              disabled={pending !== null}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong disabled:opacity-50"
            >
              {pending === "dismiss" ? "Dismissing…" : "Dismiss all"}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={pending !== null}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-faint hover:text-text-muted hover:border-border-strong disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
          {error && (
            <div className="text-[12px] text-waste-500 max-w-[240px] truncate" title={error}>
              {error}
            </div>
          )}
        </div>
        {upgradeRequired && (
          <p className="text-[12px] text-waste-500 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-1.5 shadow-md">
            Bulk actions require Pro —{" "}
            <Link href="/pricing" className="underline hover:text-waste-400">
              Upgrade →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
