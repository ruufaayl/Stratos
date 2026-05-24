// apps/web/lib/shell/shortcuts.ts
export type Scope = "global" | "app" | "modal";
export type ShortcutKey =
  | "mod" | "Escape" | "[" | "]" | "?" | "/"
  | "g" | "o" | "f" | "r" | "s" | "i" | "k";

export type Shortcut = {
  keys: readonly ShortcutKey[];      // single key OR sequence (e.g. ["g","o"])
  label: string;
  scope: Scope;
  /** Action keys are resolved at mount-time by shortcuts.tsx — registry is pure data. */
  actionKey:
    | "openCommandBar" | "toggleRail" | "openShortcutsDialog"
    | "dismissTopOverlay"
    | "gotoOverview" | "gotoFindings" | "gotoForecast" | "gotoSettings";
};

export const shortcuts: readonly Shortcut[] = [
  { keys: ["mod","k"], label: "Open command bar",       scope: "global", actionKey: "openCommandBar" },
  { keys: ["mod","/"], label: "Open command bar",       scope: "global", actionKey: "openCommandBar" },
  { keys: ["g","o"],   label: "Go to Overview",         scope: "app",    actionKey: "gotoOverview" },
  { keys: ["g","f"],   label: "Go to Findings",         scope: "app",    actionKey: "gotoFindings" },
  { keys: ["g","r"],   label: "Go to Forecast",         scope: "app",    actionKey: "gotoForecast" },
  { keys: ["g","s"],   label: "Go to Settings",         scope: "app",    actionKey: "gotoSettings" },
  { keys: ["["],       label: "Toggle nav rail",        scope: "app",    actionKey: "toggleRail" },
  { keys: ["?"],       label: "Show keyboard shortcuts",scope: "app",    actionKey: "openShortcutsDialog" },
  { keys: ["Escape"],  label: "Dismiss overlay",        scope: "modal",  actionKey: "dismissTopOverlay" },
] as const;

export const SEQUENCE_WINDOW_MS = 1500;
