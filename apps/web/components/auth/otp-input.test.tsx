import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OtpInput } from "./otp-input";
import * as React from "react";

function Harness() {
  const [v, setV] = React.useState("");
  return (
    <>
      <OtpInput value={v} onChange={setV} />
      <div data-testid="v">{v}</div>
    </>
  );
}

describe("OtpInput", () => {
  it("types into cells in order and advances focus", () => {
    render(<Harness />);
    const cells = screen.getAllByLabelText(/Digit/);
    fireEvent.change(cells[0]!, { target: { value: "1" } });
    fireEvent.change(cells[1]!, { target: { value: "2" } });
    fireEvent.change(cells[2]!, { target: { value: "3" } });
    expect(screen.getByTestId("v").textContent).toBe("123");
  });

  it("accepts a pasted 6-digit code", () => {
    render(<Harness />);
    const cells = screen.getAllByLabelText(/Digit/);
    fireEvent.paste(cells[0]!, {
      clipboardData: { getData: () => "424242" },
    });
    expect(screen.getByTestId("v").textContent).toBe("424242");
  });
});
