# D5: Findings Depth (Wave 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Wave 2 stub at `/app/[org]/findings/[id]` with a real 4-tab detail page, and add a full `/app/[org]/findings` list page with kind filtering — completing the Wave 2 "Findings depth" milestone from the IA spec.

**Architecture:** Two RSC pages (`/findings` list and `/findings/[id]` detail) query the DB directly (no HTTP self-calls, same pattern as D4 overview). A client `FindingFilterBar` handles `?kind=` URL updates via `useRouter`. The detail page renders 4 tab content components (Evidence / Math / Reasoning / Resource), each a pure server component, separated by a client `FindingDetailTabBar`. The existing `dbRowToEngineOpportunity` adapter from D4 bridges DB rows to typed `Opportunity` for each tab.

**Tech Stack:** Next.js 15 App Router (RSC + `searchParams`), Drizzle ORM, `@/lib/db/adapters` (D4), `@/components/ui/{card,chip,empty,stat}`, `@/components/dashboard/opportunity-card`, Vitest + @testing-library/react.

---

## File Structure

```
CREATE:
  apps/web/components/findings/finding-filter-bar.tsx        Client kind filter chips (?kind=)
  apps/web/components/findings/finding-filter-bar.test.tsx   Filter bar tests (5 tests)
  apps/web/components/findings/finding-detail-tab-bar.tsx    Client tab nav for detail (Evidence/Math/Reasoning/Resource)
  apps/web/components/findings/evidence-tab.tsx              Telemetry evidence per kind
  apps/web/components/findings/math-tab.tsx                  Algorithm description + raw engineData
  apps/web/components/findings/reasoning-tab.tsx             Claude explanation or stub
  apps/web/components/findings/resource-tab.tsx              Resource + account summary
  apps/web/app/app/[org]/findings/page.tsx                   Findings list RSC (kind-filtered)

MODIFY:
  apps/web/app/app/[org]/findings/[id]/page.tsx              Rewrite Wave 2 stub → full tabbed detail
```

---

### Task 1: FindingFilterBar component

