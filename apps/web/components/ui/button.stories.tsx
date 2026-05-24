import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Run scan" },
  argTypes: {
    intent: { control: "select", options: ["primary","secondary","ghost","destructive"] },
    size:   { control: "select", options: ["sm","md","lg"] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { intent: "secondary" } };
export const Ghost: Story     = { args: { intent: "ghost" } };
export const Destructive: Story = { args: { intent: "destructive", children: "Delete account" } };
export const Disabled: Story  = { args: { disabled: true } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
