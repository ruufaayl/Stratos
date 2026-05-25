import { describe, it, expect } from "vitest";
import { PRICING, DEFAULT_HOURLY_USD, priceForType } from "./pricing";

describe("PRICING", () => {
  it("has t3.micro at $0.0104/hr", () => {
    expect(PRICING["t3.micro"]).toBe(0.0104);
  });

  it("has m5.xlarge at $0.192/hr", () => {
    expect(PRICING["m5.xlarge"]).toBe(0.192);
  });

  it("covers at least 18 instance types", () => {
    expect(Object.keys(PRICING).length).toBeGreaterThanOrEqual(18);
  });
});

describe("priceForType", () => {
  it("returns the exact price for a known type", () => {
    expect(priceForType("c5.large")).toBe(0.085);
  });

  it("returns DEFAULT_HOURLY_USD for an unknown type", () => {
    expect(priceForType("x1e.32xlarge")).toBe(DEFAULT_HOURLY_USD);
  });
});
