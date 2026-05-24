// apps/web/components/shell/org-switcher.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrgSwitcher } from "./org-switcher";
import { OrgProvider } from "@/lib/shell/org-context";
import type { ReactNode } from "react";

const pushSpy = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushSpy }),
  usePathname: () => "/app/acme/findings",
}));

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return <OrgProvider value={testOrg}>{children}</OrgProvider>;
}

const singleOrg = [{ id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" }];
const multiOrgs = [
  { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  { id: "o2", slug: "contoso", name: "Contoso", sigilColor: "#10B981" },
  { id: "o3", slug: "widgets", name: "Widgets Inc", sigilColor: "#F59E0B" },
];

describe("OrgSwitcher", () => {
  it("with 1 org, trigger is disabled (not interactive)", () => {
    render(<OrgSwitcher orgs={singleOrg} />, { wrapper: Wrapper });
    const trigger = screen.getByRole("button");
    // Radix v2 Trigger with disabled={true} sets the native disabled attribute
    expect(trigger).toBeDisabled();
  });

  it("with 3 orgs, clicking trigger shows org items", async () => {
    const user = userEvent.setup();
    render(<OrgSwitcher orgs={multiOrgs} />, { wrapper: Wrapper });
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    expect(within(document.body).getByText("Contoso")).toBeInTheDocument();
  });

  it("selecting another org calls router.push preserving section path", async () => {
    pushSpy.mockClear();
    const user = userEvent.setup();
    render(<OrgSwitcher orgs={multiOrgs} />, { wrapper: Wrapper });
    const trigger = screen.getByRole("button");
    await user.click(trigger);
    const contosoItem = within(document.body).getByText("Contoso");
    await user.click(contosoItem);
    expect(pushSpy).toHaveBeenCalledWith("/app/contoso/findings");
  });
});
