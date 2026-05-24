import type { Meta, StoryObj } from "@storybook/react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "./modal";
import { Button } from "./button";

const meta: Meta = { title: "Primitives/Modal" };
export default meta;
type Story = StoryObj;

export const Confirm: Story = {
  render: () => (
    <Modal>
      <Modal.Trigger asChild><Button intent="destructive">Delete account</Button></Modal.Trigger>
      <ModalContent>
        <ModalTitle>Delete this account?</ModalTitle>
        <ModalDescription>
          We&apos;ll stop scanning and purge historical findings after 30 days. This can&apos;t be undone.
        </ModalDescription>
        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
          <Modal.Close asChild><Button intent="ghost">Cancel</Button></Modal.Close>
          <Modal.Close asChild><Button intent="destructive">Delete</Button></Modal.Close>
        </div>
      </ModalContent>
    </Modal>
  ),
};
