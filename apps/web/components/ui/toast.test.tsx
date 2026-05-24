import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./toast";

function Harness() {
  const toast = useToast();
  return <button onClick={() => toast.push({ kind: "savings", title: "Saved $1,234" })}>fire</button>;
}

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders a toast inside a polite live region and dismisses after 5s", async () => {
    render(<ToastProvider><Harness /></ToastProvider>);
    await act(async () => { screen.getByText("fire").click(); });
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Saved $1,234")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(5_500); });
    expect(screen.queryByText("Saved $1,234")).toBeNull();
  });
});
