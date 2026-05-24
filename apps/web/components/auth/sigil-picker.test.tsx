import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { SigilPicker, SIGIL_COLORS } from "./sigil-picker";

describe("SigilPicker", () => {
  it("renders all 7 color buttons", () => {
    render(<SigilPicker value={SIGIL_COLORS[0]!} onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(7);
  });

  it("clicking a swatch calls onChange with that color", () => {
    const onChange = vi.fn();
    render(<SigilPicker value={SIGIL_COLORS[0]!} onChange={onChange} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]!);
    expect(onChange).toHaveBeenCalledWith(SIGIL_COLORS[2]);
  });

  it("selected button has aria-pressed=true, others have aria-pressed=false", () => {
    render(<SigilPicker value={SIGIL_COLORS[1]!} onChange={() => {}} />);
    const buttons = screen.getAllByRole("button");
    // Check using getAttribute to avoid type issues
    expect(buttons[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]!.getAttribute("aria-pressed")).toBe("false");
    expect(buttons[2]!.getAttribute("aria-pressed")).toBe("false");
  });
});
