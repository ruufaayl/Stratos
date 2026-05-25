import type { Meta, StoryObj } from "@storybook/react";
import { CloudCard } from "./cloud-card";

const meta: Meta<typeof CloudCard> = {
  title: "Welcome/CloudCard",
  component: CloudCard,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
};
export default meta;

type Story = StoryObj<typeof CloudCard>;

/** AWS card in the default available state — shows the "Connect →" CTA. */
export const Available: Story = {
  args: {
    cloud: "aws",
    status: "available",
    href: "/app/acme/integrations/connect/aws",
  },
};

/** AWS card in the coming-soon state — greyed out, no link, no CTA. */
export const ComingSoon: Story = {
  args: {
    cloud: "aws",
    status: "coming-soon",
    href: "/app/acme/integrations/connect/aws",
  },
};

/**
 * AWS card in the connected state — shows the green chip, account count,
 * and "View →" CTA.
 */
export const Connected: Story = {
  args: {
    cloud: "aws",
    status: "connected",
    href: "/app/acme/integrations/connect/aws",
    connectedCount: 3,
  },
};

/** All three states side-by-side for visual comparison. */
export const AllStates: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <CloudCard
        cloud="aws"
        status="available"
        href="/app/acme/integrations/connect/aws"
      />
      <CloudCard
        cloud="aws"
        status="coming-soon"
        href="/app/acme/integrations/connect/aws"
      />
      <CloudCard
        cloud="aws"
        status="connected"
        href="/app/acme/integrations/connect/aws"
        connectedCount={3}
      />
    </div>
  ),
};
