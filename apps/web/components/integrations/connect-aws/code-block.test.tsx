import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CodeBlock } from "./code-block";

describe("CodeBlock", () => {
  it("clicking the copy button calls navigator.clipboard.writeText with the code text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const code = '{"hello":"world"}';
    render(<CodeBlock code={code} ariaLabel="Test code block" />);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(code);
  });
});