**Context:** The findings list page supports filtering by `?kind=idle|rightsize|anomaly|commitment|zombie`. `FindingFilterBar` is a "use client" component that renders 6 styled buttons (All + 5 kinds). When clicked, each button navigates to the appropriate URL. It receives `orgSlug` (for URL construction) and `currentKind` (from the server's `searchParams` parse) as props — no need to read `useSearchParams` inside the component.

**Files:**
- Create: `apps/web/components/findings/finding-filter-bar.tsx`
- Create: `apps/web/components/findings/finding-filter-bar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/components/findings/finding-filter-bar.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FindingFilterBar } from "./finding-filter-bar";

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("FindingFilterBar", () => {
  beforeEach(() => mockPush.mockClear());

  it("renders all 6 filter options", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Idle")).toBeInTheDocument();
    expect(screen.getByText("Rightsize")).toBeInTheDocument();
    expect(screen.getByText("Anomaly")).toBeInTheDocument();
    expect(screen.getByText("Commitment")).toBeInTheDocument();
    expect(screen.getByText("Zombie")).toBeInTheDocument();
  });

  it("'All' is aria-pressed='true' when currentKind is null", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    expect(screen.getByText("All").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Idle").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("'Idle' is aria-pressed='true' when currentKind is 'idle'", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind="idle" />);
    expect(screen.getByText("Idle").closest("button")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("All").closest("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("clicking 'Idle' navigates to ?kind=idle", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind={null} />);
    fireEvent.click(screen.getByText("Idle"));
    expect(mockPush).toHaveBeenCalledWith("/app/acme/findings?kind=idle");
  });

  it("clicking 'All' navigates to base findings URL (no kind param)", () => {
    render(<FindingFilterBar orgSlug="acme" currentKind="idle" />);
    fireEvent.click(screen.getByText("All"));
    expect(mockPush).toHaveBeenCalledWith("/app/acme/findings");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run components/findings/finding-filter-bar.test.tsx
```
Expected: FAIL — "Cannot find module './finding-filter-bar'"

- [ ] **Step 3: Implement FindingFilterBar**

```tsx
// apps/web/components/findings/finding-filter-bar.tsx
"use client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type KindFilter = "idle" | "rightsize" | "anomaly" | "commitment" | "zombie" | null;

const KINDS: Array<{ id: KindFilter; label: string }> = [
  { id: null,         label: "All" },
  { id: "idle",       label: "Idle" },
  { id: "rightsize",  label: "Rightsize" },
  { id: "anomaly",    label: "Anomaly" },
  { id: "commitment", label: "Commitment" },
  { id: "zombie",     label: "Zombie" },
];

interface FindingFilterBarProps {
  orgSlug: string;
  currentKind: KindFilter;
}

export function FindingFilterBar({ orgSlug, currentKind }: FindingFilterBarProps) {
  const router = useRouter();

  function navigate(kind: KindFilter) {
    const url = kind
      ? `/app/${orgSlug}/findings?kind=${kind}`
      : `/app/${orgSlug}/findings`;
    router.push(url);
  }

  return (
    <div
      className="flex flex-wrap gap-2 mb-6"
      role="group"
      aria-label="Filter by finding type"
    >
      {KINDS.map((k) => {
        const isActive = k.id === currentKind;
        return (
          <button
            key={k.id ?? "all"}
            type="button"
            aria-pressed={isActive}
            onClick={() => navigate(k.id)}
            className={cn(
              "inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em]",
              "rounded-chip border whitespace-nowrap h-6 px-2 text-[11px] transition-colors",
              isActive
                ? "bg-intel-950 text-intel-300 border-intel-950"
                : "bg-bg-elevated text-text-muted border-border-subtle hover:border-border-strong",
            )}
          >
            {k.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run components/findings/finding-filter-bar.test.tsx
```
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/findings/finding-filter-bar.tsx apps/web/components/findings/finding-filter-bar.test.tsx
git commit -m "d5: FindingFilterBar — kind filter chips with URL routing"
```

---

### Task 2: Findings list page

**Context:** Server component at `/app/[org]/findings`. Reads `searchParams.kind`, queries the DB for the latest succeeded run (same pattern as D4 overview), then fetches opportunities from that run with an optional kind filter. Renders `FindingFilterBar` + `OpportunityCard` list or an appropriate `Empty` for each IA state.

**Important:** `FindingFilterBar` is a "use client" component but can be rendered inside a server component — Next.js handles the RSC boundary correctly. The page wraps the data-fetching inner component in `<Suspense>` for the loading state.

**Files:**
- Create: `apps/web/app/app/[org]/findings/page.tsx`

- [ ] **Step 1: Create the findings list page**

```tsx
// apps/web/app/app/[org]/findings/page.tsx
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { FindingFilterBar, type KindFilter } from "@/components/findings/finding-filter-bar";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import { OpportunityCard } from "@/components/dashboard/opportunity-card";
import { Empty } from "@/components/ui/empty";
import type { Opportunity as DbFinding } from "@/lib/db/schema";
import type { Opportunity } from "@/lib/engine/types";

const VALID_KINDS = ["idle", "rightsize", "anomaly", "commitment", "zombie"] as const;
type ValidKind = (typeof VALID_KINDS)[number];

function parseKind(raw: string | undefined): KindFilter {
  return (VALID_KINDS.includes(raw as ValidKind) ? raw : null) as KindFilter;
}

/** Skeleton shown during Suspense fallback */
function FindingsSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-2 mb-6">
        {[60, 50, 80, 70, 90, 60].map((w, i) => (
          <div key={i} className="h-6 bg-bg-elevated rounded-chip" style={{ width: w }} />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-24 bg-bg-elevated rounded-xl" />
      ))}
    </div>
  );
}

