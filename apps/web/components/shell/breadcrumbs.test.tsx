// apps/web/components/shell/breadcrumbs.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./breadcrumbs";
import { OrgProvider } from "@/lib/shell/org-context";
import type { ReactNode } from "react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/navigation — deep path with 5 segments after /app/acme
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/acme/settings/members/invite",
}));

const testOrg = {
  org: { id: "o1", slug: "acme", name: "Acme", sigilColor: "#6366F1" },
  role: "admin" as const,
  switchTo: async () => {},
};

function Wrapper({ children }: { children: ReactNode }) {
  return <OrgProvider value={testOrg}>{children}</OrgProvider>;
}

describe("Breadcrumbs", () => {
  it("renders exactly 3 visible segments for /app/acme/settings/members/invite", () => {
    render(<Breadcrumbs />, { wrapper: Wrapper });
    // Should show: Settings › Members › Invite (last 3 of [settings, members, invite])
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Invite")).toBeInTheDocument();
  });

  it("last segment is not a link (aria-current=page)", () => {
    render(<Breadcrumbs />, { wrapper: Wrapper });
    const lastSegment = screen.getByText("Invite");
    // Should be a span, not an anchor
    expect(lastSegment.tagName).toBe("SPAN");
    expect(lastSegment).toHaveAttribute("aria-current", "page");
  });

  it("non-last segments are links", () => {
    render(<Breadcrumbs />, { wrapper: Wrapper });
    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toBeInTheDocument();
  });
});
