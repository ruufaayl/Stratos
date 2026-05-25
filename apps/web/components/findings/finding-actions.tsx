"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface FindingActionsProps {
  findingId: string;
  isApplied: boolean;
  isDismissed: boolean;
}

export function FindingActions({ findingId, isApplied, isDismissed }: FindingActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function act(action: "apply" | "dismiss" | "undo_apply" | "undo_dismiss") {
    setPending(action);
    try {
      await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {!isApplied && !isDismissed && (
        <>
          <button
            onClick={() => act("apply")}
            disabled={pending !== null}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-savings-700 text-savings-400 hover:bg-savings-950 disabled:opacity-50"
          >
            {pending === "apply" ? "Applying…" : "Mark applied"}
          </button>
          <button
            onClick={() => act("dismiss")}
            disabled={pending !== null}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong disabled:opacity-50"
          >
            {pending === "dismiss" ? "Dismissing…" : "Dismiss"}
          </button>
        </>
      )}
      {isApplied && (
        <button
          onClick={() => act("undo_apply")}
          disabled={pending !== null}
          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong disabled:opacity-50"
        >
          {pending === "undo_apply" ? "Undoing…" : "Undo applied"}
        </button>
      )}
      {isDismissed && (
        <button
          onClick={() => act("undo_dismiss")}
          disabled={pending !== null}
          className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong disabled:opacity-50"
        >
          {pending === "undo_dismiss" ? "Undoing…" : "Undo dismiss"}
        </button>
      )}
    </div>
  );
}
