// apps/web/components/shell/rail-item.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RailItem } from "./rail-item";
import { LayoutDashboard } from "lucide-react";

// Mock next/link to a simple anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("RailItem", () => {
  it("active item has aria-current='page'", () => {
    render(
      <RailItem href="/app/acme" icon={LayoutDashboard} label="Overview" active />
    );
    expect(screen.getByRole("link")).toHaveAttribute("aria-current", "page");
  });

  it("inactive item does not have aria-current", () => {
    render(
      <RailItem href="/app/acme/findings" icon={LayoutDashboard} label="Findings" />
    );
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-current");
  });

  it("collapsed item hides label text", () => {
    render(
      <RailItem href="/app/acme" icon={LayoutDashboard} label="Overview" collapsed />
    );
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  });
});
