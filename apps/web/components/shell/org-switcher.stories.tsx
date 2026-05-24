import type { Meta, StoryObj } from "@storybook/react";
import { OrgSwitcher } from "./org-switcher";
import {
  ShellStorybookHarness,
  DEMO_ORG_VALUE,
  TWELVE_ORGS,
  makeOrg,
} from "./shell-storybook-harness";

const meta: Meta<typeof OrgSwitcher> = {
  title: "Shell/OrgSwitcher",
  component: OrgSwitcher,
  decorators: [
    (Story) => (
      <ShellStorybookHarness org={DEMO_ORG_VALUE}>
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </ShellStorybookHarness>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof OrgSwitcher>;

export const SingleOrg: Story = {
  name: "1 org (read-only trigger)",
  args: {
    orgs: [makeOrg("org_demo", "acme", "Acme Corp", "#6366F1")],
  },
};

export const TwelveOrgs: Story = {
  name: "12 orgs (searchable)",
  args: {
    orgs: TWELVE_ORGS,
  },
};
