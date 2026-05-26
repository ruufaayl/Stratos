// apps/web/lib/shell/nav-registry.ts
import {
  LayoutDashboard, AlertTriangle, TrendingUp, FileText,
  History, Plug, Boxes, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: (orgSlug: string) => string;
  /** Returns true if this item should appear active for the given pathname. */
  matches: (pathname: string, orgSlug: string) => boolean;
};

const isExactOrTab = (path: string) => /^.*?(\?|$)/.test(path);

export const primaryNav: readonly NavItem[] = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    href: (org) => `/app/${org}`,
    matches: (p, org) => p === `/app/${org}` || p.startsWith(`/app/${org}?`),
  },
  {
    key: "findings",
    label: "Findings",
    icon: AlertTriangle,
    href: (org) => `/app/${org}/findings`,
    matches: (p, org) => p.startsWith(`/app/${org}/findings`),
  },
  {
    key: "forecast",
    label: "Forecast",
    icon: TrendingUp,
    href: (org) => `/app/${org}/forecast`,
    matches: (p, org) => p.startsWith(`/app/${org}/forecast`),
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    href: (org) => `/app/${org}/reports`,
    matches: (p, org) => p.startsWith(`/app/${org}/reports`),
  },
  {
    key: "scans",
    label: "Scans",
    icon: History,
    href: (org) => `/app/${org}/scans`,
    matches: (p, org) => p.startsWith(`/app/${org}/scans`),
  },
  {
    key: "integrations",
    label: "Integrations",
    icon: Plug,
    href: (org) => `/app/${org}/integrations`,
    matches: (p, org) => p.startsWith(`/app/${org}/integrations`),
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Boxes,
    href: (org) => `/app/${org}/aws`,
    matches: (p, org) =>
      p.startsWith(`/app/${org}/aws`) ||
      p.startsWith(`/app/${org}/azure`) ||
      p.startsWith(`/app/${org}/gcp`),
  },
] as const;

export const settingsNav: NavItem = {
  key: "settings",
  label: "Settings",
  icon: Settings,
  href: (org) => `/app/${org}/settings`,
  matches: (p, org) => p.startsWith(`/app/${org}/settings`),
};
