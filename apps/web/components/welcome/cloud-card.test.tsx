import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CloudCard } from "./cloud-card";

describe("CloudCard", () => {
  it('status="available" renders a link with href, shows CTA, no Coming soon chip', () => {
    render(
      <CloudCard
        cloud="aws"
        status="available"
        href="/app/my-org/integrations/connect/aws"
      />,
    );
    // The card should be wrapped in an <a> with the correct href
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/app/my-org/integrations/connect/aws");
    // Primary CTA text
    expect(screen.getByText("Connect →")).toBeInTheDocument();
    // No "Coming soon" chip
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('status="coming-soon" renders no link, shows Coming soon chip', () => {
    render(
      <CloudCard
        cloud="azure"
        status="coming-soon"
        href="#"
      />,
    );
    // No anchor tag
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    // "Coming soon" chip visible
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });

  it('status="connected" shows "✓ Connected" text and connectedCount', () => {
    render(
      <CloudCard
        cloud="aws"
        status="connected"
        href="/app/my-org/integrations"
        connectedCount={3}
      />,
    );
    // Connected text
    expect(screen.getByText(/✓ Connected/)).toBeInTheDocument();
    // Count
    expect(screen.getByText(/3 accounts/)).toBeInTheDocument();
  });
});
