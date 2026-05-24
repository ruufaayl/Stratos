// apps/web/components/shell/command-bar-source.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildSync } from "./command-bar-source";
import type { Role } from "@/lib/shell/org-context";

const BASE_ARGS = {
  orgSlug: "acme",
  role: "admin" as Role,
  pathname: "/app/acme",
  query: "",
  recentIds: [],
};

describe("buildSync", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("empty query + role=admin → returns navigate + all role-permitted actions (no filtering)", () => {
    const results = buildSync(BASE_ARGS);

    // Should have Navigate items (all primary nav + settings)
    const navigateItems = results.filter((r) => r.category === "Navigate");
    expect(navigateItems.length).toBeGreaterThan(0);

    // Should have Actions items — admin gets all non-owner actions
    const actionItems = results.filter((r) => r.category === "Actions");
    expect(actionItems.length).toBeGreaterThan(0);

    // Should have Help items
    const helpItems = results.filter((r) => r.category === "Help");
    expect(helpItems.length).toBeGreaterThan(0);

    // Sign-out (callbackKey) should still appear with admin role
    const signOut = results.find((r) => r.id === "sign-out");
    expect(signOut).toBeDefined();
  });

  it("query 'find' → Findings navigate item has higher score than non-matching items", () => {
    const results = buildSync({ ...BASE_ARGS, query: "find" });

    // "Findings" should appear in results (prefix match)
    const findingsItem = results.find(
      (r) => r.category === "Navigate" && r.label.toLowerCase().includes("findings"),
    );
    expect(findingsItem).toBeDefined();
    expect(findingsItem!.score).toBe(1); // prefix hit = score 1

    // Unrelated items should not appear OR have lower score
    const overviewItem = results.find(
      (r) => r.category === "Navigate" && r.label === "Overview",
    );
    // Overview doesn't contain "find" — should be filtered out (score 0) or not in results
    if (overviewItem) {
      expect(overviewItem.score).toBe(0);
    }
  });

  it("role=member → actions with requiresRole=admin are filtered out", () => {
    const results = buildSync({ ...BASE_ARGS, role: "member" });

    // "Invite member" requires admin — should not appear
    const inviteItem = results.find((r) => r.id === "invite");
    expect(inviteItem).toBeUndefined();

    // "Connect AWS" requires admin — should not appear
    const connectAws = results.find((r) => r.id === "connect-aws");
    expect(connectAws).toBeUndefined();

    // "Create report" has no role requirement — should appear
    const createReport = results.find((r) => r.id === "create-report");
    expect(createReport).toBeDefined();
  });

  it("recentIds → resolved items appear in Recent category", () => {
    // "findings" is a nav item key
    const results = buildSync({
      ...BASE_ARGS,
      recentIds: ["nav-findings"],
    });

    const recentItems = results.filter((r) => r.category === "Recent");
    expect(recentItems.length).toBeGreaterThan(0);
    expect(recentItems[0]!.label).toBe("Findings");
  });

  it("role=owner → all actions including owner-only ones appear", () => {
    const results = buildSync({ ...BASE_ARGS, role: "owner" });

    const billingItem = results.find((r) => r.id === "billing");
    expect(billingItem).toBeDefined();
  });

  it("results are sorted: Recent first, then Navigate, then Actions, then Help", () => {
    const results = buildSync({
      ...BASE_ARGS,
      recentIds: ["nav-findings"],
      query: "",
    });

    const categories = results.map((r) => r.category);
    const firstNonRecent = categories.findIndex((c) => c !== "Recent");
    const firstActions = categories.findIndex((c) => c === "Actions");
    const firstHelp = categories.findIndex((c) => c === "Help");

    if (firstNonRecent !== -1 && firstActions !== -1) {
      expect(firstNonRecent).toBeLessThan(firstActions);
    }
    if (firstActions !== -1 && firstHelp !== -1) {
      expect(firstActions).toBeLessThan(firstHelp);
    }
  });
});
