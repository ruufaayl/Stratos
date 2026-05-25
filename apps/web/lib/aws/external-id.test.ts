import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { externalIdForOrg } from "./external-id";

describe("externalIdForOrg", () => {
  const ORIGINAL_ENV = process.env.STRATOS_EXTERNAL_ID_SECRET;

  beforeEach(() => {
    process.env.STRATOS_EXTERNAL_ID_SECRET = "test-secret";
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.STRATOS_EXTERNAL_ID_SECRET;
    } else {
      process.env.STRATOS_EXTERNAL_ID_SECRET = ORIGINAL_ENV;
    }
  });

  it("is deterministic — same orgId always produces the same externalId", () => {
    const a = externalIdForOrg("org_abc123");
    const b = externalIdForOrg("org_abc123");
    expect(a).toBe(b);
  });

  it("is distinct — different orgIds produce different externalIds", () => {
    const a = externalIdForOrg("org_abc123");
    const b = externalIdForOrg("org_xyz789");
    expect(a).not.toBe(b);
  });

  it("matches expected format /^stratos-[0-9a-f]{16}$/", () => {
    const id = externalIdForOrg("org_test");
    expect(id).toMatch(/^stratos-[0-9a-f]{16}$/);
  });

  it("throws if STRATOS_EXTERNAL_ID_SECRET is not set", () => {
    delete process.env.STRATOS_EXTERNAL_ID_SECRET;
    expect(() => externalIdForOrg("org_test")).toThrow(
      "STRATOS_EXTERNAL_ID_SECRET env var is required",
    );
  });
});
