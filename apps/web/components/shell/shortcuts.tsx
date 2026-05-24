"use client";
import * as React from "react";
import { shortcuts, SEQUENCE_WINDOW_MS } from "@/lib/shell/shortcuts";
import type { Shortcut } from "@/lib/shell/shortcuts";

type ActionKey = Shortcut["actionKey"];
type Actions = Partial<Record<ActionKey, () => void>>;

export function Shortcuts({ actions }: { actions: Actions }) {
  // Keep actions in a ref so the event listener always sees the latest values
  // without needing to re-register on every render.
  const actionsRef = React.useRef<Actions>(actions);
  React.useEffect(() => {
    actionsRef.current = actions;
  });

  React.useEffect(() => {
    let lastKey: string | null = null;
    let lastAt = 0;

    /**
     * Returns true if the event target is a "typing target" (input/textarea/contenteditable)
     * but NOT the command-bar input (which should still receive global shortcuts).
     */
    function isTypingTarget(t: EventTarget | null): boolean {
      if (!(t instanceof HTMLElement)) return false;
      // If this element (or any ancestor) is the command-bar input, do NOT suppress
      if (t.closest("[data-command-bar-input]")) return false;
      return (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      );
    }

    function onKey(e: KeyboardEvent) {
      // Suppress shortcuts when typing in a regular input/textarea/contenteditable
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const k = e.key;
      const now = Date.now();

      for (const s of shortcuts) {
        const keys = s.keys as readonly string[];

        if (keys.length === 1) {
          // Single-key shortcut (no mod-key prefix in the shortcut definition)
          const a = keys[0];
          if (!mod && k === a) {
            const fn = actionsRef.current[s.actionKey];
            if (fn) {
              e.preventDefault();
              fn();
              return;
            }
          }
        } else {
          // Two-key shortcut: either ["mod", "x"] or ["g", "o"] sequence
          const a = keys[0] as string;
          const b = keys[1] as string;

          if (a === "mod") {
            // Mod-key combo: e.g. ["mod", "k"] → Cmd/Ctrl + k
            if (mod && k.toLowerCase() === b.toLowerCase()) {
              const fn = actionsRef.current[s.actionKey];
              if (fn) {
                e.preventDefault();
                fn();
                return;
              }
            }
          } else {
            // Sequence: e.g. ["g", "o"] — requires first key stored within window
            if (
              !mod &&
              lastKey === a.toLowerCase() &&
              now - lastAt < SEQUENCE_WINDOW_MS &&
              k === b
            ) {
              const fn = actionsRef.current[s.actionKey];
              if (fn) {
                e.preventDefault();
                lastKey = null;
                fn();
                return;
              }
            }
          }
        }
      }

      // Update sequence state for the next key press.
      // Only track single lowercase letters (potential first keys in sequences).
      if (!mod && /^[a-z]$/i.test(k)) {
        lastKey = k.toLowerCase();
        lastAt = now;
      } else {
        lastKey = null;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Only run once on mount — actionsRef always has current actions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
