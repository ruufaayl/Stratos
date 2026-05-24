import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./chip";

const meta: Meta<typeof Chip> = {
  title: "Primitives/Chip",
  component: Chip,
  args: { children: "savings" },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Semantic: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Chip kind="intelligence">Intelligence</Chip>
      <Chip kind="savings">Savings</Chip>
      <Chip kind="waste">Waste</Chip>
      <Chip kind="risk">Risk</Chip>
      <Chip kind="neutral">Neutral</Chip>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Chip size="sm" kind="intelligence">sm</Chip>
      <Chip size="md" kind="intelligence">md</Chip>
    </div>
  ),
};
