import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, THead, TBody, TR, TH, TD } from "./table";

describe("Table", () => {
  it("renders with semantic table roles", () => {
    render(
      <Table>
        <THead><TR><TH>Resource</TH><TH>Waste</TH></TR></THead>
        <TBody><TR><TD>i-abc</TD><TD>$12</TD></TR></TBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("marks numeric columns as tabular-nums via className", () => {
    render(<Table><TBody><TR><TD numeric>$1,234</TD></TR></TBody></Table>);
    expect(screen.getByRole("cell")).toHaveClass("font-numeric");
  });
});
