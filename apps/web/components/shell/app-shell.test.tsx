// apps/web/components/shell/app-shell.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "./app-shell";
import type { ReactNode } from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/acme",
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock Clerk hooks used by UserMenu
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

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme Corp", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

const orgs = [
  { id: "o1", slug: "acme", name: "Acme Corp", sigilColor: "#6366F1" },
];

describe("AppShell", () => {
  it("smoke: renders rail nav item 'Overview' and topbar org name", () => {
    render(
      <AppShell
        org={testOrg}
        orgs={orgs}
        clouds={{ available: ["aws"], initial: "aws" }}
        initialRailCollapsed={false}
      >
        <div data-testid="child">child content</div>
      </AppShell>,
    );

    // Rail renders primary nav — "Overview" is the first item
    expect(screen.getByRole("link", { name: /overview/i })).toBeInTheDocument();

    // TopBar renders org name via OrgSwitcher
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
