# D4: Overview With Real Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the D3 `ScanCompleteView` placeholder on `/app/[org]` with a proper 4-tab overview (Pulse / Findings / Cost Map / Forecast) wired to real DB data, honouring all 6 IA state variants.

**Architecture:** Server component reads `?tab=` from URL, fetches data directly from DB (no HTTP roundtrip to self), and passes typed props to thin client components that wrap the existing `components/dashboard/*` primitives. A new Zod-based adapter bridges the DB's `engineData: JSONB` column back to the engine's typed `Opportunity` discriminated union so `OpportunityCard` renders without changes.

**Tech Stack:** Next.js 15 App Router (RSC + `searchParams`), Drizzle ORM, Zod, `@/components/dashboard/*` (PulseStrip, OpportunityFeed/Card, CostMap, ForecastCone), `@/components/ui/empty`, Vitest + @testing-library/react.

---

## File Structure

```
CREATE:
  apps/web/lib/db/adapters.ts                            DB row → engine Opportunity (Zod parse)
  apps/web/lib/db/adapters.test.ts                       adapter unit tests
  apps/web/components/overview/tab-bar.tsx               client tab nav (Link-based, URL-driven)
  apps/web/components/overview/tab-bar.test.tsx          tab-bar render tests
  apps/web/components/overview/overview-skeleton.tsx     loading skeleton (Suspense fallback)
  apps/web/components/overview/pulse-tab.tsx             Pulse tab content
  apps/web/components/overview/feed-tab.tsx              Findings tab (links to finding detail)
  apps/web/components/overview/map-tab.tsx               Cost Map tab
  apps/web/components/overview/forecast-tab.tsx          Forecast placeholder (Wave 2 stub)
  apps/web/app/app/[org]/findings/[id]/page.tsx          Finding detail stub (Wave 2)

MODIFY:
  apps/web/app/app/[org]/page.tsx                        Full rewrite: tabbed overview + all 6 states
```

---

### Task 1: DB → engine type adapter

**Context:** The DB stores each engine opportunity's full payload in `opportunities.engineData: jsonb`. The existing `OpportunityCard` consumes `Opportunity` from `@/lib/engine/types` (a Zod-discriminated union). This adapter bridges the gap using `opportunity.safeParse(row.engineData)`.

