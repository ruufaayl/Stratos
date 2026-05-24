"use client";
import * as React from "react";
import { Modal, ModalContent, ModalTitle } from "@/components/ui/modal";
import { shortcuts } from "@/lib/shell/shortcuts";
import type { Scope } from "@/lib/shell/shortcuts";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SCOPE_LABELS: Record<Scope, string> = {
  global: "Global",
  app: "App",
  modal: "Modal",
};

const SCOPE_ORDER: Scope[] = ["global", "app", "modal"];

/**
 * Format a key combo for display.
 * ["mod","k"] → "⌘K"
 * ["g","o"] → "G then O"
 * ["Escape"] → "Esc"
 * ["["] → "["
 */
function formatKeys(keys: readonly string[]): string {
  const k0 = keys[0] ?? "";
  const k1 = keys[1] ?? "";
  if (keys.length === 2 && k0 === "mod") {
    return `⌘${k1.toUpperCase()}`;
  }
  if (keys.length === 2) {
    return `${k0.toUpperCase()} then ${k1.toUpperCase()}`;
  }
  const k = k0;
  if (k === "Escape") return "Esc";
  if (k === "?") return "?";
  return k.toUpperCase();
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: Props) {
  // Group shortcuts by scope
  const byScope = React.useMemo(() => {
    const map = new Map<Scope, typeof shortcuts[number][]>();
    for (const s of shortcuts) {
      if (!map.has(s.scope)) map.set(s.scope, []);
      map.get(s.scope)!.push(s);
    }
    return map;
  }, []);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg" aria-describedby={undefined}>
        <ModalTitle>Keyboard shortcuts</ModalTitle>
        <div className="mt-4 space-y-6">
          {SCOPE_ORDER.map((scope) => {
            const items = byScope.get(scope);
            if (!items || items.length === 0) return null;
            return (
              <div key={scope}>
                <div className="text-xs font-medium text-text-faint uppercase tracking-wider mb-2">
                  {SCOPE_LABELS[scope]}
                </div>
                <div className="space-y-1">
                  {items.map((s) => (
                    <div
                      key={s.actionKey}
                      className="flex items-center justify-between gap-4 py-1"
                    >
                      <span className="text-sm text-text-primary">
                        {s.label}
                      </span>
                      <kbd
                        className={cn(
                          "text-mono-sm font-mono text-text-faint",
                          "bg-bg-surface border border-border-subtle rounded px-1.5 py-0.5",
                          "shrink-0",
                        )}
                      >
                        {formatKeys(s.keys as readonly string[])}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ModalContent>
    </Modal>
  );
}
