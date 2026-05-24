"use client";
import * as React from "react";

export type CommandBarValue = {
  open: boolean;
  query: string;
  selectedIndex: number;
  openBar: () => void;
  closeBar: () => void;
  setQuery: (q: string) => void;
  setSelectedIndex: (i: number) => void;
};

const Ctx = React.createContext<CommandBarValue | null>(null);

export function CommandBarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const openBar = React.useCallback(() => { setOpen(true); setSelectedIndex(0); }, []);
  const closeBar = React.useCallback(() => {
    setOpen(false);
    setTimeout(() => { setQuery(""); setSelectedIndex(0); }, 200);
  }, []);

  return (
    <Ctx.Provider value={{ open, query, selectedIndex, openBar, closeBar, setQuery, setSelectedIndex }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCommandBar(): CommandBarValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useCommandBar must be used inside <CommandBarProvider>");
  return v;
}
