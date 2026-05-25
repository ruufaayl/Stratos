import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FindingFilterBar } from "./finding-filter-bar";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("FindingFilterBar", () => {
  beforeEach(() => mockPush.mockClear());

  it("renders all 6 filter options", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("Rightsize")).toBeInTheDocument();
    expect(screen.getByText("Anomaly")).toBeInTheDocument();
    expect(screen.getByText("Commitment")).toBeInTheDocument();
    expect(screen.getByText("Zombie")).toBeInTheDocument();
  });

  it("'All' is aria-pressed='true' when currentKind is null", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    expect(screen.getByText("All").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Idle").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("'Idle' is aria-pressed='true' when currentKind is 'idle'", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind="idle" />);
    expect(screen.getByText("Idle").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("All").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking 'Idle' navigates to ?kind=idle", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    fireEvent.click(screen.getByText("Idle"));
    expect(mockPush).toHaveBeenCalledWith("/app/acme/findings?kind=idle");
  });

  it("clicking 'All' navigates to base findings URL (no kind param)", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind="idle" />);
    fireEvent.click(screen.getByText("All"));
    expect(mockPush).toHaveBeenCalledWith("/app/acme/findings");
  });
});
