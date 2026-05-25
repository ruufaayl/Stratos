import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabBar } from "./tab-bar";

// next/link renders as <a> in test environment
vi.mock("next/link", () => ({
  default: ({ href, children, className, "aria-current": ariaCurrent }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: React.AnchorHTMLAttributes<HTMLAnchorElement>["aria-current"];
  }) => <a href={href} className={className} aria-current={ariaCurrent}>{children}</a>,
}));

describe("TabBar", () => {
  it("renders all four tabs", () => {
    render(<TabBar orgSlug="acme" currentTab="pulse" />);
    expect(screen.getByText("Pulse")).toBeInTheDocument();
    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Cost Map")).toBeInTheDocument();
    expect(screen.getByText("Forecast")).toBeInTheDocument();
  });

  it("links point to correct ?tab= URLs for the org", () => {
    render(<TabBar orgSlug="acme" currentTab="pulse" />);
    expect(screen.getByText("Pulse").closest("a")).toHaveAttribute("href", "/app/acme?tab=pulse");
    expect(screen.getByText("Findings").closest("a")).toHaveAttribute("href", "/app/acme?tab=feed");
    expect(screen.getByText("Cost Map").closest("a")).toHaveAttribute("href", "/app/acme?tab=map");
    expect(screen.getByText("Forecast").closest("a")).toHaveAttribute("href", "/app/acme?tab=forecast");
  });

  it("active tab has aria-current=page", () => {
    render(<TabBar orgSlug="acme" currentTab="feed" />);
    expect(screen.getByText("Findings").closest("a")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Pulse").closest("a")).not.toHaveAttribute("aria-current");
  });
});
