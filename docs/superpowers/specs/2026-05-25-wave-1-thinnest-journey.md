# Stratos — Wave 1: Thinnest Customer Journey

> **Status:** Locked 2026-05-25.
> **Goal:** A stranger lands on the marketing site, signs up, creates an org, connects their AWS account, and sees REAL findings from their own data — without us in the room.
> **Inputs:** IA spec, brand identity, design system v2, app shell (shipped).
> **Scope:** All 5 critical-path screens + the backend pipeline that makes "real findings" possible.

---

## 1. Why this is "Wave 1"

Wave 1 is the **proof point that the product works for one paying customer**. If a stranger can do the whole loop without us, the business is real. Until then we have demos.

Everything else (Azure, GCP, Reports, Forecast detail, Enterprise SSO) is downstream of Wave 1 working.

---

## 2. Locked product decisions

All three came from a direct ask before this spec was drafted.

| # | Decision | Implication |
|---|---|---|
| 1 | **Path A — Real scan against user's AWS** | Validate IAM role via `sts:GetCallerIdentity`. Fetch real CloudWatch metrics. Run `engine/idle.py` against real data. Store real findings. Show in overview. This is the product. |
| 2 | **Fully custom auth forms on Clerk's Elements API** | Pixel-perfect brand fit. No Clerk visual fingerprint. ~1 week more than themed components — worth it because auth is the first impression of a paid product. |
| 3 | **Rebuild connect-AWS wizard from scratch** | The existing `apps/web/components/onboarding/connect-wizard.tsx` was a Phase-1 stub. Wave 1 ships a polished 4-step wizard on v2 primitives + real validation + scan-trigger. |

---

## 3. The 5 critical-path screens

```
[ marketing / ]                         (already exists)
       │
       ▼
[ /sign-up ]                            custom Clerk Elements form
       │
       ▼
[ /sign-up/verify-email ]               6-digit code, custom UI
       │
       ▼
[ /orgs/create ]                        name + slug + sigil-color picker
       │
       ▼
[ /app/[org]/welcome ]                  cloud-picker → connect wizard entry
       │
       ▼
[ /app/[org]/integrations/connect/aws ] 4-step wizard, real IAM validation
       │
       ▼
[ /app/[org] (scanning state) ]         "First scan running…" with live progress
       │
       ▼
[ /app/[org] (results) ]                Pulse + Feed with REAL findings
```

Sub-flows that branch off:
- `/sign-in` → custom form, password + MFA + reset → land on last org used (or `/orgs/create` if none)
- `/accept-invite/[token]` → accept, land in the inviting org's `/app/[org]`
- `/orgs` → cross-org list (skipped if user has exactly 1)

---

## 4. Phases + ship gates

This is too big to ship as one commit set. Four phases, each independently shippable, each visible end-to-end.

### Phase 1 — Auth + Org flow (Sub-project D1)
**Scope:** `/sign-in`, `/sign-up`, `/sign-up/verify-email`, `/sign-in/reset-password`, `/sign-in/mfa`, `/accept-invite/[token]`, `/orgs`, `/orgs/create`. All on Clerk Elements API with custom UI on v2 design system.
**Ship gate:** A stranger can sign up, verify email, create an org, land on `/app/[org]/welcome` (which renders the existing app-shell placeholder).
**Duration:** ~1 week.

### Phase 2 — Welcome + Connect-AWS wizard (Sub-project D2)
**Scope:** `/app/[org]/welcome` (cloud-picker), `/app/[org]/integrations/connect/aws` (rebuilt 4-step wizard), `/api/accounts` POST (real IAM-role validation via `sts:GetCallerIdentity` + region listing). On success, the account is persisted and a stub "scan queued" message renders on `/app/[org]`.
**Ship gate:** A user can connect a real AWS account, our backend successfully assumes the role and confirms it can list resources, and the user sees a "scan queued" state on the overview.
**Duration:** ~1 week.

### Phase 3 — Engine integration + scan pipeline (Sub-project D3)
**Scope:** The backend that turns "scan queued" into "scan complete with findings."
- `apps/web/lib/aws/cloudwatch-fetcher.ts` — fetches CloudWatch metric data for the user's EC2 instances (CPU, network, memory if available) over the last 14 days.
- `engine/main.py` — extend `/analyze` endpoint to accept telemetry payload, run `engine/idle.py` + `engine/rightsizing.py` over it, return findings JSON.
- `apps/web/app/api/scan/route.ts` — POST trigger that:
  1. Loads the account, assumes the IAM role.
  2. Lists EC2 instances + their billing data (via Cost Explorer).
  3. Fetches CloudWatch metrics.
  4. POSTs to engine `/analyze`.
  5. Persists findings to DB.
  6. Returns scan summary.
