"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { OrgProvider, type OrgValue } from "@/lib/shell/org-context";
import { CloudProvider, type Cloud } from "@/lib/shell/cloud-context";
import { RailProvider, useRail } from "@/lib/shell/rail-context";
import { CommandBarProvider, useCommandBar } from "@/lib/shell/command-bar-context";
import { useOrg } from "@/lib/shell/org-context";
import { Rail } from "./rail";
import { TopBar } from "./topbar";
import { CommandBar } from "./command-bar";
import { Shortcuts } from "./shortcuts";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

type Props = {
  org: OrgValue;
  orgs: { id: string; slug: string; name: string; sigilColor: string }[];
  clouds: { available: readonly Cloud[]; initial: Cloud };
  initialRailCollapsed: boolean;
  children: React.ReactNode;
};

export function AppShell(p: Props) {
  return (
    <OrgProvider value={p.org}>
      <CloudProvider
        orgId={p.org.org.id}
        available={p.clouds.available}
        initial={p.clouds.initial}
      >
        <RailProvider initial={p.initialRailCollapsed}>
          <CommandBarProvider>
            <ShellLayout orgs={p.orgs}>{p.children}</ShellLayout>
          </CommandBarProvider>
        </RailProvider>
      </CloudProvider>
    </OrgProvider>
  );
}

function ShellLayout({
  orgs,
  children,
}: {
  orgs: Props["orgs"];
  children: React.ReactNode;
}) {
  const { org } = useOrg();
  const { collapsed, toggle } = useRail();
  const { openBar } = useCommandBar();
  const router = useRouter();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);

  const actions = React.useMemo(
    () => ({
      openCommandBar: openBar,
      toggleRail: toggle,
      openShortcutsDialog: () => setShortcutsOpen(true),
      dismissTopOverlay: () => {
        /* handled by Radix internally */
      },
      gotoOverview: () => router.push(`/app/${org.slug}`),
      gotoFindings: () => router.push(`/app/${org.slug}/findings`),
      gotoForecast: () => router.push(`/app/${org.slug}/forecast`),
      gotoSettings: () => router.push(`/app/${org.slug}/settings`),
    }),
    [org.slug, openBar, toggle, router],
  );

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `${collapsed ? 64 : 220}px 1fr`,
        gridTemplateRows: "60px 1fr",
        gridTemplateAreas: `"rail topbar" "rail main"`,
        height: "100dvh",
      }}
    >
      <div style={{ gridArea: "rail" }}>
        <Rail />
      </div>
      <TopBar orgs={orgs} />
      <main style={{ gridArea: "main" }} className="overflow-auto bg-bg-canvas">
        {children}
      </main>
      <CommandBar />
      <KeyboardShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
      <Shortcuts actions={actions} />
    </div>
  );
}
