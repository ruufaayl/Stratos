"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DETAIL_TABS = [
  { id: "evidence",  label: "Evidence" },
  { id: "math",      label: "Math" },
  { id: "reasoning", label: "Reasoning" },
  { id: "resource",  label: "Resource" },
] as const;

export type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

interface FindingDetailTabBarProps {
  orgSlug: string;
  findingId: string;
  currentTab: DetailTabId;
}

export function FindingDetailTabBar({
  orgSlug,
  findingId,
  currentTab,
}: FindingDetailTabBarProps) {
  return (
    <nav
      aria-label="Finding detail tabs"
      className="flex border-b border-border-subtle mb-6"
    >
      {DETAIL_TABS.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <Link
            key={tab.id}
            href={`/app/${orgSlug}/findings/${findingId}?tab=${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors select-none",
              isActive
                ? "text-text-primary border-b-2 border-intel-500 -mb-px"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
