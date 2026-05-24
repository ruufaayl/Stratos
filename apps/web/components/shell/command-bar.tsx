"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Modal, ModalContent } from "@/components/ui/modal";
import { useCommandBar } from "@/lib/shell/command-bar-context";
import { Search } from "lucide-react";

export function CommandBar() {
  const { open, closeBar, query, setQuery } = useCommandBar();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      // Use requestAnimationFrame to ensure the modal is rendered before focusing
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  return (
    <Modal open={open} onOpenChange={(v) => !v && closeBar()}>
      <ModalContent className="max-w-2xl p-0 top-[30%]" aria-describedby={undefined}>
        <Dialog.Title className="sr-only">Command bar</Dialog.Title>
        <div className="flex items-center gap-2 px-3 h-12 border-b border-border-subtle">
          <Search className="size-4 text-text-muted" aria-hidden />
          <input
            ref={inputRef}
            role="searchbox"
            data-command-bar-input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search resources, or jump…"
            aria-label="Command bar — type to search"
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-faint"
          />
          <kbd className="text-mono-sm text-text-faint font-mono">Esc</kbd>
        </div>
        <div className="p-2 min-h-[280px]">
          <CommandBarResults />
        </div>
      </ModalContent>
    </Modal>
  );
}

function CommandBarResults() {
  return (
    <div className="text-sm text-text-muted px-2 py-8 text-center">
      Type to search…
    </div>
  );
}
