import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./sparkline";

const sample = [40, 38, 32, 28, 30, 22, 18, 12, 8, 5];

const meta: Meta<typeof Sparkline> = { title: "Primitives/Sparkline", component: Sparkline };
export default meta;
type Story = StoryObj<typeof Sparkline>;

export const Savings: Story = { args: { data: sample, kind: "savings", srLabel: "Monthly savings trending up" } };
export const Waste: Story    = { args: { data: sample, kind: "waste"   } };
export const Intel: Story    = { args: { data: sample, kind: "intelligence" } };
export const Risk: Story     = { args: { data: sample, kind: "risk" } };
