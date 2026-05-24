"use client";

import { OpportunityCard } from "./opportunity-card";
import type { Opportunity } from "@/lib/engine/types";

interface OpportunityFeedProps {
  opportunities: Opportunity[];
  explanations?: Record<string, string>;
}

export function OpportunityFeed({ opportunities, explanations }: OpportunityFeedProps) {
  if (opportunities.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-10 text-center text-text-muted">
        No opportunities found. Either everything is right-sized — or the engine
        hasn&apos;t run yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {opportunities.map((opp, i) => {
        const id = "resource_id" in opp && typeof opp.resource_id === "string"
          ? opp.resource_id
          : `${opp.kind}-${i}`;
        return (
          <OpportunityCard
            key={id + i}
            opportunity={opp}
            index={i}
            explanation={explanations?.[id]}
          />
        );
      })}
    </div>
  );
}
