// apps/web/components/shell/shortcuts.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import * as React from "react";
import { Shortcuts } from "./shortcuts";

describe("Shortcuts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("dispatches g then o within 1.5s → gotoOverview callback fired", () => {
    vi.useFakeTimers();
    const gotoOverview = vi.fn();
    render(<Shortcuts actions={{ gotoOverview }} />);

    act(() => {
      fireEvent.keyDown(window, { key: "g" });
    });
    act(() => {
      vi.advanceTimersByTime(500);
      fireEvent.keyDown(window, { key: "o" });
    });

    expect(gotoOverview).toHaveBeenCalledOnce();
  });

  it("dispatches g then o after 2s → callback NOT fired (sequence timed out)", () => {
    vi.useFakeTimers();
    const gotoOverview = vi.fn();
    render(<Shortcuts actions={{ gotoOverview }} />);

    act(() => {
      fireEvent.keyDown(window, { key: "g" });
    });
    act(() => {
      vi.advanceTimersByTime(2000);
      fireEvent.keyDown(window, { key: "o" });
    });

    expect(gotoOverview).not.toHaveBeenCalled();
  });

  it("dispatches ⌘K → openCommandBar callback fired AND preventDefault called", () => {
    const openCommandBar = vi.fn();
    render(<Shortcuts actions={{ openCommandBar }} />);

    // Spy on Event.prototype.preventDefault since fireEvent creates real events
    const preventDefaultSpy = vi.spyOn(Event.prototype, "preventDefault");
    act(() => {
      fireEvent.keyDown(window, {
        key: "k",
        metaKey: true,
      });
    });

    expect(openCommandBar).toHaveBeenCalledOnce();
    expect(preventDefaultSpy).toHaveBeenCalled();
    preventDefaultSpy.mockRestore();
  });

  it("when focus is in a regular <input>, g then o does NOT fire", () => {
    vi.useFakeTimers();
    const gotoOverview = vi.fn();
    const { container } = render(
      <div>
        <input data-testid="regular-input" />
        <Shortcuts actions={{ gotoOverview }} />
      </div>,
    );

    const input = container.querySelector("input[data-testid='regular-input']")!;

    act(() => {
      fireEvent.keyDown(input, { key: "g" });
    });
    act(() => {
      vi.advanceTimersByTime(200);
      fireEvent.keyDown(input, { key: "o" });
    });

    expect(gotoOverview).not.toHaveBeenCalled();
  });

  it("when focus is in data-command-bar-input, Escape still works (modal scope)", () => {
    const dismissTopOverlay = vi.fn();
    const { container } = render(
      <div>
        {/* Simulate the command bar input */}
        <div data-command-bar-input>
          <input data-testid="cmd-input" />
        </div>
        <Shortcuts actions={{ dismissTopOverlay }} />
      </div>,
    );

    const cmdInput = container.querySelector("input[data-testid='cmd-input']")!;

    // Fire Escape from the command bar input — it should still work
    // because isTypingTarget returns false for elements inside [data-command-bar-input]
    act(() => {
      fireEvent.keyDown(cmdInput, { key: "Escape" });
    });

    expect(dismissTopOverlay).toHaveBeenCalledOnce();
  });

  it("ctrl+K also triggers openCommandBar (non-Mac fallback)", () => {
    const openCommandBar = vi.fn();
    render(<Shortcuts actions={{ openCommandBar }} />);

    const preventDefaultSpy = vi.fn();
    act(() => {
      fireEvent.keyDown(window, {
        key: "k",
        ctrlKey: true,
        preventDefault: preventDefaultSpy,
      });
    });

    expect(openCommandBar).toHaveBeenCalledOnce();
  });
});
