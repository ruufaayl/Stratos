"use client";
import * as React from "react";

export type RailValue = { collapsed: boolean; toggle: () => void; setCollapsed: (v: boolean) => void };
const Ctx = React.createContext<RailValue | null>(null);

const DEBOUNCE = 300;

export function RailProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = React.useState(initial);
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = React.useCallback((v: boolean) => {
    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      fetch("/api/me/preferences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ railCollapsed: v }),
      }).catch(() => { /* silent */ });
    }, DEBOUNCE);
  }, []);

  const setCollapsed = React.useCallback((v: boolean) => { setCollapsedState(v); persist(v); }, [persist]);
  const toggle = React.useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  return <Ctx.Provider value={{ collapsed, toggle, setCollapsed }}>{children}</Ctx.Provider>;
}

export function useRail(): RailValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useRail must be used inside <RailProvider>");
  return v;
}
