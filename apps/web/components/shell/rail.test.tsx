// apps/web/components/shell/rail.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Rail } from "./rail";
import { OrgProvider } from "@/lib/shell/org-context";
import { RailProvider } from "@/lib/shell/rail-context";
import type { ReactNode } from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/acme/findings",
}));

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <OrgProvider value={testOrg}>
      <RailProvider initial={false}>
        {children}
      </RailProvider>
    </OrgProvider>
  );
}

describe("Rail", () => {
  it("Findings item has aria-current=page when pathname is /app/acme/findings", () => {
    render(<Rail />, { wrapper: Wrapper });
    const findingsLink = screen.getByRole("link", { name: /findings/i });
    expect(findingsLink).toHaveAttribute("aria-current", "page");
  });

  it("Other nav items do not have aria-current=page", () => {
    render(<Rail />, { wrapper: Wrapper });
    const allLinks = screen.getAllByRole("link");
    const nonActive = allLinks.filter((l) => l.textContent?.toLowerCase() !== "findings" &&
      l.getAttribute("aria-current") === "page"
    );
    expect(nonActive).toHaveLength(0);
  });
});
