import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SigilPicker, SIGIL_COLORS } from "./sigil-picker";

const meta: Meta<typeof SigilPicker> = {
  title: "Auth/SigilPicker",
  component: SigilPicker,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
};
export default meta;

type Story = StoryObj<typeof SigilPicker>;

/** Default — interactive colour picker with first colour pre-selected */
export const Default: Story = {
  render: () => {
    const [color, setColor] = React.useState<string>(SIGIL_COLORS[0]);
    return <SigilPicker value={color} onChange={setColor} />;
  },
};
