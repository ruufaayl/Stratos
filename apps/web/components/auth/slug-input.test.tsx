import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import * as React from "react";
import { SlugInput } from "./slug-input";

// Mock fetch globally
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ ok: true }),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("SlugInput", () => {
  it("shows invalid format error for uppercase slug without fetching", async () => {
    render(<SlugInput value="MyOrg" onChange={() => {}} />);
    // Invalid format message should appear immediately (client-side check)
    await waitFor(() => {
      expect(screen.getByText(/invalid format/i)).toBeTruthy();
    });
    // Should not fetch for an invalid format
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("debounces fetch — does not call API immediately on render", async () => {
    vi.useFakeTimers();
    render(<SlugInput value="acme" onChange={() => {}} />);
    // Immediately after render, fetch should not have been called (still debouncing)
    expect(mockFetch).not.toHaveBeenCalled();
    // Advance less than 300ms — still no call
    act(() => { vi.advanceTimersByTime(100); });
    expect(mockFetch).not.toHaveBeenCalled();
    // Advance to past 300ms — now it should call
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("renders 'Already taken' when check-slug returns taken", async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: false, reason: "taken" }),
    });
    render(<SlugInput value="existing-org" onChange={() => {}} />);
    // Advance past debounce and let promise resolve
    await act(async () => {
      vi.advanceTimersByTime(300);
      // flush microtasks
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/already taken/i)).toBeTruthy();
  });
});
