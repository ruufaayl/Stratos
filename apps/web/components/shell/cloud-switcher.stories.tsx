import type { Meta, StoryObj } from "@storybook/react";
import { CloudSwitcher } from "./cloud-switcher";
import { ShellStorybookHarness, DEMO_ORG_VALUE } from "./shell-storybook-harness";

const meta: Meta<typeof CloudSwitcher> = {
  title: "Shell/CloudSwitcher",
  component: CloudSwitcher,
  decorators: [
    (Story) => (
      <ShellStorybookHarness
        org={DEMO_ORG_VALUE}
        available={["aws", "azure", "gcp"]}
        initialCloud="aws"
      >
        <div style={{ padding: 24 }}>
          <Story />
        </div>
      </ShellStorybookHarness>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CloudSwitcher>;

export const ThreeClouds: Story = {
  name: "3 clouds (AWS / Azure / GCP)",
};
