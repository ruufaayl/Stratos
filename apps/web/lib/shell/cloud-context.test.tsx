import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CloudProvider, useCloud } from "./cloud-context";

function Probe() {
  const { active, available, setActive } = useCloud();
  return (
    <div>
      <span data-testid="active">{active}</span>
      <span data-testid="available">{available.join(",")}</span>
      <button onClick={() => setActive("azure")}>switch</button>
    </div>
  );
}

describe("CloudContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("exposes active + available to children", () => {
    render(
      <CloudProvider orgId="o1" available={["aws", "azure", "gcp"]} initial="aws">
        <Probe />
      </CloudProvider>
    );
    expect(screen.getByTestId("active").textContent).toBe("aws");
    expect(screen.getByTestId("available").textContent).toBe("aws,azure,gcp");
  });

  it("setActive updates active state and writes localStorage", async () => {
    const user = userEvent.setup();
    render(
      <CloudProvider orgId="o1" available={["aws", "azure", "gcp"]} initial="aws">
        <Probe />
      </CloudProvider>
    );
    await user.click(screen.getByRole("button", { name: "switch" }));
    expect(screen.getByTestId("active").textContent).toBe("azure");
    expect(localStorage.getItem("stratos.activeCloud.o1")).toBe("azure");
  });

  it("throws if used outside provider", () => {
    expect(() => render(<Probe />)).toThrow(/useCloud.*CloudProvider/);
  });
});
