"use client";
import { OrgSwitcher } from "./org-switcher";
import { CloudSwitcher } from "./cloud-switcher";
import { UserMenu } from "./user-menu";
import { Breadcrumbs } from "./breadcrumbs";
import { useCommandBar } from "@/lib/shell/command-bar-context";
import { Search } from "lucide-react";

type Props = { orgs: { id: string; slug: string; name: string; sigilColor: string }[] };

export function TopBar({ orgs }: Props) {
  const { openBar } = useCommandBar();
  return (
    <header className="col-start-2 row-start-1 flex items-center gap-3 px-4 border-b border-border-subtle bg-bg-canvas h-[60px]">
      <OrgSwitcher orgs={orgs} />
      <span aria-hidden className="text-text-faint">›</span>
      <div className="flex-1 min-w-0"><Breadcrumbs /></div>
      <button
        onClick={openBar}
        className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-border-subtle text-mono-sm font-mono text-text-muted hover:text-text-primary hover:border-border-strong"
        aria-label="Open command bar"
      >
        <Search className="size-3.5" /> Search… <kbd className="ml-2 text-text-faint">⌘K</kbd>
      </button>
      <CloudSwitcher />
      <UserMenu />
    </header>
  );
}
