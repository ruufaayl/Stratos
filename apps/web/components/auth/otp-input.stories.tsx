import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { OtpInput } from "./otp-input";

const meta: Meta<typeof OtpInput> = {
  title: "Auth/OtpInput",
  component: OtpInput,
  parameters: {
    layout: "centered",
    backgrounds: { default: "dark" },
  },
};
export default meta;

type Story = StoryObj<typeof OtpInput>;

function OtpEmpty() {
  const [value, setValue] = React.useState("");
  return <OtpInput value={value} onChange={setValue} />;
}

function OtpPreFilled() {
  const [value, setValue] = React.useState("483920");
  return <OtpInput value={value} onChange={setValue} />;
}

/** Empty — waiting for user input */
export const Empty: Story = {
  render: () => <OtpEmpty />,
};

/** Pre-filled — code already entered */
export const PreFilled: Story = {
  render: () => <OtpPreFilled />,
};
