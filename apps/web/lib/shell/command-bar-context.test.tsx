import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { CommandBarProvider, useCommandBar } from "./command-bar-context";

function Probe() {
  const { open, query, openBar, closeBar, setQuery } = useCommandBar();
  return (
    <div>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="query">{query}</span>
      <button onClick={openBar}>open</button>
      <button onClick={closeBar}>close</button>
      <button onClick={() => setQuery("hello")}>set-query</button>
    </div>
  );
}

describe("CommandBarContext", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("openBar sets open=true", () => {
    render(
      <CommandBarProvider>
        <Probe />
      </CommandBarProvider>
    );
    expect(screen.getByTestId("open").textContent).toBe("false");
    act(() => { fireEvent.click(screen.getByRole("button", { name: "open" })); });
    expect(screen.getByTestId("open").textContent).toBe("true");
  });

  it("closeBar sets open=false immediately and clears query after 200ms", () => {
    render(
      <CommandBarProvider>
        <Probe />
      </CommandBarProvider>
    );
    // open and set a query first
    act(() => { fireEvent.click(screen.getByRole("button", { name: "open" })); });
    act(() => { fireEvent.click(screen.getByRole("button", { name: "set-query" })); });
    expect(screen.getByTestId("query").textContent).toBe("hello");

    // close
    act(() => { fireEvent.click(screen.getByRole("button", { name: "close" })); });
    expect(screen.getByTestId("open").textContent).toBe("false");
    // query not yet cleared
    expect(screen.getByTestId("query").textContent).toBe("hello");

    // advance past 200ms
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getByTestId("query").textContent).toBe("");
  });

  it("throws if used outside provider", () => {
    expect(() => render(<Probe />)).toThrow(/useCommandBar.*CommandBarProvider/);
  });
});
