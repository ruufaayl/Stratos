import type { Meta, StoryObj } from "@storybook/react";
import { Stat } from "./stat";
import { Chip } from "./chip";

const meta: Meta<typeof Stat> = { title: "Primitives/Stat", component: Stat };
export default meta;
type Story = StoryObj<typeof Stat>;

export const Default: Story = {
  args: {
    label: "Monthly waste",
    value: "$7,097,364",
    srDescription: "7,097,364 dollars per month of cloud waste",
    caption: "across 248,458 resources",
  },
};

export const Hero: Story = {
  args: { label: "Monthly waste", value: "$7.1M", size: "lg", tone: "waste", caption: "live engine" },
};

export const WithDelta: Story = {
  args: {
    label: "Identified",
    value: "$2.4M",
    tone: "savings",
    delta: <Chip kind="savings" size="sm">▲ 91%</Chip>,
  },
};
