"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pulse",    label: "Pulse" },
  { id: "feed",     label: "Findings" },
  { id: "map",      label: "Cost Map" },
  { id: "forecast", label: "Forecast" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export interface TabBarProps {
  orgSlug: string;
  currentTab: TabId;
}

export function TabBar({ orgSlug, currentTab }: TabBarProps) {
  return (
    <nav className="flex border-b border-border-subtle mb-6">
      {TABS.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <Link
            key={tab.id}
            href={`/app/${orgSlug}?tab=${tab.id}`}
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