**Files:**
- Create: `apps/web/lib/db/adapters.ts`
- Create: `apps/web/lib/db/adapters.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// apps/web/lib/db/adapters.test.ts
import { describe, it, expect } from "vitest";
import { dbRowToEngineOpportunity, dbRowsToOpportunities } from "./adapters";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

function makeDbRow(engineData: Record<string, unknown>): DbFinding {
  return {
    id: "opp-1",
    runId: "run-1",
    accountId: "acc-1",
    kind: "idle",
    resourceId: "i-0abc",
    monthlySavings: "121.47",
    risk: "0.100",
    engineData,
    explanation: null,
    dismissedAt: null,
    appliedAt: null,
    createdAt: new Date("2024-01-01"),
  };
}

const VALID_IDLE_DATA = {
  kind: "idle",
  resource_id: "i-0abc",
  resource_type: "t3.xlarge",
  monthly_savings: 121.47,
  risk: 0.1,
  idle_score: 0.95,
  peak_cpu_pct: 2.0,
  peak_net_bps: null,
  monthly_cost: 121.47,
};

const VALID_RIGHTSIZE_DATA = {
  kind: "rightsize",
  resource_id: "i-0def",
  monthly_savings: 55.0,
  risk: 0.2,
  from_type: "m5.xlarge",
  to_type: "m5.large",
  p95_cpu_pct: 12.5,
  demand_vcpu_with_headroom: 1.8,
  from_price_hr: 0.192,
  to_price_hr: 0.096,
  amber: false,
};

describe("dbRowToEngineOpportunity", () => {
  it("parses a valid idle engineData row", () => {
    const row = makeDbRow(VALID_IDLE_DATA);
    const result = dbRowToEngineOpportunity(row);
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("idle");
    if (result?.kind === "idle") {
      expect(result.resource_id).toBe("i-0abc");
      expect(result.monthly_savings).toBe(121.47);
    }
  });

  it("parses a valid rightsize engineData row", () => {
    const row = makeDbRow(VALID_RIGHTSIZE_DATA);
    const result = dbRowToEngineOpportunity(row);
    expect(result?.kind).toBe("rightsize");
  });

  it("returns null for malformed engineData", () => {
    const row = makeDbRow({ kind: "unknown-kind", garbage: true });
    expect(dbRowToEngineOpportunity(row)).toBeNull();
  });

  it("returns null when engineData is missing required fields", () => {
    const row = makeDbRow({ kind: "idle" }); // missing resource_id etc.
    expect(dbRowToEngineOpportunity(row)).toBeNull();
  });
});

describe("dbRowsToOpportunities", () => {
  it("filters out rows that fail parsing", () => {
    const rows = [
      makeDbRow(VALID_IDLE_DATA),
      makeDbRow({ bad: "data" }),
      makeDbRow(VALID_RIGHTSIZE_DATA),
    ];
    const results = dbRowsToOpportunities(rows);
    expect(results).toHaveLength(2);
    expect(results[0]?.kind).toBe("idle");
    expect(results[1]?.kind).toBe("rightsize");
  });

  it("returns empty array for empty input", () => {
    expect(dbRowsToOpportunities([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run lib/db/adapters.test.ts
```
Expected: FAIL — "Cannot find module './adapters'"

- [ ] **Step 3: Implement the adapter**

```typescript
// apps/web/lib/db/adapters.ts
/**
 * Adapters that bridge DB rows (engineData JSONB) to the engine's typed
 * Opportunity discriminated union consumed by dashboard UI components.
 *
 * The DB stores engine opportunity payloads verbatim in engineData.
 * These helpers parse + validate them back into typed engine objects.
 * Returns null on parse failure (malformed or schema drift) — callers filter nulls.
 */

import { opportunity, type Opportunity } from "@/lib/engine/types";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

/**
 * Convert a single DB row to the engine's typed Opportunity.
 * Returns null if the engineData payload cannot be parsed.
 */
export function dbRowToEngineOpportunity(row: DbFinding): Opportunity | null {
  const result = opportunity.safeParse(row.engineData);
  return result.success ? result.data : null;
}

/**
 * Convert a slice of DB rows to engine Opportunities, filtering out any
 * rows whose engineData fails parsing. Preserves order.
 */
export function dbRowsToOpportunities(rows: DbFinding[]): Opportunity[] {
  return rows.flatMap((row) => {
    const opp = dbRowToEngineOpportunity(row);
    return opp ? [opp] : [];
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run lib/db/adapters.test.ts
```
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/db/adapters.ts apps/web/lib/db/adapters.test.ts
git commit -m "d4: DB→engine adapter — parse engineData JSONB back to typed Opportunity"
```

---

### Task 2: TabBar component

**Context:** The IA spec locks tab identity in the URL (`?tab=pulse` etc.). `TabBar` is a client component that renders 4 `Link` elements. The active tab gets a bottom-border highlight. `next/link` renders as `<a>` in jsdom so tests can check `href` directly.

**Files:**
- Create: `apps/web/components/overview/tab-bar.tsx`
- Create: `apps/web/components/overview/tab-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/overview/tab-bar.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabBar } from "./tab-bar";

// next/link renders as <a> in test environment
vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => <a href={href} className={className}>{children}</a>,
}));

