"use client";

import { useState } from "react";
import Link from "next/link";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { BulkActionsBar } from "@/components/findings/bulk-actions-bar";
import type { Opportunity } from "@/lib/engine/types";

export interface FeedRow {
  id: string;
  opp: Opportunity;
  explanation?: string;
}

interface FeedTabInteractiveProps {
  rows: FeedRow[];
  orgSlug: string;
}

/**
 * Client half of the feed tab. Owns the multi-select state and renders
 * the floating bulk-actions bar. The parent (server component) handles
 * data fetching + parsing.
 */
export function FeedTabInteractive({ rows, orgSlug }: FeedTabInteractiveProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {rows.map(({ id, opp, explanation }, i) => {
        const checked = selectedIds.has(id);
        return (
          <div key={id} className="flex items-start gap-3">
            <label
              className="mt-5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(id)}
                aria-label={`Select finding ${id}`}
                className="h-4 w-4 cursor-pointer accent-intel-500"
              />
            </label>
            <Link
              href={`/app/${orgSlug}/findings/${id}`}
              className="block flex-1 hover:opacity-90 transition-opacity"
            >
              <OpportunityCard
                opportunity={opp}
                index={i}
                explanation={explanation}
              />
            </Link>
          </div>
        );
      })}
      <BulkActionsBar
        selectedIds={[...selectedIds]}
        onClear={() => setSelectedIds(new Set())}
      />
    </div>
  );
}
