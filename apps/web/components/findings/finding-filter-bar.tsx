"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type KindFilter =
  | "idle"
  | "rightsize"
  | "anomaly"
  | "commitment"
  | "zombie"
  | null;

const KINDS: Array<{ id: KindFilter; label: string; icon?: string }> = [
  { id: null, label: "All" },
  { id: "idle", label: "Idle", icon: "💤" },
  { id: "rightsize", label: "Rightsize", icon: "⬇️" },
  { id: "anomaly", label: "Anomaly", icon: "⚡" },
  { id: "commitment", label: "Commitment", icon: "🔒" },
  { id: "zombie", label: "Zombie", icon: "💀" },
];

function kindActiveClass(id: KindFilter): string {
  switch (id) {
    case "zombie":
      return "bg-waste-500/20 text-waste-400 border-waste-500/40";
    case "idle":
      return "bg-warn/20 text-warn border-warn/40";
    case "rightsize":
      return "bg-intel-500/20 text-intel-300 border-intel-500/40";
    case "anomaly":
      return "bg-warn/20 text-warn border-warn/40";
    case "commitment":
      return "bg-savings-500/20 text-savings-400 border-savings-500/40";
    default:
      return "bg-intel-950 text-intel-300 border-intel-950";
  }
}

interface FindingFilterBarProps {
  orgSlug: string;
  currentKind: KindFilter;
}

export function FindingFilterBar({
  orgSlug,
  currentKind,
}: FindingFilterBarProps) {
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
                ? kindActiveClass(k.id)
                : "bg-bg-elevated text-text-muted border-border-subtle hover:border-border-strong",
            )}
          >
            {k.icon && <span>{k.icon}</span>}
            {k.label}
          </button>
        );
      })}
    </div>
  );
}