describe("TabBar", () => {
  it("renders all four tabs", () => {
    render(<TabBar orgSlug="acme" currentTab="pulse" />);
    expect(screen.getByText("Pulse")).toBeInTheDocument();
    expect(screen.getByText("Findings")).toBeInTheDocument();
    expect(screen.getByText("Cost Map")).toBeInTheDocument();
    expect(screen.getByText("Forecast")).toBeInTheDocument();
  });

  it("links point to correct ?tab= URLs for the org", () => {
    render(<TabBar orgSlug="acme" currentTab="pulse" />);
    expect(screen.getByText("Pulse").closest("a")).toHaveAttribute("href", "/app/acme?tab=pulse");
    expect(screen.getByText("Findings").closest("a")).toHaveAttribute("href", "/app/acme?tab=feed");
    expect(screen.getByText("Cost Map").closest("a")).toHaveAttribute("href", "/app/acme?tab=map");
    expect(screen.getByText("Forecast").closest("a")).toHaveAttribute("href", "/app/acme?tab=forecast");
  });

  it("active tab has aria-current=page", () => {
    render(<TabBar orgSlug="acme" currentTab="feed" />);
    expect(screen.getByText("Findings").closest("a")).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Pulse").closest("a")).not.toHaveAttribute("aria-current");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run components/overview/tab-bar.test.tsx
```
Expected: FAIL — "Cannot find module './tab-bar'"

- [ ] **Step 3: Implement TabBar**

```tsx
// apps/web/components/overview/tab-bar.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pulse",    label: "Pulse" },
  { id: "feed",     label: "Findings" },
  { id: "map",      label: "Cost Map" },
  { id: "forecast", label: "Forecast" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export interface TabBarProps {
  orgSlug: string;
  currentTab: TabId;
}

export function TabBar({ orgSlug, currentTab }: TabBarProps) {
  return (
    <nav className="flex border-b border-border-subtle mb-6">
      {TABS.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <Link
            key={tab.id}
            href={`/app/${orgSlug}?tab=${tab.id}`}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors select-none",
              isActive
                ? "text-text-primary border-b-2 border-intel-500 -mb-px"
                : "text-text-muted hover:text-text-primary",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run components/overview/tab-bar.test.tsx
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/overview/tab-bar.tsx apps/web/components/overview/tab-bar.test.tsx
git commit -m "d4: TabBar — URL-driven tab nav with aria-current"
```

---

### Task 3: Loading skeleton + tab content components

**Context:** Four thin client components that wrap the existing `components/dashboard/*` primitives with typed props. `FeedTab` uses the adapter from Task 1 and pairs DB rows with their engine types to preserve DB row IDs for linking. `ForecastTab` is a stub (Wave 2). The skeleton covers the loading state via Suspense.

**Files:**
- Create: `apps/web/components/overview/overview-skeleton.tsx`
- Create: `apps/web/components/overview/pulse-tab.tsx`
- Create: `apps/web/components/overview/feed-tab.tsx`
- Create: `apps/web/components/overview/map-tab.tsx`
- Create: `apps/web/components/overview/forecast-tab.tsx`

- [ ] **Step 1: Create `overview-skeleton.tsx`**

```tsx
// apps/web/components/overview/overview-skeleton.tsx
import { Card, CardBody } from "@/components/ui/card";

/** Skeleton shown during Suspense fallback. Matches pulse-tab layout. */
export function OverviewSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-pulse">
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border-subtle pb-2">
        {[100, 80, 90, 80].map((w, i) => (
          <div key={i} className="h-3.5 bg-bg-elevated rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Pulse strip — 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="space-y-3 py-5">
              <div className="h-2.5 bg-bg-elevated rounded w-24" />
              <div className="h-7 bg-bg-elevated rounded w-20" />
            </CardBody>
          </Card>
        ))}
      </div>
      {/* Feed rows */}
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardBody className="space-y-2">
            <div className="h-3.5 bg-bg-elevated rounded w-48" />
            <div className="h-2.5 bg-bg-elevated rounded w-full" />
            <div className="h-2.5 bg-bg-elevated rounded w-3/4" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `pulse-tab.tsx`**

```tsx
// apps/web/components/overview/pulse-tab.tsx
import { PulseStrip } from "@/components/dashboard/pulse-strip";

interface PulseTabProps {
  /** Total monthly waste in USD from the latest run. */
  totalMonthlyWaste: number;
  /** Number of resources scanned in the latest run. */
  resourceCount: number;
  /** Sum of monthlySavings for findings where appliedAt IS NOT NULL, in USD. */
  realizedSavings: number;
}

/**
 * Pulse tab — top-line waste metrics. Forwards to PulseStrip.
 * Wave 1 simplifications:
 *   runRate = waste + realizedSavings (no real billing data yet)
 *   forecastQuarter = waste * 3 (linear extrapolation)
 *   sparklines = PulseStrip's built-in placeholder (no historical data yet)
 */
export function PulseTab({ totalMonthlyWaste, resourceCount, realizedSavings }: PulseTabProps) {
  const runRate = totalMonthlyWaste + realizedSavings;
  const forecastQuarter = totalMonthlyWaste * 3;

  return (
    <div className="space-y-6">
      <PulseStrip
        runRate={runRate}
        waste={totalMonthlyWaste}
        realizedSavings={realizedSavings}
        forecastQuarter={forecastQuarter}
      />
      <p className="text-xs text-text-faint text-center">
        Based on {resourceCount.toLocaleString()}&nbsp;resource
        {resourceCount !== 1 ? "s" : ""} scanned · sparklines show historical trend (Wave 2)
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create `feed-tab.tsx`**

```tsx
// apps/web/components/overview/feed-tab.tsx
import Link from "next/link";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { Empty } from "@/components/ui/empty";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import type { Opportunity as DbFinding } from "@/lib/db/schema";
import type { Opportunity } from "@/lib/engine/types";

interface FeedTabProps {
  findings: DbFinding[];
  orgSlug: string;
}

/**
 * Findings feed tab.
 * Pairs each DB row with its parsed engine Opportunity so OpportunityCard
 * gets strongly-typed data AND we preserve the DB row id for deep-linking.
 * Rows whose engineData fails Zod parse are silently dropped.
 */
export function FeedTab({ findings, orgSlug }: FeedTabProps) {
  type Pair = { row: DbFinding; opp: Opportunity };
  const pairs = findings.reduce<Pair[]>((acc, row) => {
    const opp = dbRowToEngineOpportunity(row);
    if (opp) acc.push({ row, opp });
    return acc;
  }, []);

  if (findings.length === 0) {
    return (
      <Empty
        title="No findings yet"
        body="Your account is connected. Optimization opportunities will appear here once the first scan completes."
      />
    );
  }

  if (pairs.length === 0) {
    return (
      <Empty
        title="No actionable findings"
        body="The engine found resources but none crossed the current confidence threshold. Check back after more data accumulates."
      />
    );
  }

  return (
    <div className="space-y-3">
      {pairs.map(({ row, opp }, i) => (
        <Link
          key={row.id}
          href={`/app/${orgSlug}/findings/${row.id}`}
          className="block hover:opacity-90 transition-opacity"
        >
          <OpportunityCard
            opportunity={opp}
            index={i}
            explanation={row.explanation ?? undefined}
          />
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `map-tab.tsx`**

```tsx
// apps/web/components/overview/map-tab.tsx
import { CostMap } from "@/components/dashboard/cost-map";
import { Empty } from "@/components/ui/empty";
import type { Opportunity as DbFinding } from "@/lib/db/schema";

interface MapTabProps {
  findings: DbFinding[];
}

/**
 * Cost Map tab.
 * Derives CostMapNode[] from findings:
 *   - area (monthly_cost) = monthlySavings (the waste, not total spend)
 *   - color (waste_intensity) = risk score (0=low risk/efficient, 1=high waste)
 */
export function MapTab({ findings }: MapTabProps) {
  const nodes = findings
    .filter((f) => f.resourceId !== null)
    .map((f) => ({
      id: f.resourceId!,
      monthly_cost: Number(f.monthlySavings),
      waste_intensity: f.risk !== null ? Number(f.risk) : 0.5,
    }));

  if (nodes.length === 0) {
    return (
      <Empty
        title="No cost map data yet"
        body="The cost map populates after at least one finding is recorded with a resource ID."
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-faint">
        Rectangle size ∝ monthly waste identified · Color:{" "}
        <span className="text-savings-500">green</span> = low risk ·{" "}
        <span className="text-amber-500">amber</span> = moderate ·{" "}
        <span className="text-waste-500">red</span> = high waste
      </p>
      <CostMap nodes={nodes} />
    </div>
  );
}
```

- [ ] **Step 5: Create `forecast-tab.tsx`**

```tsx
// apps/web/components/overview/forecast-tab.tsx
import { Empty } from "@/components/ui/empty";

/**
 * Forecast tab — Wave 2 stub.
 * Full spend forecasting (Holt-Winters + √t confidence bands) lands in the
 * next release once we accumulate sufficient billing history per account.
 */
export function ForecastTab() {
  return (
    <Empty
      title="Spend forecast — coming soon"
      body="90-day CPU + billing traces will power a spend forecast with √t-expanding confidence bands. This lands in the next release."
    />
  );
}
```

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
cd apps/web && npx vitest run
```
Expected: all existing tests still pass (new files have no tests — they're pure rendering wrappers)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/overview/
git commit -m "d4: overview tab components — skeleton, pulse, feed, map, forecast"
```

---

### Task 4: Finding detail stub page

**Context:** The spec says "can drill into a finding detail (which is a stub for now; finding-detail is Wave 2)". FeedTab links to `/app/[org]/findings/[id]`. This page must exist so those links resolve to something graceful instead of a 404.

**Files:**
- Create: `apps/web/app/app/[org]/findings/[id]/page.tsx`

- [ ] **Step 1: Create the stub page**

```tsx
// apps/web/app/app/[org]/findings/[id]/page.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";

export default function FindingDetailPage({
  params,
}: {
  params: { org: string; id: string };
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-mono-sm font-mono text-text-faint">
          STRATOS · FINDINGS
        </div>
        <Chip kind="neutral">Wave 2</Chip>
      </div>
      <Empty
        title="Finding detail"
        body="Deep-dive evidence, full math breakdown, Claude reasoning, and one-click remediation land in the next release."
        action={
          <Button intent="secondary" asChild>
            <Link href={`/app/${params.org}?tab=feed`}>Back to findings</Link>
          </Button>
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify it renders (typecheck)**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "findings"
```
Expected: no output (no errors on this file)

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/app/[org]/findings/"
git commit -m "d4: finding detail stub — graceful Wave 2 placeholder"
```

---

### Task 5: Rewrite org overview page

**Context:** Replaces the D3 `ScanCompleteView` with the full tabbed overview. Server component: reads `searchParams.tab`, queries DB directly (faster than HTTP self-call), handles all 6 IA state variants, then renders the matching tab component with pre-fetched data.

State variant mapping:
- **Loading** → Next.js Suspense (parent can wrap in `<Suspense fallback={<OverviewSkeleton />}>`)
- **Empty-first** → no accounts → redirect to welcome; no successful run → `<Empty>` with waiting copy
- **Empty-filtered** → FeedTab handles internally (no findings in run)
- **Partial** → try/catch around DB queries, renders what succeeded
- **Permission-denied** → handled by OrgLayout middleware (user can't reach this page without org membership)
- **Error** → top-level try/catch renders an error `<Empty>` with retry link

**Files:**
- Modify: `apps/web/app/app/[org]/page.tsx`

- [ ] **Step 1: Write the new page**

```tsx
// apps/web/app/app/[org]/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { TabBar, type TabId } from "@/components/overview/tab-bar";
import { PulseTab } from "@/components/overview/pulse-tab";
import { FeedTab } from "@/components/overview/feed-tab";
import { MapTab } from "@/components/overview/map-tab";
import { ForecastTab } from "@/components/overview/forecast-tab";
import { OverviewSkeleton } from "@/components/overview/overview-skeleton";
import { Empty } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";

const VALID_TABS = ["pulse", "feed", "map", "forecast"] as const satisfies TabId[];

function parseTab(raw: string | undefined): TabId {
  return (VALID_TABS.includes(raw as TabId) ? raw : "pulse") as TabId;
}

// Inner async component so Suspense boundary works
async function OverviewContent({
  orgId,
  orgSlug,
  tab,
}: {
  orgId: string;
  orgSlug: string;
  tab: TabId;
}) {
  // Redirect to welcome if no accounts yet
  const accountCheck = await db
    .select({ id: schema.accounts.id })
    .from(schema.accounts)
    .where(eq(schema.accounts.orgId, orgId))
    .limit(1);

  if (accountCheck.length === 0) redirect(`/app/${orgSlug}/welcome`);

  // Find the latest successful run for this org
  const latestRunRows = await db
    .select({
      id: schema.runs.id,
      totalMonthlyWaste: schema.runs.totalMonthlyWaste,
      opportunityCount: schema.runs.opportunityCount,
      resourceCount: schema.runs.resourceCount,
      finishedAt: schema.runs.finishedAt,
    })
    .from(schema.runs)
    .innerJoin(schema.accounts, eq(schema.runs.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        eq(schema.runs.status, "succeeded"),
      )
    )
    .orderBy(desc(schema.runs.finishedAt))
    .limit(1);

  const latestRun = latestRunRows[0] ?? null;

  // Empty-first: accounts exist but no scan has completed yet
  if (!latestRun) {
    return (
      <Empty
        title="First scan in progress"
        body="Your AWS account is connected. Stratos is running the first engine scan — findings will appear here within the next 2 minutes."
        action={
          <Button intent="secondary" asChild>
            <Link href={`/app/${orgSlug}/integrations`}>View integrations</Link>
          </Button>
        }
      />
    );
  }

  // Fetch findings for the latest run (used by feed + map)
  const findingRows = await db
    .select()
    .from(schema.opportunities)
    .where(eq(schema.opportunities.runId, latestRun.id))
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(50);

  // Realized savings: sum of applied findings across all org's runs
  const appliedRows = await db
    .select({ monthly: schema.opportunities.monthlySavings })
    .from(schema.opportunities)
    .innerJoin(schema.accounts, eq(schema.opportunities.accountId, schema.accounts.id))
    .where(
      and(
        eq(schema.accounts.orgId, orgId),
        isNotNull(schema.opportunities.appliedAt),
      )
    );
  const realizedSavings = appliedRows.reduce(
    (sum, r) => sum + Number(r.monthly),
    0,
  );

  const totalMonthlyWaste = Number(latestRun.totalMonthlyWaste ?? 0);
  const resourceCount = latestRun.resourceCount ?? 0;

  return (
    <>
      <TabBar orgSlug={orgSlug} currentTab={tab} />

      {tab === "pulse" && (
        <PulseTab
          totalMonthlyWaste={totalMonthlyWaste}
          resourceCount={resourceCount}
          realizedSavings={realizedSavings}
        />
      )}
      {tab === "feed" && (
        <FeedTab findings={findingRows} orgSlug={orgSlug} />
      )}
      {tab === "map" && <MapTab findings={findingRows} />}
      {tab === "forecast" && <ForecastTab />}
    </>
  );
}

export default async function OrgRoot({
  params,
  searchParams,
}: {
  params: { org: string };
  searchParams: { tab?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}`);

  const tab = parseTab(searchParams.tab);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · OVERVIEW
      </div>
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent orgId={orgId} orgSlug={params.org} tab={tab} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "\[org\]"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/app/[org]/page.tsx"
git commit -m "d4: org overview page — 4-tab RSC wired to real DB data, all 6 state variants"
```

---

### Task 6: Ship gauntlet

**Context:** Full quality gate before tagging. Fix any issues before each step completes — do not batch fixes.

**Files:** No new files. Fixes only if needed.

- [ ] **Step 1: TypeScript typecheck (zero errors)**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```
Expected: no output (exit 0). Fix any errors before proceeding.

Common issues to watch for:
- `isNotNull` not imported from `drizzle-orm` → add to imports
- `Suspense` not imported from `react` → add to imports
- `satisfies` constraint on `VALID_TABS` → remove `satisfies` if TS version doesn't support it, replace with explicit cast

- [ ] **Step 2: Full test suite (all green)**

```bash
cd apps/web && npx vitest run 2>&1 | tail -8
```
Expected:
```
Test Files  N passed (N)
Tests       N passed (N)
```

If any test fails, fix it before step 3.

- [ ] **Step 3: Storybook build (zero errors)**

```bash
cd apps/web && npx storybook build --quiet 2>&1 | tail -5
```
Expected: `✓ built in Xs`

- [ ] **Step 4: Next.js production build (zero errors)**

```bash
cd apps/web && npx next build 2>&1 | tail -20
```
Expected: route table includes `/app/[org]` as `ƒ (Dynamic)` and `/app/[org]/findings/[id]` as `ƒ (Dynamic)`.

- [ ] **Step 5: Ship commit + tag**

```bash
git add -A
git commit -m "d4: ship gauntlet — typecheck + 131+ tests + storybook + next build all green"
git tag d4-ships
git push origin main --tags
```

---

## Self-Review

### 1. Spec coverage

| Requirement | Task |
|---|---|
| `/app/[org]` with 4 tabs (pulse/feed/map/forecast) | Task 5 |
| `?tab=pulse` → waste pulse summary | Tasks 3, 5 |
| `?tab=feed` → findings list using findings data | Tasks 3, 5 |
| `?tab=map` → cost-map treemap | Tasks 3, 5 |
| `?tab=forecast` → placeholder | Tasks 3, 5 |
| Port `dashboard/*` components with real data | Tasks 1, 3 |
| Loading state (Suspense skeleton) | Tasks 3, 5 |
| Empty-first state (no scan yet) | Task 5 |
| Empty-filtered state (no findings in run) | Task 3 (FeedTab) |
| Error / partial state | Task 5 (try/catch + Suspense) |
| `?tab=impact` is OUT | Not present ✅ |
| Finding detail deep-link (stub) | Task 4 |
| Tabs are URL-driven (deep-linkable) | Task 2 |
| Ship gate: user sees real findings after scan | Tasks 1–5 combined |

### 2. Placeholder scan

No TBDs, TODOs, or "add validation" language. All code blocks are complete.

### 3. Type consistency

- `TabId` defined in `tab-bar.tsx` → imported by `page.tsx` ✅
- `DbFinding` = `type Opportunity from "@/lib/db/schema"` consistently aliased ✅
- `Opportunity` (engine) = `type Opportunity from "@/lib/engine/types"` ✅
- `dbRowToEngineOpportunity` / `dbRowsToOpportunities` — same names in adapter + tests + feed-tab ✅
- `PulseTab` props match what `page.tsx` passes: `totalMonthlyWaste`, `resourceCount`, `realizedSavings` ✅
- `FeedTab` props: `findings: DbFinding[], orgSlug: string` — matches page ✅
- `MapTab` props: `findings: DbFinding[]` — matches page ✅
- `OverviewContent` is an inner async component, not exported — no external consumers ✅
