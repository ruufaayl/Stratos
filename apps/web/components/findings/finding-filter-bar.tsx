"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type KindFilter = "idle" | "rightsize" | "anomaly" | "commitment" | "zombie" | null;

const KINDS: Array<{ id: KindFilter; label: string }> = [
  { id: null,         label: "All" },
  { id: "idle",       label: "Idle" },
  { id: "rightsize",  label: "Rightsize" },
  { id: "anomaly",    label: "Anomaly" },
  { id: "commitment", label: "Commitment" },
  { id: "zombie",     label: "Zombie" },
];

interface FindingFilterBarProps {
  orgSlug: string;
  currentKind: KindFilter;
}

export function FindingFilterBar({ orgSlug, currentKind }: FindingFilterBarProps) {
  const router = useRouter();

  function navigate(kind: KindFilter) {
    const url = kind
      ? `/app/${orgSlug}/findings?kind=${kind}`
      : `/app/${orgSlug}/findings`;
    router.push(url);
  }

  return (
    <div
      className="flex flex-wrap gap-2 mb-6"
      role="group"
      aria-label="Filter by finding type"
    >
      {KINDS.map((k) => {
        const isActive = k.id === currentKind;
        return (
          <button
            key={k.id ?? "all"}
            type="button"
            aria-pressed={isActive}
            onClick={() => navigate(k.id)}
            className={cn(
              "inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em]",
              "rounded-chip border whitespace-nowrap h-6 px-2 text-[11px] transition-colors",
              isActive
                ? "bg-intel-950 text-intel-300 border-intel-950"
                : "bg-bg-elevated text-text-muted border-border-subtle hover:border-border-strong",
            )}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}