async function FindingsContent({
  orgId,
  orgSlug,
  kind,
}: {
  orgId: string;
  orgSlug: string;
  kind: KindFilter;
}) {
  // Latest succeeded run for this org
  const latestRunRows = await db
    .select({ id: schema.runs.id })
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

  // Empty-first: no scan has completed yet
  if (!latestRun) {
    return (
      <Empty
        title="No findings yet"
        body="Connect an AWS account and run a scan — findings will appear here when the first scan completes."
        action={
          <Link
            href={`/app/${orgSlug}/welcome`}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
          >
            Connect account
          </Link>
        }
      />
    );
  }

  // Fetch opportunities from the latest run, with optional kind filter
  const whereClause = kind
    ? and(
        eq(schema.opportunities.runId, latestRun.id),
        eq(schema.opportunities.kind, kind),
      )
    : eq(schema.opportunities.runId, latestRun.id);

  const findingRows = await db
    .select()
    .from(schema.opportunities)
    .where(whereClause)
    .orderBy(desc(schema.opportunities.monthlySavings))
    .limit(100);

  // Empty-filtered: kind filter produced no results
  if (findingRows.length === 0 && kind !== null) {
    return (
      <>
        <FindingFilterBar orgSlug={orgSlug} currentKind={kind} />
        <Empty
          title={`No ${kind} findings`}
          body="No findings match this filter in the latest scan."
          action={
            <Link
              href={`/app/${orgSlug}/findings`}
              className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
            >
              Clear filter
            </Link>
          }
        />
      </>
    );
  }

  // Empty-first: scan succeeded but no findings
  if (findingRows.length === 0) {
    return (
      <>
        <FindingFilterBar orgSlug={orgSlug} currentKind={null} />
        <Empty
          title="No waste found"
          body="Your account is healthy — no optimization opportunities detected in the latest scan. Check back after 24h of additional data."
        />
      </>
    );
  }

  type Pair = { row: DbFinding; opp: Opportunity };
  const pairs = findingRows.reduce<Pair[]>((acc, row) => {
    const opp = dbRowToEngineOpportunity(row);
    if (opp) acc.push({ row, opp });
    return acc;
  }, []);

  return (
    <>
      <FindingFilterBar orgSlug={orgSlug} currentKind={kind} />
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
      <p className="text-xs text-text-faint text-center mt-4">
        {pairs.length} finding{pairs.length !== 1 ? "s" : ""} from latest scan
        {kind ? ` · filtered by ${kind}` : ""}
      </p>
    </>
  );
}

