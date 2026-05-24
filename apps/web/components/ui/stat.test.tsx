import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "./stat";

describe("Stat", () => {
  it("renders the formatted value and label", () => {
    render(<Stat label="Monthly waste" value="$7,097,364" />);
    expect(screen.getByText("Monthly waste")).toBeInTheDocument();
    expect(screen.getByText("$7,097,364")).toBeInTheDocument();
  });

  it("includes a screen-reader description when provided", () => {
    render(
      <Stat
        label="Monthly waste"
        value="$7.1M"
        srDescription="7.1 million dollars per month of cloud waste"
      />,
    );
    expect(screen.getByText(/7\.1 million dollars per month/i)).toBeInTheDocument();
  });
});
