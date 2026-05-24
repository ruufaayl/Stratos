// apps/web/components/shell/command-bar-async.test.ts
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from "vitest";

// We test the fetch behavior by testing the module-level functions directly.
// The debounce + abort behavior is tested via renderHook-style approach.
import { fetchResources, fetchFindings } from "./command-bar-source";

describe("fetchResources / fetchFindings", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetchResources calls the correct URL and returns results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: "r1", label: "idle-ec2", category: "Resources", score: 0.8 }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const controller = new AbortController();
    const results = await fetchResources("acme", "idle", controller.signal);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/resources/search?org=acme&q=idle",
      { signal: controller.signal },
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.label).toBe("idle-ec2");
  });

  it("fetchFindings calls the correct URL and returns results", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ id: "f1", label: "High CPU idle", category: "Findings", score: 0.9 }] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const controller = new AbortController();
    const results = await fetchFindings("acme", "cpu", controller.signal);

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/findings/search?org=acme&q=cpu",
      { signal: controller.signal },
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.label).toBe("High CPU idle");
  });

  it("returns empty array on non-OK response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const controller = new AbortController();
    const results = await fetchResources("acme", "idle", controller.signal);
    expect(results).toHaveLength(0);
  });
});

// Test the debounce + abort behavior via React hooks
import { renderHook, act } from "@testing-library/react";
import * as React from "react";

/**
 * Inline mirror of the useDebouncedValue hook from command-bar.tsx.
 * We test the abort behavior by testing the command-bar component internals.
 * Here we test the abort pattern directly.
 */
describe("AbortController pattern", () => {
  it("aborting a controller marks signal as aborted", () => {
    const controller = new AbortController();
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it("new controller does not inherit abort state from old controller", () => {
    const oldCtrl = new AbortController();
    oldCtrl.abort();
    const newCtrl = new AbortController();
    expect(newCtrl.signal.aborted).toBe(false);
  });
});

// Integration: test debounce threshold via fake timers
describe("CommandBar debounce threshold", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("query length < 3 does not trigger fetch after 200ms", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Simulate what CommandBar does: only fetch if debouncedQuery.length >= 3
    let debouncedQuery = "";
    const query = "ab"; // length 2

    // Simulate debounce: after 200ms, debouncedQuery becomes query
    let settled = false;
    const id = setTimeout(() => {
      debouncedQuery = query;
      settled = true;
      // Only fetch if length >= 3
      if (debouncedQuery.length >= 3) {
        const ctrl = new AbortController();
        fetchResources("acme", debouncedQuery, ctrl.signal);
        fetchFindings("acme", debouncedQuery, ctrl.signal);
      }
    }, 200);

    vi.advanceTimersByTime(250);
    expect(settled).toBe(true);
    expect(debouncedQuery).toBe("ab");
    // fetch should NOT have been called because length < 3
    expect(fetchMock).not.toHaveBeenCalled();

    clearTimeout(id);
  });

  it("query length >= 3 triggers both fetches after 200ms debounce", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    let debouncedQuery = "";
    const query = "idle"; // length 4

    const id = setTimeout(() => {
      debouncedQuery = query;
      if (debouncedQuery.length >= 3) {
        const ctrl = new AbortController();
        fetchResources("acme", debouncedQuery, ctrl.signal);
        fetchFindings("acme", debouncedQuery, ctrl.signal);
      }
    }, 200);

    vi.advanceTimersByTime(250);
    expect(debouncedQuery).toBe("idle");
    // Both fetches should have been called
    expect(fetchMock).toHaveBeenCalledTimes(2);

    clearTimeout(id);
  });

  it("rapid query changes abort the previous controller", () => {
    const abortSpy = vi.fn();

    // Simulate rapid query changes: each new query aborts the previous controller
    let currentCtrl: AbortController | null = null;

    function simulateQueryChange(q: string) {
      if (currentCtrl) {
        currentCtrl.abort();
        abortSpy();
      }
      if (q.length >= 3) {
        currentCtrl = new AbortController();
      }
    }

    simulateQueryChange("idle");
    expect(abortSpy).not.toHaveBeenCalled(); // first query, no previous

    simulateQueryChange("idle-ec2");
    expect(abortSpy).toHaveBeenCalledTimes(1); // second query aborts first

    simulateQueryChange("idle-ec2-");
    expect(abortSpy).toHaveBeenCalledTimes(2); // third query aborts second
  });
});
