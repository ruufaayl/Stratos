"use client";

import { useState } from "react";

export function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Unable to open billing portal.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded-md border border-border-strong hover:border-text-muted text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
      >
        {loading ? "Loading…" : "Manage subscription →"}
      </button>
      {error && <p className="text-xs text-waste-400">{error}</p>}
    </div>
  );
}
