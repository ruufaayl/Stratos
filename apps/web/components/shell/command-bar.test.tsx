// apps/web/components/shell/command-bar.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/acme",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { OrgProvider } from "@/lib/shell/org-context";
import { CommandBarProvider, useCommandBar } from "@/lib/shell/command-bar-context";
import { CommandBar } from "./command-bar";

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <OrgProvider value={testOrg}>
      <CommandBarProvider>
        {children}
      </CommandBarProvider>
    </OrgProvider>
  );
}

// Helper component to trigger openBar from outside
function OpenBarButton() {
  const { openBar } = useCommandBar();
  return <button onClick={openBar}>Open</button>;
}

describe("CommandBar", () => {
  beforeEach(() => {
    // Clear localStorage between tests
    localStorage.clear();
  });

  it("opens and shows focused input when openBar() is called", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OpenBarButton />
        <CommandBar />
      </Wrapper>,
    );

    // Dialog should not be visible initially
    expect(screen.queryByRole("dialog")).toBeNull();

    // Open the bar
    await user.click(screen.getByRole("button", { name: "Open" }));

    // Dialog should now be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Input should be present and focused
    const input = screen.getByRole("searchbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OpenBarButton />
        <CommandBar />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("has data-command-bar-input on the input element", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <OpenBarButton />
        <CommandBar />
      </Wrapper>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    const input = screen.getByRole("searchbox");
    expect(input).toHaveAttribute("data-command-bar-input");
  });
});
