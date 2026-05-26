"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { UpgradeModal } from "@/components/billing/upgrade-modal";

interface FirstScanTriggerProps {
  accountId: string;
  orgSlug: string;
}

/**
 * Renders the "first scan in progress" empty state AND automatically fires
 * POST /api/scan once on mount (fire-and-forget).  This covers the case where
 * the connect-wizard's built-in scan failed or the user navigated away before
 * it completed.
 */
export function FirstScanTrigger({ accountId, orgSlug }: FirstScanTriggerProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = React.useState(false);
  const [scanUsage, setScanUsage] = React.useState<{
    scansUsed?: number;
    scansLimit?: number;
  }>({});

  // Fire-and-forget: trigger the first scan as soon as this component mounts.
  // If the user is on the free tier and out of scans, show the upgrade modal.
  React.useEffect(() => {
    fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    })
      .then(async (res) => {
        if (res.status === 402) {
          const body = (await res.json()) as {
            scansUsed?: number;
            scansLimit?: number;
          };
          setScanUsage({
            scansUsed: body.scansUsed,
            scansLimit: body.scansLimit,
          });
          setUpgradeModalOpen(true);
        }
        // Other non-ok statuses are surfaced via the scan run record.
      })
      .catch(() => {
        // Intentionally fire-and-forget; errors are surfaced via the scan run record.
      });
    // Only fire once on mount — accountId is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    // Reset the button after a short delay so the user can click again.
    setTimeout(() => setRefreshing(false), 3000);
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center text-center px-6 py-12 border border-dashed border-border-subtle rounded-card bg-bg-surface">
        {/* Animated spinner */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-intel-500/40 bg-intel-500/10">
          <Loader2 className="h-5 w-5 text-intel-400 animate-spin" />
        </div>

        <div className="text-[15px] font-medium text-text-primary animate-pulse">
          Running first scan…
        </div>

        <p className="text-mono-sm text-text-muted mt-1 max-w-sm">
          Findings will appear here shortly. This takes about 60 seconds.
        </p>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="mt-4 inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded border transition-colors border-border-subtle text-text-muted hover:border-border-strong hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <UpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        scansUsed={scanUsage.scansUsed}
        scansLimit={scanUsage.scansLimit}
      />
    </>
  );
}
