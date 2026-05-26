"use client";
import { useEffect, useState } from "react";

interface UsageData {
  tier: "free" | "pro";
  scansUsed: number | null;
  scansLimit: number | null;
}

export function UsageBar() {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/scan/usage")
      .then(r => r.json())
      .then((data: UsageData) => setUsage(data))
      .catch(() => {/* non-fatal */});
  }, []);

  if (!usage || usage.tier === "pro") return null;

  const { scansUsed, scansLimit } = usage;
  if (scansUsed === null || scansLimit === null) return null;

  const pct = Math.min((scansUsed / scansLimit) * 100, 100);
  const isNearLimit = scansUsed >= scansLimit * 0.8;
  const isAtLimit = scansUsed >= scansLimit;

  return (
    <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-white/50">Free scans this month</span>
        <span className={`text-xs font-mono ${isAtLimit ? "text-red-400" : isNearLimit ? "text-amber-400" : "text-white/70"}`}>
          {scansUsed}/{scansLimit}
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isAtLimit && (
        <a href="/pricing" className="mt-2 block text-xs text-indigo-400 hover:text-indigo-300">
          Upgrade for unlimited scans →
        </a>
      )}
    </div>
  );
}
