"use client";
import * as React from "react";

export type Role = "owner" | "admin" | "member";
export type OrgValue = {
  org: { id: string; slug: string; name: string; sigilColor: string };
  role: Role;
  switchTo: (slug: string) => Promise<void>;
};

const Ctx = React.createContext<OrgValue | null>(null);

export function OrgProvider({ value, children }: { value: OrgValue; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrg(): OrgValue {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useOrg must be used inside <OrgProvider>");
  return v;
}
