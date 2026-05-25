import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  numeric,
  integer,
  index,
} from "drizzle-orm/pg-core";

// =============================================================================
// Stratos initial schema (Phase 0).
//
// Two ideas guide this:
//   1. The engine writes RAW MATH here — never LLM-altered (ENGINE.md §7).
//      So opportunities store the exact dollar figure the engine produced,
//      plus a separate `explanation` field for the Claude reasoning layer.
//   2. We're multi-account from day one. Even Phase 0 / public-data demos
//      slot into an `account` row, so the same schema serves real users later.
// =============================================================================

// A signed-in human (mirrors Clerk user). We track Clerk's user id directly
// instead of a separate users table to keep Clerk as the source of truth.

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    // Clerk organisation ID — all new accounts are org-scoped.
    // Legacy rows that pre-date orgs carry a sentinel value of 'legacy-orphan'.
    orgId: text("org_id").notNull().default("legacy-orphan"),
    // Display name (e.g., "acme-prod", "azure-public-demo")
    name: text("name").notNull(),
    // "aws" | "azure" | "gcp" | "demo"
    provider: text("provider").notNull(),
    // AWS IAM cross-account role ARN (set for AWS provider accounts)
    roleArn: text("role_arn"),
    // Per-org deterministic external ID for confused-deputy protection
    externalId: text("external_id"),
    // Primary AWS region for this account
    region: text("region").notNull().default("us-east-1"),
    // AWS account ID discovered via STS GetCallerIdentity
    awsAccountId: text("aws_account_id"),
    // "pending" | "validated" | "failed"
    status: text("status").notNull().default("pending"),
    // Timestamp of last successful engine scan
    lastScanAt: timestamp("last_scan_at"),
    // Free-form metadata (AWS account id, region defaults, etc.)
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    // "free" | "pro" — written exclusively by the Stripe webhook, never the UI.
    tier: text("tier").notNull().default("free"),
    // Stripe customer ID for billing portal lookups
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    clerkUserIdx: index("accounts_clerk_user_idx").on(t.clerkUserId),
    orgIdx: index("accounts_org_idx").on(t.orgId),
  }),
);

// Time-series snapshots — when we ran the engine against an account.
export const runs = pgTable("runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id")
    .references(() => accounts.id, { onDelete: "cascade" })
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  // "running" | "succeeded" | "failed"
  status: text("status").notNull().default("running"),
  // Aggregate headline: total monthly waste identified across all opps.
  totalMonthlyWaste: numeric("total_monthly_waste", { precision: 14, scale: 2 }),
  resourceCount: integer("resource_count"),
  opportunityCount: integer("opportunity_count"),
  // Raw engine output, kept for audit ("show me the math")
  engineRaw: jsonb("engine_raw").$type<Record<string, unknown>>(),
});

// Each ranked, dollar-quantified opportunity produced by the engine.
export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .references(() => runs.id, { onDelete: "cascade" })
      .notNull(),
    accountId: uuid("account_id")
      .references(() => accounts.id, { onDelete: "cascade" })
      .notNull(),
    // "idle" | "rightsize" | "anomaly" | "commitment" | "zombie"
    kind: text("kind").notNull(),
    resourceId: text("resource_id"),
    // The headline number — written by Python, never by Claude.
    monthlySavings: numeric("monthly_savings", { precision: 12, scale: 2 }).notNull(),
    // Engine's risk score in [0,1]. UI inverts → "confidence dots".
    risk: numeric("risk", { precision: 4, scale: 3 }),
    // Full engine payload (peak cpu, p95, target type, etc.) — raw, immutable.
    engineData: jsonb("engine_data").$type<Record<string, unknown>>().notNull(),
    // Claude's plain-English summary. NEVER includes a recomputed number.
    explanation: text("explanation"),
    // User actions
    dismissedAt: timestamp("dismissed_at"),
    appliedAt: timestamp("applied_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    accountKindIdx: index("opportunities_account_kind_idx").on(t.accountId, t.kind),
    runIdx: index("opportunities_run_idx").on(t.runId),
  }),
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
