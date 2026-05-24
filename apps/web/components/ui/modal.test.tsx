import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "./modal";

function Harness() {
  return (
    <Modal>
      <Modal.Trigger asChild><button>Open</button></Modal.Trigger>
      <ModalContent>
        <ModalTitle>Confirm</ModalTitle>
        <ModalDescription>Are you sure?</ModalDescription>
      </ModalContent>
    </Modal>
  );
}

describe("Modal", () => {
  it("opens on trigger and closes on ESC", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("labels the dialog with the title for screen readers", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Confirm");
    expect(dialog).toHaveAccessibleDescription("Are you sure?");
  });
});
