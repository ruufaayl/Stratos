"use client";
import { usePathname } from "next/navigation";
import { primaryNav, settingsNav } from "@/lib/shell/nav-registry";
import { useOrg } from "@/lib/shell/org-context";
import { useRail } from "@/lib/shell/rail-context";
import { RailItem } from "./rail-item";
import { RailToggle } from "./rail-toggle";
import { cn } from "@/lib/utils";

export function Rail() {
  const pathname = usePathname() ?? "";
  const { org } = useOrg();
  const { collapsed } = useRail();

  return (
    <aside
      data-rail={collapsed ? "collapsed" : "expanded"}
      style={{ width: collapsed ? 64 : 220 }}
      className={cn(
        "row-span-2 border-r border-border-subtle bg-bg-canvas",
        "flex flex-col py-3 transition-[width] duration-300 ease-out",
      )}
      aria-label="Primary"
    >
      <div className="flex-1 flex flex-col gap-1 px-1">
        {primaryNav.map((item) => (
          <RailItem
            key={item.key}
            href={item.href(org.slug)}
            icon={item.icon}
            label={item.label}
            active={item.matches(pathname, org.slug)}
            collapsed={collapsed}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1 px-1 mt-2">
        <RailItem
          href={settingsNav.href(org.slug)}
          icon={settingsNav.icon}
          label={settingsNav.label}
          active={settingsNav.matches(pathname, org.slug)}
          collapsed={collapsed}
        />
        <div className="px-2 pt-2"><RailToggle /></div>
      </div>
    </aside>
  );
}
