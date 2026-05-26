"use client";

import { useState } from "react";

interface ExportButtonProps {
  runId: string;
  className?: string;
}

export function ExportButton({ runId, className }: ExportButtonProps) {
  const [disabled, setDisabled] = useState(false);

  function handleExport() {
    setDisabled(true);
    window.location.href = `/api/findings/export?runId=${runId}`;
    // Re-enable after 1 s — the browser handles the download natively.
    setTimeout(() => setDisabled(false), 1000);
  }

  return (
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
  );
}
