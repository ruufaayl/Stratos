"use client";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useRail } from "@/lib/shell/rail-context";
import { Button } from "@/components/ui/button";

export function RailToggle() {
  const { collapsed, toggle } = useRail();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <Button
      intent="ghost"
      size="sm"
      onClick={toggle}
      aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      aria-pressed={!collapsed}
      className="w-full justify-center"
    >
      <Icon className="size-4" />
    </Button>
  );
}