- `apps/web/db/schema/findings.ts` — Drizzle schema for findings table.
- `apps/web/app/api/findings/route.ts` — GET endpoint returning findings for the active org (replaces the stub from sub-project C).
- Background trigger: when a new AWS account is connected (Phase 2), enqueue a scan automatically. For v1, this is a synchronous call from the connect endpoint — no real queue yet, just inline await with a timeout.

**Ship gate:** Connecting an AWS account with at least 5 EC2 instances results in real findings being written to the DB and returned by the `/api/findings` endpoint.
**Duration:** ~2 weeks.

### Phase 4 — Overview screens wired to real findings (Sub-project D4)
**Scope:**
- `/app/[org]` page with the 4 tabs (pulse / feed / map / forecast).
- `?tab=pulse` → real-time waste pulse summary card (from current scan).
- `?tab=feed` → findings list (using `/api/findings`).
- `?tab=map` → cost-map treemap.
- `?tab=forecast` → forecast cone (using `/api/forecast`; for v1, this can be a placeholder if forecast endpoint isn't ready).
- Port existing `apps/web/components/dashboard/*` (pulse-tile, opportunity-feed, cost-map, forecast-cone) into the new shell + wire to real data instead of the SSE proof stream.
- All screens honour the 6 state variants from the IA spec (loading / empty-first / empty-filtered / partial / permission-denied / error).
- The `?tab=impact` (P1 per IA) is OUT of Wave 1.

**Ship gate:** A signed-in user with a connected AWS account + at least one completed scan sees real findings in the overview, can switch tabs, can drill into a finding detail (which is a stub for now; finding-detail is Wave 2).
**Duration:** ~1 week.

**Total Wave 1: ~5 weeks of execution across 4 phases.** Each phase ships independently. Each ship is a partial-product moment.

---

## 5. Backend architecture

### 5.1 Database schema (new)

```ts
// apps/web/db/schema/accounts.ts (likely exists; verify and extend)
export const accounts = pgTable("accounts", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: text().notNull(),                      // Clerk org ID
  cloud: text().$type<"aws"|"azure"|"gcp">().notNull(),
  name: text().notNull(),                        // user-given alias
  roleArn: text().notNull(),                     // for AWS
  externalId: text().notNull(),
  region: text().notNull(),
  awsAccountId: text(),                          // discovered via STS
  status: text().$type<"pending"|"validated"|"failed">().notNull().default("pending"),
  lastScanAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
});

// apps/web/db/schema/scans.ts (NEW)
export const scans = pgTable("scans", {
  id: uuid().primaryKey().defaultRandom(),
  accountId: uuid().notNull().references(() => accounts.id),
  orgId: text().notNull(),
  status: text().$type<"queued"|"running"|"complete"|"failed">().notNull(),
  startedAt: timestamp().defaultNow().notNull(),
  finishedAt: timestamp(),
  errorMessage: text(),
  totalResources: integer().notNull().default(0),
  totalFindings: integer().notNull().default(0),
  totalSavingsCents: integer().notNull().default(0),   // sum of monthly_savings across findings
});

// apps/web/db/schema/findings.ts (NEW)
export const findings = pgTable("findings", {
  id: uuid().primaryKey().defaultRandom(),
  scanId: uuid().notNull().references(() => scans.id),
  accountId: uuid().notNull().references(() => accounts.id),
  orgId: text().notNull(),
  kind: text().$type<"idle"|"rightsize"|"anomaly"|"commitment"|"drift"|"zombie">().notNull(),
  severity: text().$type<"low"|"medium"|"high">().notNull(),
  resourceType: text().notNull(),                // "ec2:instance", "rds:db", "ebs:volume", …
  resourceId: text().notNull(),                  // i-0abc..., db-xyz, vol-...
  resourceRegion: text().notNull(),
  monthlySavingsCents: integer().notNull(),
  evidence: jsonb().notNull(),                   // per-kind: idle has avg/p95 CPU; rightsize has current+suggested instance types
  reasoning: text(),                             // Claude-generated explanation (Phase 3 wires it; nullable for Phase 3 ship)
  status: text().$type<"open"|"acknowledged"|"snoozed"|"resolved"|"archived">().notNull().default("open"),
  acknowledgedBy: text(),
  acknowledgedAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
});
```

### 5.2 Scan pipeline contract

`POST /api/scan` body: `{ accountId: string }` (validated as org-scoped).

Pipeline:
1. Look up account, verify org membership of caller.
2. Create `scans` row with `status: "running"`.
3. Assume IAM role via AWS SDK STS client.
4. List EC2 instances in the account's region (or all enabled regions if cheap).
5. For each instance, fetch CloudWatch CPU + network metrics for last 14 days (5-min granularity).
6. Build telemetry payload, POST to engine `/analyze`:
   ```json
   {
     "resources": [
       { "id": "i-0abc...", "type": "ec2:instance", "instance_type": "t3.xlarge", "telemetry": { "cpu": [...], "net": [...] }, "hourly_cost": 0.1664 }
     ]
   }
   ```
7. Engine returns:
   ```json
   {
     "findings": [
       { "kind": "idle", "resource_id": "i-0abc...", "severity": "high", "monthly_savings_usd": 121.55, "evidence": { "p95_cpu_pct": 3.2, "uptime_hours": 336 } }
     ]
   }
   ```
8. Insert findings into DB. Update scan row to `complete` + totals. Update account `lastScanAt`.
9. Return `{ scanId, status, totalFindings, totalSavingsCents }`.

Synchronous for Wave 1. Inline await. Cap at ~120s; if exceeded, return scan-in-progress and let the overview poll for completion. (Real queue lands in Wave 2 with a proper background worker.)

### 5.3 Engine endpoint changes

`engine/main.py` already has `/analyze`. Extend its request/response shape to match §5.2. The math layer (`engine/idle.py`, `engine/rightsizing.py`) is unchanged — it already computes the findings; we just wire the I/O.

Pricing data: `engine/pricing.py` (NEW or use existing `engine/catalog.py`) — hardcoded current per-instance-type hourly prices for `us-east-1`. Expand to all regions in Wave 2. Source: AWS Pricing API offline-dump committed to repo (small, ~100 instance types).

---

## 6. Frontend architecture

### 6.1 Custom Clerk Elements forms

Clerk's `<SignIn.Root>` + `<SignUp.Root>` + sub-step components let us hand-build every input on top of Clerk's flow logic. Reference: Clerk Elements docs.

```tsx
// apps/web/app/sign-in/[[...sign-in]]/page.tsx
import * as SignIn from "@clerk/elements/sign-in";
import { Input, Button, Card, ... } from "@/components/ui";

export default function SignInPage() {
  return (
    <SignIn.Root>
      <SignIn.Step name="start">
        {/* Email + password using our design-system primitives */}
      </SignIn.Step>
      <SignIn.Step name="verifications">
        {/* MFA / email code */}
      </SignIn.Step>
      <SignIn.Step name="forgot-password">…</SignIn.Step>
    </SignIn.Root>
  );
}
```

Same pattern for sign-up. The custom forms live OUTSIDE the app shell — they have their own minimal centered layout (logo + form + footer link to terms/privacy).

### 6.2 Welcome wizard

`/app/[org]/welcome` lives INSIDE the shell. Layout:

```
┌───────────────────────────────────────────────────┐
│ Rail │ TopBar                                     │
│      ├─────────────────────────────────────────────┤
│      │                                             │
│      │   STRATOS  ·  WELCOME                       │
│      │                                             │
│      │   Let's connect your first cloud.           │
│      │                                             │
│      │   ┌─────┐  ┌─────┐  ┌─────┐                │
│      │   │ AWS │  │Azure│  │ GCP │                │
│      │   └─────┘  └─────┘  └─────┘                │
│      │                                             │
│      │   You can connect more later in Integrations│
│      │                                             │
└──────┴─────────────────────────────────────────────┘
```

Click AWS → navigate to `/app/[org]/integrations/connect/aws`. Azure + GCP buttons exist but link to "coming soon" stubs (we said multi-cloud day-1 but Wave 1 ships AWS only — multi-cloud copy is the right honest framing).

### 6.3 Connect-AWS wizard (rebuilt)

4 steps, single page with progress bar:

| Step | Purpose | UI |
|---|---|---|
| 1. Name | "What do you call this account?" | Text input, validate non-empty |
| 2. Role | "Run this CloudFormation template OR set up manually" | Two tabs: one-click CFN button + external-id reveal; manual policy with copy-button |
| 3. ARN | "Paste the role ARN" | Text input + region select. On submit → POST /api/accounts |
| 4. Done | "Connected. Running first scan…" | Live progress: "Listing instances… Fetching metrics… Analyzing…" then redirect to /app/[org] |

Built as a single page with internal step state via `useReducer`. Each step is a separate component composed under one `<ConnectAwsWizard>` parent. Uses the design-system `<Card>`, `<Input>`, `<Button>`, `<Chip>`, `<Stat>`, `<Toast>` primitives.

### 6.4 Overview page tabs

`/app/[org]/page.tsx` reads `?tab=` from URL. Default `pulse`. Tabs render different components:

- **Pulse** (existing `components/dashboard/pulse-strip.tsx` + `pulse-tile.tsx`) — top-line stats (waste, savings, anomalies). Wire to `/api/findings` aggregate query.
- **Feed** (existing `components/dashboard/opportunity-feed.tsx` + `opportunity-card.tsx`) — chronological findings list. Wire to `/api/findings?limit=20`.
- **Map** (existing `components/dashboard/cost-map.tsx`) — treemap by service/account. Wire to a new `/api/cost-breakdown` endpoint (Phase 4 ships this).
- **Forecast** (existing `components/dashboard/forecast-cone.tsx`) — wire to existing engine `/forecast` endpoint OR placeholder if not ready.

All existing dashboard components keep their visual code (already on v2 tokens from the design-system migration). The data plumbing changes: SSE proof-stream → React Query against `/api/*` REST endpoints.

State variants honored per IA: skeleton during load, empty-first when no scan yet ("Run your first scan from /welcome"), error with retry, etc.

---

## 7. Critical-path test (the proof point)

End-to-end test in `apps/web/e2e/wave-1.spec.ts` (Playwright):

```ts
test("stranger sign-up → connect AWS → see real finding", async ({ page }) => {
  // 1. Visit /
  // 2. Click "Connect account"
  // 3. Sign up with throwaway email; verify via Clerk's test-mode code
  // 4. Create org "test-co"
  // 5. Click "Connect AWS"
  // 6. Use test IAM role (pre-seeded in a test AWS account)
  // 7. Wait for "scan complete"
  // 8. Assert at least 1 finding rendered in the feed tab
});
```

Test AWS account: a real but minimal AWS account we own with ~5 intentionally-idle EC2 instances to guarantee the engine returns findings. This account is the heartbeat of the product.

---

## 8. What's NOT in Wave 1

- Azure, GCP (locked in IA day-1, but Wave 1 is AWS only; multi-cloud is Wave 6)
- Reports, Settings beyond `/general` and `/members`, Forecast scenarios, Budgets
- Custom roles beyond Owner/Admin/Member
- Findings detail page (separate sub-project; Wave 2)
- Background-job worker (Wave 2)
- Impact-tab tracker (P1, Wave 4)
- Slack / Jira / PagerDuty / webhooks
- Admin internal tools
- Light mode

---

## 9. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Clerk Elements API less mature than rumored | Spike Phase 1 first; if Elements blocks us, fall back to themed `<SignIn />` for v1 and revisit (1-day call) |
| Real AWS scan times out for accounts with 100s of instances | Cap scan at 120s; persist partial findings + status `partial`; document Wave 2 work to chunk + queue |
| Cost Explorer API rate limits (1 req/sec) | Stagger fetches; cache pricing data offline |
| First-scan-takes-too-long UX is bad | Stream progress events via SSE to the overview during the scan |
| User connects an empty account → no findings → looks broken | Empty-first state for `/app/[org]` says "Scan complete. Your account is currently healthy — no waste detected." with explanation of what we look for |
| IAM role permissions wrong → scan fails | Surface friendly error with the exact missing permission; link back to wizard step 2 with copy-button for corrected policy |

---

## 10. Definition of done

A real stranger, given only the URL stratos.dev, can:
1. Sign up (custom form)
2. Verify email
3. Create an org
4. Pick AWS
5. Run the CloudFormation template in their account
6. Paste the role ARN
7. Watch the first scan run live (10–60s)
8. See real $-quantified waste findings from their account
9. Click a finding, see its evidence, math, reasoning, resource cross-link
10. Acknowledge it

All without us in the room. That's Wave 1.

Steps 1–8 land in Wave 1. Step 9–10 (finding detail interactivity) is Wave 2.

---

## 11. Build order

Sub-project D1 → D2 → D3 → D4. Strictly sequential because:
- D2 needs the shell + auth + org from D1
- D3 needs an account to scan (created by D2)
- D4 needs findings to display (created by D3)

Each sub-project gets its own implementation plan and its own execution cycle (spec → plan → subagent-driven build).

The plans live at:
- `docs/superpowers/plans/2026-05-26-d1-auth-org-flow.md`
- `docs/superpowers/plans/2026-05-27-d2-welcome-connect-aws.md`
- `docs/superpowers/plans/2026-05-28-d3-engine-scan-pipeline.md`
- `docs/superpowers/plans/2026-05-29-d4-overview-with-real-findings.md`

---

## 12. Immediate next step

Draft the **D1 (Auth + Org flow) implementation plan** and dispatch execution. D1 unblocks everything downstream.
