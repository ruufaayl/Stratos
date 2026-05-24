import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { RailProvider, useRail } from "./rail-context";

function Probe() {
  const { collapsed, toggle, setCollapsed } = useRail();
  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <button onClick={toggle}>toggle</button>
      <button onClick={() => setCollapsed(true)}>collapse</button>
      <button onClick={() => setCollapsed(false)}>expand</button>
    </div>
  );
}

describe("RailContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("toggle flips collapsed state", () => {
    render(
      <RailProvider initial={false}>
        <Probe />
      </RailProvider>
    );
    expect(screen.getByTestId("collapsed").textContent).toBe("false");
    act(() => { fireEvent.click(screen.getByRole("button", { name: "toggle" })); });
    expect(screen.getByTestId("collapsed").textContent).toBe("true");
  });

  it("setCollapsed(true) calls fetch after 300ms debounce", () => {
    render(
      <RailProvider initial={false}>
        <Probe />
      </RailProvider>
    );
    act(() => { fireEvent.click(screen.getByRole("button", { name: "collapse" })); });
    expect(global.fetch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(300); });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/me/preferences",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ railCollapsed: true }),
      })
    );
  });

  it("throws if used outside provider", () => {
    expect(() => render(<Probe />)).toThrow(/useRail.*RailProvider/);
  });
});
