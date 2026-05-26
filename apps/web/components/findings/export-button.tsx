"use client";

import { useState } from "react";
import Link from "next/link";

interface ExportButtonProps {
  runId: string;
  className?: string;
}

export function ExportButton({ runId, className }: ExportButtonProps) {
  const [disabled, setDisabled] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState(false);

  async function handleExport() {
    setDisabled(true);
    setUpgradePrompt(false);
    try {
      const res = await fetch(`/api/findings/export?runId=${runId}`);
      if (res.status === 402) {
        setUpgradePrompt(true);
        return;
      }
      if (!res.ok) return;

      // Trigger file download from the blob response.
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      a.download = match?.[1] ?? `stratos-findings-${runId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setDisabled(false), 1000);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={disabled}
        className={
          [
            "inline-flex items-center justify-center gap-1.5 h-8 px-3",
            "bg-bg-elevated border border-border-subtle text-text-secondary",
            "hover:border-border-strong",
            "text-[13px] font-medium rounded transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          ]
            .filter(Boolean)
            .join(" ")
        }
      >
        Export CSV ↓
      </button>
      {upgradePrompt && (
        <p className="text-[12px] text-waste-500">
          Export is a Pro feature —{" "}
          <Link href="/pricing" className="underline hover:text-waste-400">
            Upgrade →
          </Link>
        </p>
      )}
    </div>
  );
}
