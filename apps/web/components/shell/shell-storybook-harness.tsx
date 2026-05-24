/**
 * ShellStorybookHarness
 *
 * Provides all four shell context providers (Org, Cloud, Rail, CommandBar) with
 * synthetic state for Storybook stories. Does NOT call any Clerk hooks.
 *
 * Usage:
 *   decorators: [(Story) => <ShellStorybookHarness {...overrides}><Story /></ShellStorybookHarness>]
 */
import * as React from "react";
import { OrgProvider, type OrgValue } from "@/lib/shell/org-context";
import { CloudProvider, type Cloud } from "@/lib/shell/cloud-context";
import { RailProvider } from "@/lib/shell/rail-context";
import { CommandBarProvider } from "@/lib/shell/command-bar-context";

// ---------------------------------------------------------------------------
// Synthetic defaults
// ---------------------------------------------------------------------------

export const DEMO_ORG: OrgValue["org"] = {
  id: "org_demo",
  slug: "acme",
  name: "Acme Corp",
  sigilColor: "#6366F1",
};

export const DEMO_ORG_VALUE: OrgValue = {
  org: DEMO_ORG,
  role: "owner",
  switchTo: async () => {},
};

// ---------------------------------------------------------------------------
// Harness component
// ---------------------------------------------------------------------------

type HarnessProps = {
  children: React.ReactNode;
  org?: OrgValue;
  available?: readonly Cloud[];
  initialCloud?: Cloud;
  railCollapsed?: boolean;
};

export function ShellStorybookHarness({
  children,
  org = DEMO_ORG_VALUE,
  available = ["aws"],
  initialCloud = "aws",
  railCollapsed = true,
}: HarnessProps) {
  return (
    <OrgProvider value={org}>
      <CloudProvider
        orgId={org.org.id}
        available={available}
        initial={initialCloud}
      >
        <RailProvider initial={railCollapsed}>
          <CommandBarProvider>{children}</CommandBarProvider>
        </RailProvider>
      </CloudProvider>
    </OrgProvider>
  );
}

// ---------------------------------------------------------------------------
// Multi-org factory
// ---------------------------------------------------------------------------

export function makeOrg(
  id: string,
  slug: string,
  name: string,
  sigilColor: string,
): { id: string; slug: string; name: string; sigilColor: string } {
  return { id, slug, name, sigilColor };
}

export const TWELVE_ORGS = [
  makeOrg("org_1", "acme",       "Acme Corp",         "#6366F1"),
  makeOrg("org_2", "globex",     "Globex Inc",         "#10B981"),
  makeOrg("org_3", "initech",    "Initech",            "#F59E0B"),
  makeOrg("org_4", "umbrella",   "Umbrella Co",        "#EF4444"),
  makeOrg("org_5", "wayne-ent",  "Wayne Enterprises",  "#8B5CF6"),
  makeOrg("org_6", "stark-ind",  "Stark Industries",   "#EC4899"),
  makeOrg("org_7", "oscorp",     "Oscorp",             "#06B6D4"),
  makeOrg("org_8", "dunder",     "Dunder Mifflin",     "#84CC16"),
  makeOrg("org_9", "vandelay",   "Vandelay Industries","#F97316"),
  makeOrg("org_10","pied-piper", "Pied Piper",         "#A78BFA"),
  makeOrg("org_11","hooli",      "Hooli",              "#FCD34D"),
  makeOrg("org_12","prestige",   "Prestige Worldwide", "#34D399"),
];
