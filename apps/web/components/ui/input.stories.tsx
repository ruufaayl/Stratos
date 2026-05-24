import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = { title: "Primitives/Input", component: Input, args: { placeholder: "search resources…" } };
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: "bad value" } };
export const Disabled: Story = { args: { disabled: true } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, width: 260 }}>
      <Input size="sm" placeholder="sm" />
      <Input size="md" placeholder="md" />
      <Input size="lg" placeholder="lg" />
    </div>
  ),
};
