// apps/web/components/shell/topbar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TopBar } from "./topbar";
import { OrgProvider } from "@/lib/shell/org-context";
import { CloudProvider } from "@/lib/shell/cloud-context";
import { CommandBarProvider } from "@/lib/shell/command-bar-context";
import type { ReactNode } from "react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/acme/findings",
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "t@x.com" },
      publicMetadata: { staff: false },
    },
  }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

const openBarMock = vi.fn();

vi.mock("@/lib/shell/command-bar-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/shell/command-bar-context")>();
  return {
    ...actual,
    useCommandBar: () => ({
      open: false,
      query: "",
      selectedIndex: 0,
      openBar: openBarMock,
      closeBar: vi.fn(),
      setQuery: vi.fn(),
      setSelectedIndex: vi.fn(),
    }),
  };
});

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

const orgs = [{ id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" }];

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <OrgProvider value={testOrg}>
      <CloudProvider orgId="o1" available={["aws"]} initial="aws">
        <CommandBarProvider>
          {children}
        </CommandBarProvider>
      </CloudProvider>
    </OrgProvider>
  );
}

describe("TopBar", () => {
  it("renders header element", () => {
    render(<TopBar orgs={orgs} />, { wrapper: Wrapper });
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("clicking the ⌘K button calls openBar", () => {
    openBarMock.mockClear();
    render(<TopBar orgs={orgs} />, { wrapper: Wrapper });
    const cmdkBtn = screen.getByRole("button", { name: /open command bar/i });
    fireEvent.click(cmdkBtn);
    expect(openBarMock).toHaveBeenCalledOnce();
  });
});
