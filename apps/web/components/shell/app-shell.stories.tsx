import type { Meta, StoryObj } from "@storybook/react";
import { AppShell } from "./app-shell";
import {
  DEMO_ORG_VALUE,
  TWELVE_ORGS,
  makeOrg,
} from "./shell-storybook-harness";

const meta: Meta<typeof AppShell> = {
  title: "Shell/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof AppShell>;

const PAGE_CONTENT = (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "#64748B",
      fontFamily: "var(--font-sans, sans-serif)",
      fontSize: 14,
    }}
  >
    Page content goes here
  </div>
);

const SINGLE_ORG = [makeOrg("org_demo", "acme", "Acme Corp", "#6366F1")];

export const Default: Story = {
  name: "Default (collapsed rail)",
  args: {
    org: DEMO_ORG_VALUE,
    orgs: SINGLE_ORG,
    clouds: { available: ["aws"], initial: "aws" },
    initialRailCollapsed: true,
    children: PAGE_CONTENT,
  },
};

export const ExpandedRail: Story = {
  name: "Expanded rail",
  args: {
    org: DEMO_ORG_VALUE,
    orgs: SINGLE_ORG,
    clouds: { available: ["aws"], initial: "aws" },
    initialRailCollapsed: false,
    children: PAGE_CONTENT,
  },
};

export const SingleOrgSingleCloud: Story = {
  name: "Single org, single cloud",
  args: {
    org: DEMO_ORG_VALUE,
    orgs: SINGLE_ORG,
    clouds: { available: ["aws"], initial: "aws" },
    initialRailCollapsed: true,
    children: PAGE_CONTENT,
  },
};

export const MultiOrgMultiCloud: Story = {
  name: "Multi-org, multi-cloud",
  args: {
    org: DEMO_ORG_VALUE,
    orgs: TWELVE_ORGS,
    clouds: { available: ["aws", "azure", "gcp"], initial: "aws" },
    initialRailCollapsed: false,
    children: PAGE_CONTENT,
  },
};
