"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type ModalRootProps = React.ComponentProps<typeof Dialog.Root>;

function ModalRoot(props: ModalRootProps) {
  return <Dialog.Root {...props} />;
}

ModalRoot.Trigger = Dialog.Trigger;
ModalRoot.Close = Dialog.Close;

export const Modal = ModalRoot;

export function ModalContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className="fixed inset-0 bg-black/60 z-50
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
      />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-md bg-bg-elevated border border-border-strong rounded-modal p-6 z-50",
          "shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2",
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export function ModalTitle(props: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      {...props}
      className={cn(
        "text-[18px] font-semibold text-text-primary mb-1",
        props.className,
      )}
    />
  );
}

export function ModalDescription(
  props: React.ComponentProps<typeof Dialog.Description>,
) {
  return (
    <Dialog.Description
      {...props}
      className={cn("text-[13px] text-text-secondary", props.className)}
    />
  );
}
