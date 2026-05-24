import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

function OpenDialog() {
  const [open, setOpen] = React.useState(true);
  return (
    <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
  );
}

const meta: Meta = {
  title: "Shell/KeyboardShortcutsDialog",
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj;

export const AllShortcuts: Story = {
  name: "Lists all shortcuts",
  render: () => <OpenDialog />,
};
