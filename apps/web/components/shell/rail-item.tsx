"use client";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
  collapsed?: boolean;
};

export function RailItem({ href, icon: Icon, label, active, collapsed }: Props) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex items-center gap-3 h-10 px-3 rounded-md text-sm transition-colors",
        "border-l-2 border-transparent",
        active
          ? "bg-bg-elevated text-text-primary border-intel-500"
          : "text-text-muted hover:text-text-primary hover:bg-bg-elevated/50",
        collapsed && "justify-center px-0 mx-2",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
