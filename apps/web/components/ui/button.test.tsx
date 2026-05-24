import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and reports its accessible name", () => {
    render(<Button>Run scan</Button>);
    expect(screen.getByRole("button", { name: "Run scan" })).toBeInTheDocument();
  });

  it("fires onClick when activated by mouse and keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    await user.click(btn);
    btn.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("disables clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Go</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the destructive intent class", () => {
    render(<Button intent="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-waste-500");
  });
});