export default async function FindingsPage({
  params,
  searchParams,
}: {
  params: { org: string };
  searchParams: { kind?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) redirect(`/sign-in?return_to=/app/${params.org}/findings`);

  const kind = parseKind(searchParams.kind);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="text-mono-sm font-mono text-text-faint mb-6">
        STRATOS · FINDINGS
      </div>
      <Suspense fallback={<FindingsSkeleton />}>
        <FindingsContent orgId={orgId} orgSlug={params.org} kind={kind} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck the file**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "findings"
```
Expected: no output. Fix any errors before committing.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/app/[org]/findings/page.tsx"
git commit -m "d5: findings list page — kind filter, Suspense skeleton, all IA states"
```

---

### Task 3: Finding detail components

**Context:** Five files that implement the detail tab bar and four tab content components. `FindingDetailTabBar` is "use client" (uses `Link` for navigation, same pattern as D4 `TabBar`). The four tab content components are pure server components — they receive typed props from the parent RSC page and just render.

**Type aliasing reminder (same as adapters.ts):**
- DB type: `import type { Opportunity as DbFinding, Account } from "@/lib/db/schema"`
- Engine type: `import type { Opportunity } from "@/lib/engine/types"`

**Files:**
- Create: `apps/web/components/findings/finding-detail-tab-bar.tsx`
- Create: `apps/web/components/findings/evidence-tab.tsx`
- Create: `apps/web/components/findings/math-tab.tsx`
- Create: `apps/web/components/findings/reasoning-tab.tsx`
- Create: `apps/web/components/findings/resource-tab.tsx`

Before writing, verify:
- `CardHeader`, `CardTitle`, `CardBody` are exported from `@/components/ui/card`
- `Stat` is exported from `@/components/ui/stat`
- `usd()` is exported from `@/lib/utils`

- [ ] **Step 1: Create `finding-detail-tab-bar.tsx`**

```tsx
// apps/web/components/findings/finding-detail-tab-bar.tsx
"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DETAIL_TABS = [
  { id: "evidence",  label: "Evidence" },
  { id: "math",      label: "Math" },
  { id: "reasoning", label: "Reasoning" },
  { id: "resource",  label: "Resource" },
] as const;

export type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

interface FindingDetailTabBarProps {
  orgSlug: string;
  findingId: string;
  currentTab: DetailTabId;
}

export function FindingDetailTabBar({
  orgSlug,
  findingId,
  currentTab,
}: FindingDetailTabBarProps) {
  return (
    <nav
      aria-label="Finding detail tabs"
      className="flex border-b border-border-subtle mb-6"
    >
      {DETAIL_TABS.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <Link
            key={tab.id}
            href={`/app/${orgSlug}/findings/${findingId}?tab=${tab.id}`}
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

- [ ] **Step 2: Create `evidence-tab.tsx`**

```tsx
// apps/web/components/findings/evidence-tab.tsx
import { Card, CardBody } from "@/components/ui/card";
import { usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";

interface EvidenceTabProps {
  opportunity: Opportunity;
}

function EvidenceRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
      <span className="font-mono uppercase text-xs text-text-muted">{label}</span>
      <span className="text-text-primary font-medium text-sm tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function EvidenceTab({ opportunity: opp }: EvidenceTabProps) {
  return (
    <Card>
      <CardBody className="space-y-0 divide-y-0">
        {opp.kind === "idle" && (
          <>
            <EvidenceRow label="Idle score" value={opp.idle_score.toFixed(3)} />
            <EvidenceRow label="Peak CPU" value={`${opp.peak_cpu_pct.toFixed(2)}%`} />
            <EvidenceRow
              label="Peak network"
              value={
                opp.peak_net_bps !== null
                  ? `${(opp.peak_net_bps / 1024).toFixed(1)} KB/s`
                  : "No data"
              }
            />
            <EvidenceRow label="Monthly cost" value={usd(opp.monthly_cost)} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
          </>
        )}

        {opp.kind === "rightsize" && (
          <>
            <EvidenceRow label="Current type" value={opp.from_type} />
            <EvidenceRow label="Recommended type" value={opp.to_type} />
            <EvidenceRow label="p95 CPU" value={`${opp.p95_cpu_pct.toFixed(1)}%`} />
            <EvidenceRow
              label="Demand (with headroom)"
              value={`${opp.demand_vcpu_with_headroom.toFixed(2)} vCPU`}
            />
            <EvidenceRow label="Current cost/hr" value={`$${opp.from_price_hr.toFixed(4)}`} />
            <EvidenceRow label="Target cost/hr" value={`$${opp.to_price_hr.toFixed(4)}`} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
            {opp.amber && (
              <div className="mt-3 p-3 rounded-lg bg-risk-950 border border-risk-800 text-risk-300 text-xs">
                ⚠ Amber: CPU runs close to ceiling — review before resizing.
              </div>
            )}
          </>
        )}

        {opp.kind === "anomaly" && (
          <>
            <EvidenceRow label="Day index" value={opp.day_index} />
            <EvidenceRow label="Actual spend" value={usd(opp.actual)} />
            <EvidenceRow label="Expected spend" value={usd(opp.expected)} />
            <EvidenceRow label="Overspend" value={usd(opp.overspend)} />
            <EvidenceRow label="Sigma (deviation)" value={`${opp.sigma.toFixed(2)}σ`} />
            <EvidenceRow label="Monthly savings (est.)" value={usd(opp.monthly_savings)} />
          </>
        )}

        {opp.kind === "commitment" && (
          <>
            <EvidenceRow label="Optimal commit level" value={opp.commit_level.toFixed(4)} />
            <EvidenceRow label="Critical quantile" value={opp.critical_quantile.toFixed(4)} />
            <EvidenceRow label="Current monthly" value={usd(opp.current_monthly)} />
            <EvidenceRow label="Optimized monthly" value={usd(opp.optimized_monthly)} />
            <EvidenceRow
              label="Savings %"
              value={`${(opp.savings_pct * 100).toFixed(1)}%`}
            />
            <EvidenceRow
              label="Coverage"
              value={`${opp.coverage_pct.toFixed(1)}%`}
            />
            <EvidenceRow label="Samples" value={opp.samples} />
          </>
        )}

        {opp.kind === "zombie" && (
          <>
            <EvidenceRow
              label="Status"
              value={
                opp.zombie_label === "stopped"
                  ? "Fully stopped"
                  : "Near-zero activity"
              }
            />
            <EvidenceRow label="Max CPU" value={`${opp.max_cpu_pct.toFixed(3)}%`} />
            <EvidenceRow label="Data days" value={opp.data_days} />
            <EvidenceRow
              label="Confidence"
              value={`${(opp.confidence * 100).toFixed(0)}%`}
            />
            <EvidenceRow label="Monthly cost" value={usd(opp.monthly_cost)} />
            <EvidenceRow label="Monthly savings" value={usd(opp.monthly_savings)} />
          </>
        )}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 3: Create `math-tab.tsx`**

```tsx
// apps/web/components/findings/math-tab.tsx
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Opportunity } from "@/lib/engine/types";

const KIND_ALGORITHM: Record<
  Opportunity["kind"],
  { name: string; description: string }
> = {
  idle: {
    name: "Idle Detection (IQR + Net-zero)",
    description:
      "Computes idle_score = 0.7 × cpu_norm + 0.3 × net_norm. CPU normalized against p95 IQR baseline. idle_score ≥ 0.80 and peak_cpu_pct ≤ 5% triggers an idle finding.",
  },
  rightsize: {
    name: "Rightsizing (p95 CPU demand model)",
    description:
      "Measures p95 CPU utilization, maps to vCPU demand with 20% headroom, selects the cheapest instance type satisfying that demand. Flags amber when demand_vcpu_with_headroom exceeds 85% of the target type's vCPUs.",
  },
  anomaly: {
    name: "Anomaly Detection (Bollinger Bands on daily cost)",
    description:
      "Computes 7-day rolling mean and 2σ upper band on the daily cost series. day_index is the position within the 14-day window. sigma measures how many standard deviations above the upper band the actual spend was.",
  },
  commitment: {
    name: "Commitment Optimizer (Newsvendor model)",
    description:
      "Fits a log-normal distribution to daily usage samples. Solves the newsvendor critical ratio c_u/(c_u + c_o) to find the commit_level that minimises expected underage + overage cost. coverage_pct is the percentile of demand covered at that level.",
  },
  zombie: {
    name: "Zombie Detection (stopped + near-zero threshold)",
    description:
      "Classifies 'stopped' if there are 0 non-zero CPU datapoints across all data_days. Classifies 'near-stopped' if max_cpu_pct < 0.1%. confidence = 1 − (max_cpu_pct / 0.1) for near-stopped, 1.0 for stopped.",
  },
};

interface MathTabProps {
  opportunity: Opportunity;
  rawEngineData: Record<string, unknown>;
}

export function MathTab({ opportunity: opp, rawEngineData }: MathTabProps) {
  const alg = KIND_ALGORITHM[opp.kind];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Algorithm</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-text-primary font-medium text-sm mb-2">{alg.name}</div>
          <div className="text-text-muted text-sm leading-relaxed">{alg.description}</div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Raw engine output</CardTitle>
        </CardHeader>
        <CardBody>
          <pre className="text-xs text-text-muted font-mono overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(rawEngineData, null, 2)}
          </pre>
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Create `reasoning-tab.tsx`**

```tsx
// apps/web/components/findings/reasoning-tab.tsx
import { Card, CardBody } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";

interface ReasoningTabProps {
  explanation: string | null;
}

export function ReasoningTab({ explanation }: ReasoningTabProps) {
  if (!explanation) {
    return (
      <Empty
        title="No reasoning yet"
        body="The Claude reasoning layer annotates findings after each scan. If this finding is recent, check back in a few minutes."
      />
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono uppercase text-xs text-text-muted tracking-widest">
            Claude · Reasoning
          </span>
        </div>
        <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
          {explanation}
        </div>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 5: Create `resource-tab.tsx`**

```tsx
// apps/web/components/findings/resource-tab.tsx
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { usd } from "@/lib/utils";
import type { Opportunity } from "@/lib/engine/types";
import type { Opportunity as DbFinding, Account } from "@/lib/db/schema";

interface ResourceTabProps {
  finding: DbFinding;
  account: Account;
  opportunity: Opportunity;
}

export function ResourceTab({ finding, account, opportunity: opp }: ResourceTabProps) {
  // resource_id exists on idle, rightsize, zombie but not anomaly/commitment
  const resourceId =
    ("resource_id" in opp ? opp.resource_id : null) ?? finding.resourceId ?? "—";

  const kindLabels: Record<string, string> = {
    idle: "Idle",
    rightsize: "Rightsize",
    anomaly: "Anomaly",
    commitment: "Commitment",
    zombie: "Zombie",
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Resource ID */}
        <div>
          <div className="font-mono uppercase text-xs text-text-muted mb-1">
            Resource ID
          </div>
          <div className="text-text-primary font-mono text-sm break-all">{resourceId}</div>
        </div>

        {/* Grid: account / region / kind / savings / detected / applied */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Account</div>
            <div className="text-text-primary text-sm">{account.name}</div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Region</div>
            <div className="text-text-primary text-sm font-mono">{account.region}</div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Finding kind</div>
            <Chip kind="waste">{kindLabels[finding.kind] ?? finding.kind}</Chip>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Monthly savings</div>
            <div className="text-savings-500 font-semibold tabular-nums text-sm">
              {usd(Number(finding.monthlySavings))}/mo
            </div>
          </div>
          <div>
            <div className="font-mono uppercase text-xs text-text-muted mb-1">Detected</div>
            <div className="text-text-primary text-sm">
              {finding.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
            </div>
          </div>
          {finding.appliedAt && (
            <div>
              <div className="font-mono uppercase text-xs text-text-muted mb-1">Applied</div>
              <div className="text-savings-500 text-sm">
                {finding.appliedAt.toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 6: Run typecheck to confirm no errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "evidence-tab|math-tab|reasoning-tab|resource-tab|finding-detail-tab-bar"
```
Expected: no output (zero errors on these files)

- [ ] **Step 7: Run full test suite to confirm no regressions**

```bash
cd apps/web && npx vitest run 2>&1 | tail -5
```
Expected: all existing tests pass (new files have no tests — pure display wrappers)

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/findings/
git commit -m "d5: finding detail components — tab bar + evidence, math, reasoning, resource tabs"
```

---

### Task 4: Rewrite finding detail page

**Context:** Replaces the Wave 2 stub at `/app/[org]/findings/[id]/page.tsx` with a real RSC page. Fetches the opportunity by UUID, verifies org membership via `INNER JOIN accounts`, adapts `engineData` to typed `Opportunity`, then renders the tab bar + selected tab component. Handles: not-found (wrong ID or wrong org), unparseable engineData (schema drift), and the 4 normal tab states.

**Files:**
- Modify: `apps/web/app/app/[org]/findings/[id]/page.tsx`

- [ ] **Step 1: Write the new page**

```tsx
// apps/web/app/app/[org]/findings/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/lib/db";
import { dbRowToEngineOpportunity } from "@/lib/db/adapters";
import {
  FindingDetailTabBar,
  type DetailTabId,
} from "@/components/findings/finding-detail-tab-bar";
import { EvidenceTab } from "@/components/findings/evidence-tab";
import { MathTab } from "@/components/findings/math-tab";
import { ReasoningTab } from "@/components/findings/reasoning-tab";
import { ResourceTab } from "@/components/findings/resource-tab";
import { Chip } from "@/components/ui/chip";
import { usd } from "@/lib/utils";

const VALID_DETAIL_TABS = [
  "evidence",
  "math",
  "reasoning",
  "resource",
] as const satisfies readonly DetailTabId[];

function parseDetailTab(raw: string | undefined): DetailTabId {
  return (VALID_DETAIL_TABS.includes(raw as DetailTabId) ? raw : "evidence") as DetailTabId;
}

const KIND_LABELS: Record<string, string> = {
  idle: "Idle",
  rightsize: "Rightsize",
  anomaly: "Anomaly",
  commitment: "Commitment",
  zombie: "Zombie",
};

export default async function FindingDetailPage({
  params,
  searchParams,
}: {
  params: { org: string; id: string };
  searchParams: { tab?: string };
}) {
  const { orgId } = await auth();
  if (!orgId) {
    redirect(`/sign-in?return_to=/app/${params.org}/findings/${params.id}`);
  }

  const tab = parseDetailTab(searchParams.tab);

  // Fetch the finding, verifying it belongs to this org via INNER JOIN
  const rows = await db
    .select({
      opp: schema.opportunities,
      account: schema.accounts,
    })
    .from(schema.opportunities)
    .innerJoin(
      schema.accounts,
      eq(schema.opportunities.accountId, schema.accounts.id),
    )
    .where(
      and(
        eq(schema.opportunities.id, params.id),
        eq(schema.accounts.orgId, orgId),
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) notFound();

  const { opp: finding, account } = row;
  const engineOpp = dbRowToEngineOpportunity(finding);

  // Graceful degradation: engineData failed Zod parse (schema drift or corrupt row)
  if (!engineOpp) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
        <div className="font-mono text-[11px] text-text-faint">STRATOS · FINDINGS</div>
        <Chip kind="waste">{finding.kind}</Chip>
        <div className="text-text-muted text-sm mt-2">
          This finding&apos;s engine data could not be parsed — it may be from
          an older scan format. The raw data is stored and will be re-analyzed
          on the next scan.
        </div>
        <Link
          href={`/app/${params.org}/findings`}
          className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
        >
          Back to findings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 font-mono text-[11px] text-text-faint mb-4">
        <Link
          href={`/app/${params.org}/findings`}
          className="hover:text-text-muted transition-colors"
        >
          FINDINGS
        </Link>
        <span>/</span>
        <span className="text-text-muted truncate max-w-[260px]">
          {finding.resourceId ?? engineOpp.kind}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Chip kind="waste">{KIND_LABELS[finding.kind] ?? finding.kind}</Chip>
        {finding.appliedAt && <Chip kind="savings">Applied</Chip>}
        {finding.dismissedAt && <Chip kind="neutral">Dismissed</Chip>}
      </div>
      <div className="text-xl font-semibold text-text-primary mb-1">
        {finding.resourceId ?? "—"}
      </div>
      <div className="text-savings-500 font-semibold tabular-nums mb-6">
        {usd(Number(finding.monthlySavings))}/mo potential savings
      </div>

      {/* Tab bar */}
      <FindingDetailTabBar
        orgSlug={params.org}
        findingId={params.id}
        currentTab={tab}
      />

      {/* Tab content */}
      {tab === "evidence" && <EvidenceTab opportunity={engineOpp} />}
      {tab === "math" && (
        <MathTab opportunity={engineOpp} rawEngineData={finding.engineData} />
      )}
      {tab === "reasoning" && (
        <ReasoningTab explanation={finding.explanation} />
      )}
      {tab === "resource" && (
        <ResourceTab
          finding={finding}
          account={account}
          opportunity={engineOpp}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck the file**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "\[id\]"
```
Expected: no output. Fix any errors before committing.

Common issues to watch for:
- `satisfies readonly DetailTabId[]` — if TS complains, change to `as const` without `satisfies`
- `notFound()` import — must be from `"next/navigation"`, not `"next/dist/..."`
- `finding.engineData` passed to `MathTab` — schema types it as `Record<string, unknown>` which matches

- [ ] **Step 3: Run full test suite**

```bash
cd apps/web && npx vitest run 2>&1 | tail -5
```
Expected: all 145+ tests pass (filter bar adds 5 new tests)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/app/[org]/findings/[id]/page.tsx"
git commit -m "d5: finding detail page — 4-tab RSC replacing Wave 2 stub (evidence/math/reasoning/resource)"
```

---

### Task 5: Ship gauntlet

**Context:** Full quality gate before tagging. Fix any issues before each step — do not batch fixes. The tag is `d5-ships`.

**Files:** No new files. Fixes only if needed.

- [ ] **Step 1: TypeScript typecheck (zero errors)**

```bash
cd apps/web && npx tsc --noEmit 2>&1
```
Expected: no output (exit 0). Fix any errors before step 2.

Common issues to watch for:
- `React.ReactNode` used in `EvidenceRow` without React import — add `import * as React from "react"` or change to `import type { ReactNode } from "react"` and use `ReactNode` instead
- `notFound` from `next/navigation` may need to be checked in Next.js 15 — it should work but verify

- [ ] **Step 2: Full test suite (all green)**

```bash
cd apps/web && npx vitest run 2>&1 | tail -8
```
Expected:
```
Test Files  N passed (N)
Tests       N passed (N)
```
Target: 145+ tests (140 from D4 + 5 new filter bar tests). Fix any failures before step 3.

- [ ] **Step 3: Storybook build (zero errors)**

```bash
cd apps/web && npx storybook build --quiet 2>&1 | tail -5
```
Expected: `✓ built in Xs`

- [ ] **Step 4: Next.js production build (zero errors)**

```bash
cd apps/web && npx next build 2>&1 | tail -25
```
Expected: route table includes:
- `/app/[org]/findings` as `ƒ (Dynamic)`
- `/app/[org]/findings/[id]` as `ƒ (Dynamic)`

- [ ] **Step 5: Ship commit + tag**

```bash
git add -A
git commit -m "d5: ship gauntlet — typecheck + 145+ tests + storybook + next build all green"
git tag d5-ships
git push origin main --tags
```

---

## Self-Review

### 1. Spec coverage

| Requirement (Wave 2 / IA spec) | Task |
|---|---|
| `/app/[org]/findings` list page | Task 2 |
| Filter by `?kind=` (idle/rightsize/anomaly/commitment/zombie) | Tasks 1, 2 |
| All 6 IA state variants on list page | Task 2 (no-scan empty, kind-filtered empty, no-findings empty, filtered list, loading/Suspense) |
| Link each finding card to `/app/[org]/findings/[id]` | Task 2 |
| `/app/[org]/findings/[id]` detail with 4 tabs | Tasks 3, 4 |
| `?tab=evidence` — telemetry evidence per kind | Tasks 3, 4 |
| `?tab=math` — algorithm description + raw engineData | Tasks 3, 4 |
| `?tab=reasoning` — Claude explanation | Tasks 3, 4 |
| `?tab=resource` — resource + account summary | Tasks 3, 4 |
| org-scoped access (INNER JOIN org check) | Task 4 |
| notFound() for wrong ID | Task 4 |
| Graceful degradation when engineData fails Zod parse | Task 4 |
| Breadcrumb back to findings list | Task 4 |
| Replace Wave 2 stub | Task 4 |
| Ship gate: typecheck + tests + storybook + next build | Task 5 |

### 2. Placeholder scan

No TBDs, TODOs, or "add validation" language. All code blocks are complete.

### 3. Type consistency

- `KindFilter` defined in `finding-filter-bar.tsx` → imported by `findings/page.tsx` ✅
- `DetailTabId` defined in `finding-detail-tab-bar.tsx` → imported by `findings/[id]/page.tsx` ✅
- `DbFinding` alias = `Opportunity as DbFinding from "@/lib/db/schema"` — consistent across `resource-tab.tsx` and `findings/[id]/page.tsx` ✅
- `rawEngineData: Record<string, unknown>` passed from `finding.engineData` to `MathTab` — DB schema types this as `jsonb.$type<Record<string, unknown>>()` ✅
- `EvidenceTab` props: `opportunity: Opportunity` (engine type) — correct ✅
- `ResourceTab` props: `finding: DbFinding, account: Account, opportunity: Opportunity` — all present in `[id]/page.tsx` ✅
- `ReasoningTab` props: `explanation: string | null` — `finding.explanation` is `text | null` in schema ✅
