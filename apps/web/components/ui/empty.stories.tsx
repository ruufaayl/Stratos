import type { Meta, StoryObj } from "@storybook/react";
import { Empty } from "./empty";
import { Button } from "./button";

const meta: Meta<typeof Empty> = { title: "Primitives/Empty", component: Empty };
export default meta;
type Story = StoryObj<typeof Empty>;

export const NoAccount: Story = {
  args: {
    title: "Connect your AWS account",
    body: "Stratos analyzes read-only billing + telemetry. Two minutes to set up. We can't touch any resource.",
    action: <Button>Connect AWS</Button>,
  },
};

export const NoFindings: Story = {
  args: {
    title: "Nothing to flag",
    body: "Every resource scanned is within healthy thresholds. We'll alert you the moment that changes.",
  },
};
