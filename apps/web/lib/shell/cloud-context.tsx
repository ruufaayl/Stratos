"use client";
import * as React from "react";

export type Cloud = "aws" | "azure" | "gcp";
export type CloudValue = {
  active: Cloud;
  available: readonly Cloud[];
  setActive: (c: Cloud) => void;
};

const Ctx = React.createContext<CloudValue | null>(null);

export function CloudProvider({
  orgId, available, initial, children,
}: { orgId: string; available: readonly Cloud[]; initial: Cloud; children: React.ReactNode }) {
  const [active, setActive] = React.useState<Cloud>(initial);

  const commit = React.useCallback((c: Cloud) => {
    setActive(c);
    try { localStorage.setItem(`stratos.activeCloud.${orgId}`, c); } catch {}
  }, [orgId]);

  return <Ctx.Provider value={{ active, available, setActive: commit }}>{children}</Ctx.Provider>;
}

export function useCloud(): CloudValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useCloud must be used inside <CloudProvider>");
  return v;
}
