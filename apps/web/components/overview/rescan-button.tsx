"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface RescanButtonProps {
  accountId: string;
  lastScanAt: string | null; // ISO string (serialisable from server)
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never scanned";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function RescanButton({ accountId, lastScanAt }: RescanButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");

  async function handleRescan() {
    setStatus("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        setStatus("done");
        router.refresh();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-faint font-mono">
        {status === "scanning"
          ? "Scanning…"
          : status === "done"
          ? "Scan complete"
          : status === "error"
          ? "Scan failed"
          : `Last scan: ${timeAgo(lastScanAt)}`}
      </span>
      <button
        onClick={handleRescan}
        disabled={status === "scanning"}
        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong hover:text-text-primary disabled:opacity-50"
      >
        {status === "scanning" ? "Scanning…" : "Re-scan"}
      </button>
    </div>
  );
}
