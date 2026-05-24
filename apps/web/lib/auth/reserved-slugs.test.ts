import { describe, it, expect } from "vitest";
import { isReservedSlug, isValidSlugFormat } from "./reserved-slugs";

describe("reserved-slugs", () => {
  it("flags reserved slug", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("sign-in")).toBe(true);
    expect(isReservedSlug("ADMIN")).toBe(true); // case-insensitive
  });

  it("passes a non-reserved slug", () => {
    expect(isReservedSlug("acme")).toBe(false);
    expect(isReservedSlug("my-company")).toBe(false);
  });

  it("validates slug format correctly", () => {
    expect(isValidSlugFormat("acme-prod")).toBe(true);
    expect(isValidSlugFormat("abc")).toBe(true);
    expect(isValidSlugFormat("-leading")).toBe(false);
    expect(isValidSlugFormat("trailing-")).toBe(false);
    expect(isValidSlugFormat("Caps")).toBe(false);
    expect(isValidSlugFormat("has space")).toBe(false);
    expect(isValidSlugFormat("a")).toBe(true); // single char valid
  });
});
