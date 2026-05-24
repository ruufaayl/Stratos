// apps/web/lib/shell/org-context.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrgProvider, useOrg } from "./org-context";

function Probe() {
  const { org, role } = useOrg();
  return <div>{org.slug}-{role}</div>;
}

describe("OrgContext", () => {
  it("exposes org + role to children", () => {
    render(
      <OrgProvider value={{ org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" }, role: "admin", switchTo: async () => {} }}>
        <Probe />
      </OrgProvider>
    );
    expect(screen.getByText("acme-admin")).toBeInTheDocument();
  });

  it("throws if used outside provider", () => {
    expect(() => render(<Probe />)).toThrow(/useOrg.*OrgProvider/);
  });
});
