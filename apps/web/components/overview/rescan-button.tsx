"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface RescanButtonProps {
  accountId: string;
  lastScanAt: string | null; // ISO string (serialisable from server)
}

type ScanStatus = "idle" | "scanning" | "done" | "error" | "rate_limited";

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
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [rateLimitLabel, setRateLimitLabel] = useState<string>("");

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
      } else if (res.status === 409) {
        // Scan already in progress — treat as success, it is already running
        setStatus("scanning");
      } else if (res.status === 429) {
        // Rate limited — parse retryAfterSeconds and show informational label
        const body = (await res.json()) as { retryAfterSeconds?: number };
        const waitSecs = body.retryAfterSeconds ?? 300;
        setRateLimitLabel(`Scan ran recently — wait ${waitSecs}s`);
        setStatus("rate_limited");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  function statusLabel(): string {
    switch (status) {
      case "scanning":
        return "Scanning…";
      case "done":
        return "Scan complete";
      case "error":
        return "Scan failed";
      case "rate_limited":
        return rateLimitLabel;
      default:
        return `Last scan: ${timeAgo(lastScanAt)}`;
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-faint font-mono">{statusLabel()}</span>
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
