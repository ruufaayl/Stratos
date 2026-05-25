# Sub-project D2 — Welcome + Connect-AWS Wizard (Wave 1, Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** A signed-in admin can pick AWS on the welcome page, run the rebuilt 4-step connect wizard, and have the backend really assume their cross-account IAM role (STS → GetCallerIdentity → DescribeRegions). On success, the account is persisted org-scoped and the overview shows a "first scan queued" state.

**Ship gate:** Stranger → sign-up → orgs/create → `/app/[org]/welcome` → pick AWS → wizard → real role assumed → land on `/app/[org]` showing "Scan queued for {accountId}." The actual scan ships in D3.

**Architecture:** The v1 `accounts` table is scoped by `clerkUserId`. D2 migrates it to org-scoped (`orgId text not null`) — this is the first multi-tenancy migration. The existing `validateAwsRole` does most of what we need; D2 hardens it (clearer error mapping, DescribeRegions probe, externalId derivation from org). The wizard is rebuilt from scratch on v2 primitives — single page with `useReducer` step state, no more legacy tokens.

**Spec source:** `docs/superpowers/specs/2026-05-25-wave-1-thinnest-journey.md` §4 Phase 2 + §6.2 + §6.3.

---

## Pre-flight context

Existing pieces this plan modifies or replaces:
- `apps/web/lib/db/schema.ts` — `accounts` table, currently scoped by `clerkUserId`. D2 adds `orgId` + role check.
- `apps/web/lib/aws/connect.ts` — `validateAwsRole()` already does STS assume + EC2 describe. D2 hardens error mapping + replaces EC2 probe with DescribeRegions (broader perm probe, cheaper).
- `apps/web/lib/aws/connect.ts` — `generateExternalId()` exists. D2 changes it to be **deterministic per org** so the CloudFormation template URL is stable.
- `apps/web/app/api/accounts/route.ts` — Zod-validated POST + GET. D2 makes it org-scoped + role-gated (admin or owner).
- `apps/web/components/onboarding/connect-wizard.tsx` — v1 wizard. D2 deletes it. New wizard lives at `components/integrations/connect-aws/`.

Existing pieces this plan re-uses unchanged:
- App shell (sub-project C) — wraps `/app/[org]/*`
- Design system primitives — `Card`, `CardHeader`, `CardBody`, `CardFooter`, `Input`, `Button`, `Chip`, `Stat`, `Toast`, `Empty`
- Motion library — `pageTransition`, `staggerParent`, `cardEnter`
- AppShell placeholder page at `app/app/[org]/page.tsx` — D2 updates it to read "Scan queued" when there's an account but no scan yet

---

## File structure

**Create:**
```
apps/web/
├── app/app/[org]/
│   ├── welcome/page.tsx                                  # Cloud picker (server component)
│   └── integrations/
│       └── connect/
│           └── aws/page.tsx                              # Wizard host page (client)
├── components/integrations/connect-aws/
│   ├── connect-aws-wizard.tsx                            # Stateful root with useReducer
│   ├── step-name.tsx                                     # Step 1
│   ├── step-role.tsx                                     # Step 2 — one-click CFN + manual tabs
│   ├── step-arn.tsx                                      # Step 3 — ARN + region
│   ├── step-verifying.tsx                                # Step 4 — live progress
│   ├── wizard-stepper.tsx                                # Top progress bar
│   ├── policy-blocks.tsx                                 # Trust + permissions JSON blocks with copy
│   ├── code-block.tsx                                    # Reusable copy-to-clipboard JSON viewer
│   └── connect-aws-wizard.test.tsx                       # Reducer + step-transition tests
├── components/welcome/
│   ├── cloud-card.tsx                                    # AWS / Azure / GCP picker tile
│   └── cloud-card.test.tsx
├── lib/aws/
│   ├── external-id.ts                                    # Deterministic per-org externalId derivation
│   └── external-id.test.ts
└── lib/db/migrations/                                    # Drizzle-generated SQL for orgId column
    └── 0002_org_scope_accounts.sql                       # name will vary based on drizzle-kit output
```

**Modify:**
```
apps/web/
├── lib/db/schema.ts                                      # add orgId + roleArn columns to accounts
├── lib/aws/connect.ts                                    # broaden probe to DescribeRegions, sharper error map
├── app/api/accounts/route.ts                             # org-scope + admin-gate
├── app/app/[org]/layout.tsx                              # redirect to /welcome when org has 0 accounts
└── app/app/[org]/page.tsx                                # "Scan queued for X" state when 1+ accounts exist
```

**Delete (after the new wizard ships):**
```
apps/web/components/onboarding/connect-wizard.tsx
```

---

## Phase D2.A — DB schema migration + STS hardening

### Task 1: Add orgId to accounts + add roleArn/externalId/region columns

**Files:**
- Modify: `apps/web/lib/db/schema.ts`
- Generate: `apps/web/lib/db/migrations/00XX_org_scope_accounts.sql` (via `pnpm db:generate`)

The `accounts` table today stores only `clerkUserId` + `name` + `provider` + `config` + tier + Stripe. To match the master spec §5.1, we add:
- `orgId text not null` — Clerk organization ID. Indexed for `where orgId = ?` reads.
- `roleArn text` — nullable for non-AWS providers; set for AWS.
- `externalId text` — nullable; set for AWS.
- `region text not null default 'us-east-1'`
- `awsAccountId text` — discovered via STS GetCallerIdentity, stored for display.
- `status text` — `"pending" | "validated" | "failed"`, default `pending`.
- `lastScanAt timestamp` — nullable.

Keep `clerkUserId` for now (records who created the account) but stop using it as the access-scope key — `orgId` is the new access scope.

- [ ] **Step 1: Update the schema file**

```ts
// apps/web/lib/db/schema.ts — extend the accounts table
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: text("org_id").notNull(),                 // NEW — Clerk org ID
    clerkUserId: text("clerk_user_id").notNull(),    // who created
    name: text("name").notNull(),
    provider: text("provider").notNull(),
    roleArn: text("role_arn"),                       // NEW
    externalId: text("external_id"),                 // NEW
    region: text("region").notNull().default("us-east-1"), // NEW
    awsAccountId: text("aws_account_id"),            // NEW
    status: text("status").notNull().default("pending"), // NEW
    lastScanAt: timestamp("last_scan_at"),           // NEW
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    tier: text("tier").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    orgIdx: index("accounts_org_idx").on(t.orgId),                       // NEW
    clerkUserIdx: index("accounts_clerk_user_idx").on(t.clerkUserId),
  }),
);
```

- [ ] **Step 2: Generate migration**

```bash
cd /c/dev/stratos/apps/web && pnpm db:generate
```

This produces `lib/db/migrations/0002_<name>.sql`. Inspect it. It should be additive only — no destructive DDL. The new `orgId` column is `NOT NULL` which would fail on existing rows; for that, edit the generated SQL to add a transitional default of `"legacy"` (we'll backfill or wipe legacy rows in a separate step — for D2 dev environments, blowing away the table is acceptable).

- [ ] **Step 3: Apply migration locally**

```bash
cd /c/dev/stratos/apps/web && pnpm db:push     # in dev, just push the schema directly
```

If you have existing rows with no `orgId`, either:
- (dev) `delete from accounts;` then re-push, OR
- backfill with a sentinel; we won't query them ever again

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/lib/db/migrations
git commit -m "d2: accounts table — add orgId, roleArn, externalId, region, status"
```

---

### Task 2: Deterministic per-org externalId

**Files:**
- Create: `apps/web/lib/aws/external-id.ts`
- Create: `apps/web/lib/aws/external-id.test.ts`
- Modify: `apps/web/lib/aws/connect.ts` (remove `generateExternalId` if it exists; or leave for backward compat)

The IAM external-id is the per-org secret baked into the trust policy. It must be stable per org so the CloudFormation template URL is stable across sessions, but unguessable.

```ts
// apps/web/lib/aws/external-id.ts
import { createHmac } from "crypto";

const SECRET = process.env.STRATOS_EXTERNAL_ID_SECRET;
if (!SECRET) throw new Error("STRATOS_EXTERNAL_ID_SECRET env var is required");

/**
 * Derive a stable, unguessable external-id from an org ID.
 * Uses HMAC-SHA256 + 32-char base32 truncation.
 *
 * Stable: same orgId → same externalId across sessions.
 * Unguessable: without SECRET, an attacker cannot predict it.
 */
export function externalIdForOrg(orgId: string): string {
  const mac = createHmac("sha256", SECRET).update(`org:${orgId}`).digest("hex");
  // Take 16 hex chars (64 bits of entropy — more than enough for an external-id)
  return `stratos-${mac.slice(0, 16)}`;
}
```

Test:
```ts
describe("externalIdForOrg", () => {
  it("is deterministic for the same orgId", () => {
    process.env.STRATOS_EXTERNAL_ID_SECRET = "test-secret";
    const { externalIdForOrg } = await import("./external-id");
    expect(externalIdForOrg("org_abc")).toBe(externalIdForOrg("org_abc"));
  });
  it("differs across orgIds", () => {
    expect(externalIdForOrg("org_abc")).not.toBe(externalIdForOrg("org_xyz"));
  });
  it("has the stratos- prefix and 16 hex chars", () => {
    expect(externalIdForOrg("org_abc")).toMatch(/^stratos-[0-9a-f]{16}$/);
  });
});
```

Add `STRATOS_EXTERNAL_ID_SECRET` to `.env.example` with a placeholder. Document that production must override with a high-entropy secret.

Commit: `d2: deterministic externalId derivation from orgId (HMAC-SHA256)`

---

### Task 3: Harden validateAwsRole — DescribeRegions probe + sharper error map

**Files:**
- Modify: `apps/web/lib/aws/connect.ts`
- Create: `apps/web/lib/aws/connect.test.ts` (mock the AWS SDK)

The existing `validateAwsRole` does `STS:AssumeRole` then `EC2:DescribeInstances` as the perm probe. Two issues:
- DescribeInstances is expensive on accounts with thousands of instances (the response is huge).
- DescribeInstances doesn't tell us if `cloudwatch:GetMetricStatistics` or `ce:GetCostAndUsage` work.

D2 changes the probe to `EC2:DescribeRegions` (small response, validates broad EC2 read), AND a second probe `STS:GetCallerIdentity` from the assumed credentials (validates the assumed identity).

After the role assumes successfully, run:
1. `STS:GetCallerIdentity` with assumed credentials → extract `Arn`, `Account`.
2. `EC2:DescribeRegions` with assumed credentials → confirm read access.

Map common AWS errors to friendly messages (return as `error: string`, not Error objects):

| AWS code | Friendly message |
|---|---|
| `AccessDenied` on AssumeRole | "Stratos cannot assume this role. Check the trust policy includes our principal and your external-id." |
| `InvalidClientTokenId` | "Stratos AWS credentials look invalid. Contact support." |
| `MalformedPolicyDocument` | "The role's trust policy is malformed. See the manual setup tab for the exact policy." |
| `NoSuchEntity` | "This role does not exist. Double-check the ARN." |
| `AccessDenied` on DescribeRegions | "Role assumed, but it cannot list regions. Add `ec2:Describe*` to its inline policy." |
| anything else | "AWS error: {raw message}" — only as last resort |

Return shape unchanged: `{ ok: true, accountId, callerArn } | { ok: false, error }`.

- [ ] **Tests** — mock `@aws-sdk/client-sts` and `@aws-sdk/client-ec2` via vitest, drive each error path:
  - happy path returns ok+accountId
  - AccessDenied on AssumeRole → "cannot assume this role"
  - NoSuchEntity → "this role does not exist"
  - happy assume + AccessDenied on DescribeRegions → "cannot list regions"

Commit: `d2: harden validateAwsRole — DescribeRegions probe + friendly error map`

---

## Phase D2.B — Welcome page

### Task 4: CloudCard component

**Files:**
- Create: `apps/web/components/welcome/cloud-card.tsx`
- Create: `apps/web/components/welcome/cloud-card.test.tsx`

A picker tile for AWS / Azure / GCP. Three states:
- `available` — primary, clickable, full color
- `coming-soon` — secondary, disabled, "Coming soon" chip
- `connected` — savings-bordered, "✓ Connected" chip + count

```tsx
type Cloud = "aws" | "azure" | "gcp";
type Status = "available" | "coming-soon" | "connected";

type Props = {
  cloud: Cloud;
  status: Status;
  href: string;
  connectedCount?: number;
};

export function CloudCard({ cloud, status, href, connectedCount }: Props) { /* … */ }
```

Visual: `Card` primitive with intent matching status (default / muted / savings). 240×180 square, logo top-center, label + status chip below, "Connect →" CTA at bottom (or "View" if connected).

Test:
- `available` → renders Link to href, primary button visible
- `coming-soon` → no Link, disabled state, "Coming soon" chip visible
- `connected` → "✓ Connected" chip + count visible

Commit: `d2: CloudCard component (AWS / Azure / GCP picker tile)`

---

### Task 5: Welcome page

**Files:**
- Create: `apps/web/app/app/[org]/welcome/page.tsx`
- Modify: `apps/web/app/app/[org]/layout.tsx`

Server component. Reads `orgId` from `params.org` (resolved to id via Clerk). Queries the `accounts` table for this org. Decides:
- 0 accounts → show full welcome layout with 3 cloud cards
- 1+ accounts → redirect to `/app/[org]` (welcome is only for first-time)

Layout:
- Top: small "Stratos · Welcome" eyebrow text
- Middle: H2 "Let's connect your first cloud."
- Three CloudCards in a row (AWS available, Azure + GCP coming-soon)
- Below: text "You can connect more later in Integrations."

Layout edit (`app/app/[org]/layout.tsx`):
- After existing org-resolution logic, if path is NOT `/welcome` AND the org has 0 accounts → `redirect("/app/${slug}/welcome")`.
- This implements the "welcome forces the first connect" gate from the master spec.

Commit: `d2: /app/[org]/welcome page (cloud picker) + first-connect gate in layout`

---

## Phase D2.C — Connect-AWS wizard rebuild

### Task 6: Wizard reducer + step state types

**Files:**
- Create: `apps/web/components/integrations/connect-aws/connect-aws-wizard.tsx` (root with useReducer ONLY; step components in subsequent tasks)
- Create: `apps/web/components/integrations/connect-aws/connect-aws-wizard.test.tsx`

State shape:

```ts
type Step = 1 | 2 | 3 | 4;
type WizardState = {
  step: Step;
  name: string;
  roleArn: string;
  region: string;
  // Step-4 progress
  phase: "idle" | "assuming" | "identity" | "regions" | "persisting" | "done" | "error";
  errorMessage: string | null;
  // Result fields, populated after success
  accountId: string | null;
  awsAccountId: string | null;
};

type Action =
  | { type: "SET_NAME"; value: string }
  | { type: "SET_ROLE_ARN"; value: string }
  | { type: "SET_REGION"; value: string }
  | { type: "NEXT_STEP" } | { type: "PREV_STEP" } | { type: "GOTO_STEP"; step: Step }
  | { type: "PHASE"; phase: WizardState["phase"]; errorMessage?: string }
  | { type: "SUCCESS"; accountId: string; awsAccountId: string }
  | { type: "RESET" };
```

Reducer enforces:
- Cannot advance from step 1 without a non-empty `name`
- Cannot advance from step 3 without an ARN matching `/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/`
- `PHASE` transitions only allowed when `step === 4`
- `SUCCESS` only allowed from `phase: "persisting"`

Tests:
- Initial state: step=1, all fields empty
- `SET_NAME("acme")` then `NEXT_STEP` → step=2
- `NEXT_STEP` from step=1 with empty name → state unchanged (or surfaces error)
- `SET_ROLE_ARN("invalid")` then `NEXT_STEP` from step=3 → state unchanged
- `SET_ROLE_ARN("arn:aws:iam::123456789012:role/Test")` then `NEXT_STEP` from step=3 → step=4
- `PHASE("done")` from step=2 → unchanged (only allowed at step=4)

Commit: `d2: wizard reducer + state types (step-gated transitions)`

---

### Task 7: Step 1 (Name) + Step 3 (ARN+Region) UI

**Files:**
- Create: `apps/web/components/integrations/connect-aws/step-name.tsx`
- Create: `apps/web/components/integrations/connect-aws/step-arn.tsx`

Both are simple form steps using `<Card>` + `<Input>` + `<Button>`. Each receives `state` + `dispatch` from the parent reducer.

`step-name.tsx`:
- Title: "Name your AWS account"
- Body: "Give this connection a memorable name — usually your AWS account alias or environment."
- Input: name (placeholder "acme-prod"). `<SlugInput>` is NOT used here (no slug, just a free-form name).
- "Continue →" button. Disabled when name is empty.

`step-arn.tsx`:
- Title: "Paste the role ARN"
- Body: "Copy the role ARN from the CloudFormation outputs or the IAM console."
- Input: role ARN. Placeholder `arn:aws:iam::123456789012:role/StratosReadOnly`. Validates the regex inline (live `aria-invalid`).
- Select: region. 8 default regions from the original wizard.
- Back + "Verify & connect →" buttons. Verify button disabled until ARN matches the regex.

No tests on these two — pure presentational. Coverage comes through the reducer tests in Task 6 and the integration test in Task 12.

Commit: `d2: wizard steps 1 + 3 (name + ARN/region) on v2 primitives`

---

### Task 8: Step 2 (Create IAM role) — CFN + manual tabs

**Files:**
- Create: `apps/web/components/integrations/connect-aws/step-role.tsx`
- Create: `apps/web/components/integrations/connect-aws/code-block.tsx`
- Create: `apps/web/components/integrations/connect-aws/policy-blocks.tsx`

The most content-dense step. Two tabs:
- **One-click CloudFormation** (default, primary)
- **Manual setup** (collapsible details)

CFN tab:
- "Launches a CloudFormation stack that creates the read-only IAM role with the correct trust policy and inline permissions, pre-configured."
- Large button: "Launch in CloudFormation →" — opens AWS console with the prefilled template URL + params (externalId, stratosPrincipal) in a new tab.
- Below: tiny mono row showing the external-id (read-only, with copy button).

Manual tab:
- Step-by-step text instructions: "1. Create a new IAM role with this trust policy:" → `<CodeBlock>` showing JSON.
- "2. Attach this inline policy:" → `<CodeBlock>` showing JSON.
- Both code blocks have copy-to-clipboard buttons.

`<CodeBlock>` is a reusable component (could live in `components/ui/` later — for now keep in the wizard folder; promote later).

Need to inject the org's `externalId` into the trust policy text and the `stratosPrincipal` ARN into the displayed JSON.

**Implementation note: the wizard is a CLIENT component but it needs the externalId.** Pass it as a prop from the page (server component) that wraps the wizard. The page reads `useOrg`-equivalent (server-side from Clerk) → `externalIdForOrg(orgId)` → passes down.

Test (step-role.test.tsx):
- CFN URL is constructed correctly (encodeURIComponent on params)
- Tab switching renders both tabs' content
- Copy buttons exist (functionality covered by code-block's own test)

Commit: `d2: wizard step 2 — CloudFormation + manual setup tabs with policy blocks`

---

### Task 9: Step 4 (Verifying) — live progress with phase animation

**Files:**
- Create: `apps/web/components/integrations/connect-aws/step-verifying.tsx`

Step 4 is the executor. On mount (when the wizard reducer transitions to `step: 4`), it:
1. Dispatches `PHASE: "assuming"` → calls `POST /api/accounts`
2. Server side, that endpoint does:
   - `STSAssumeRole` → fires SSE event "phase: identity" — OR — we just rely on the sequential phases shown client-side without server feedback (KISS for v1).
3. On response:
   - 200 + `{ accountId, awsAccountId }` → dispatch `SUCCESS`, after 1.5s redirect to `/app/[org]`
   - 422 + `{ error }` → dispatch `PHASE: "error", errorMessage: error`. Show retry button → back to step 3.

KISS choice: no SSE for D2's verifying screen. Use a synthetic 4-phase animation client-side that auto-advances every 400ms (assuming → identity → regions → persisting), regardless of actual server progress. The server call resolves whenever it does; if it's still pending when phases complete, show "Almost done…". When server returns, dispatch SUCCESS.

This makes the UX feel responsive on slow networks AND simple to implement. Trade-off: phase labels aren't tied to actual server-side progress; we'll add SSE in D3 when scans take longer.

Visual:
- Centered card. Top: pulsing dot with the phase label.
- 4 sub-steps shown as a vertical list:
  - "Assuming the role…"
  - "Confirming identity…"
  - "Testing permissions…"
  - "Connecting…"
- Each phase: spinner while active, green check when complete, gray dot when pending.
- On error: red X + the friendly message + "Try again" button → goes to step 3.
- On success: "✓ Connected to AWS account {awsAccountId}" + "Redirecting…" → `router.push("/app/${org}")`.

Commit: `d2: wizard step 4 (verifying) — 4-phase live progress + redirect on success`

---

### Task 10: Wizard root composition + stepper + host page

**Files:**
- Modify: `apps/web/components/integrations/connect-aws/connect-aws-wizard.tsx` (now compose the steps; reducer is already in place from Task 6)
- Create: `apps/web/components/integrations/connect-aws/wizard-stepper.tsx`
- Create: `apps/web/app/app/[org]/integrations/connect/aws/page.tsx`

`<WizardStepper>`:
- Top-of-page horizontal stepper showing 4 numbered circles + labels: Name · Role · Verify · Done
- Active step: filled with intel-500
- Completed: filled with savings-500 + checkmark
- Pending: hollow with text-text-faint border

`<ConnectAwsWizard>`:
- Calls `useReducer(reducer, initialState)`
- Reads `externalId` + `stratosPrincipal` from props
- Renders `<WizardStepper currentStep={state.step} />` always
- Renders the matching step component below based on `state.step`
- Wraps the step in `<motion.div>` with `pageTransition` so changes feel smooth

Host page (`app/app/[org]/integrations/connect/aws/page.tsx`):
- Server component
- Resolves org from URL
- Checks role: only `owner` or `admin` allowed. Member → renders `<Empty kind="permission-denied" />` (use existing `Empty` primitive with body "Ask an admin to connect AWS." and a mailto: to the org owner).
- Resolves externalId via `externalIdForOrg(orgId)`
- Resolves `stratosPrincipal` from `process.env.STRATOS_AWS_PRINCIPAL_ARN` (e.g. `arn:aws:iam::ACCOUNT:role/StratosCrossAccountAssumer`)
- Renders `<ConnectAwsWizard externalId={…} stratosPrincipal={…} orgSlug={params.org} />`

Commit: `d2: wizard root + stepper + /app/[org]/integrations/connect/aws host page`

---

## Phase D2.D — Backend integration

### Task 11: Org-scope + admin-gate the POST /api/accounts route

**Files:**
- Modify: `apps/web/app/api/accounts/route.ts`

Changes:
1. Pull `orgId` from `auth()` (returns `orgRole` too).
2. If no `orgId` → 400 "active org required".
3. If `orgRole` is not `org:admin` or `org:owner` → 403 "admin role required".
4. Reject the client-supplied externalId in the body — derive it server-side from `externalIdForOrg(orgId)`. The client doesn't get to control it.
5. Update the Zod schema to drop `externalId`.
6. Persist `orgId` + `roleArn` + `externalId` + `region` + `awsAccountId` + `status: "validated"`.
7. Drop the `kicks off the first analysis run immediately` behavior — D2 stops here. The scan is D3.

GET handler:
- Filter by `orgId` instead of `clerkUserId`. Member can read; only admin can write.

Schema:
```ts
const CreateAccountSchema = z.object({
  name: z.string().min(1).max(64),
  roleArn: z.string().regex(/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]+$/),
  region: z.string().default("us-east-1"),
});
```

POST flow:
- Validate input
- Compute `externalId = externalIdForOrg(orgId)`
- Call `validateAwsRole(roleArn, externalId)`
- If `!ok` → 422 `{ error: validation.error }`
- Insert account row with `status: "validated"`, `awsAccountId: validation.accountId`
- Return `{ account: { id, awsAccountId, name, region, status } }`

Commit: `d2: /api/accounts — org-scope + admin-gate + server-derived externalId`

---

### Task 12: Overview "Scan queued" state

**Files:**
- Modify: `apps/web/app/app/[org]/page.tsx`

Current placeholder says "Shell mounted." D2 makes it conditional:
- If org has 0 accounts → middleware already redirected to `/welcome` (Task 5). So this branch shouldn't happen if the layout-redirect works; but defensively render an `<Empty>` directing back to welcome.
- If org has 1+ account, 0 scans → render "Scan queued" card with the account name + AWS account ID + "Scan will run shortly. (D3 ships the real scan pipeline.)".
- If org has 1+ account, 1+ scans → render the existing dashboard zones (Pulse / Feed / Cost Map / Forecast — those wire to real data in D4).

For D2, only the first two branches matter — the third is "not yet implemented; falls back to scan-queued state until D4." Add a TODO comment.

Card layout:
```
┌────────────────────────────────────────────────┐
│ ⏳  Scan queued                                 │
│                                                │
│ Connected: {accountName} ({awsAccountId})      │
│ Region: {region}                               │
│                                                │
│ The Stratos engine will analyze your account   │
│ shortly. You'll see findings here when the     │
│ first scan completes.                          │
└────────────────────────────────────────────────┘
```

Commit: `d2: /app/[org] overview — Scan queued card for accounts without runs`

---

### Task 13: Update layout to redirect to welcome when org has 0 accounts

**Files:**
- Modify: `apps/web/app/app/[org]/layout.tsx`

Already specified in Task 5 Step 2 but worth its own task because it touches the layout and needs care:

After the existing slug-match + active-org-set logic, add:
```ts
const accounts = await db.select({ id: schema.accounts.id })
  .from(schema.accounts)
  .where(eq(schema.accounts.orgId, orgId))
  .limit(1);

const path = headers().get("x-pathname") ?? ""; // or derive from params/hooks
const isWelcomeOrConnect = path.endsWith("/welcome") || path.includes("/integrations/connect/");
if (accounts.length === 0 && !isWelcomeOrConnect) {
  redirect(`/app/${params.org}/welcome`);
}
```

Note: Next.js App Router doesn't expose `pathname` to server-component layouts cleanly. Two workarounds:
- Use `headers()` from `next/headers` and rely on middleware to set `x-pathname` — there's a known pattern for this.
- Use the URL from `Request` via the `notFound`/`headers` Next.js primitives.
- Easiest: just check if path is `welcome` or `connect/aws` in the layout — both routes already render under this layout, so we need to whitelist them.

Simplest correct approach: have the welcome page itself not need the redirect to live (it's the destination). And the connect/aws page is also a destination. The layout-level redirect only triggers when the current request would render a NON-welcome, NON-connect page. Use Next.js's `redirect()` in the page's own loader (which IS pathname-aware): instead of the layout, move the gate INTO each /app/[org]/* page (or factor a helper).

Easiest of all: don't put the gate in the layout. Put it in the **overview page** (`/app/[org]/page.tsx`) — if 0 accounts → redirect to welcome. Other pages don't need the gate because they're reached from inside the app, not from sign-in. This matches what the master spec actually says ("forced first-cloud-connect wizard" from the welcome page).

Adjustment: skip the layout-level gate. The redirect lives at `/app/[org]/page.tsx`:
```ts
if (accounts.length === 0) redirect(`/app/${params.org}/welcome`);
```

Commit: `d2: /app/[org] page — redirect to /welcome when org has 0 accounts`

(This collapses Task 13 into Task 12. Skip Task 13 as a separate commit and update Task 12's diff to include the redirect.)

---

### Task 14: Delete the legacy connect-wizard

**Files:**
- Delete: `apps/web/components/onboarding/connect-wizard.tsx`

Confirm nothing else imports `connect-wizard` from `components/onboarding/`:
```bash
grep -rn "from.*onboarding/connect-wizard" apps/web 2>&1
```
If clean, delete the file. Otherwise, fix call sites first.

Commit: `d2: remove legacy components/onboarding/connect-wizard.tsx`

---

## Phase D2.E — Stories + final QA

### Task 15: Storybook stories for new components

**Files:**
- Create: `apps/web/components/welcome/cloud-card.stories.tsx`
- Create: `apps/web/components/integrations/connect-aws/connect-aws-wizard.stories.tsx`
- Create: `apps/web/components/integrations/connect-aws/code-block.stories.tsx`

Stories:
- **CloudCard**: Available, ComingSoon, Connected — one story per state for each cloud (3 × 3 = 9, or 3 with knobs)
- **CodeBlock**: Trust policy, Inline policy — 2 stories
- **ConnectAwsWizard**: Step 1, Step 2 (CFN tab), Step 2 (manual tab), Step 3, Step 4 (assuming), Step 4 (success), Step 4 (error) — 7 stories. Mock the wizard reducer state via initial props so each story renders at a specific step.

The wizard component needs to accept an optional `initialState` prop (for stories + tests). In production it's not passed; in stories it forces a specific step.

Commit: `d2: Storybook stories for CloudCard, CodeBlock, ConnectAwsWizard`

---

### Task 16: Final D2 ship gauntlet

From `/c/dev/stratos/apps/web`:
1. `pnpm typecheck` → PASS
2. `pnpm test:run` → PASS (target: 79 prior + ~10 new = ~89 tests)
3. `pnpm storybook:build` → PASS
4. `pnpm build` → PASS

Manual smoke (requires `.env.local` with Clerk + Neon + STRATOS_EXTERNAL_ID_SECRET + STRATOS_AWS_PRINCIPAL_ARN):
- Sign in → navigate to `/app/<slug>/welcome`
- Click AWS card → land at wizard step 1
- Fill name "test-acme" → step 2
- Copy the trust policy → switch to manual tab → see inline policy
- Switch back to CFN tab → click "Launch" (opens AWS in new tab)
- Paste a real role ARN (from your test AWS account) → step 4
- Watch the 4-phase progress → see "✓ Connected"
- Redirect to `/app/<slug>` → see "Scan queued" card

Commit: `d2: ships — Welcome + Connect-AWS wizard gauntlet passes`

---

## Self-review

**Spec coverage** against master spec §4 Phase 2 + §6.2 + §6.3:

| Spec requirement | Plan task |
|---|---|
| `/app/[org]/welcome` cloud-picker | Tasks 4 + 5 |
| `/app/[org]/integrations/connect/aws` rebuilt wizard | Tasks 6–10 |
| Real IAM-role validation via STS GetCallerIdentity + region listing | Task 3 |
| On success, account persisted | Task 11 |
| "Scan queued" message on `/app/[org]` | Task 12 |
| Welcome forces first connect | Task 12 (via redirect from overview page) |
| 4-step wizard: Name → Role → Verify → Done | Tasks 7 + 8 + 9 + 10 |
| Single page with useReducer step state | Task 6 |
| Uses design-system primitives | Tasks 7–10 (Card, Input, Button, Chip, Toast, Empty) |
| State variants honored | Tasks 5, 9, 10 (loading, empty-first, permission-denied, error) |

**Placeholder scan:** none.

**Type consistency:** `Cloud` ("aws" | "azure" | "gcp") matches `cloud-context.tsx`'s definition. `Role` ("owner" | "admin" | "member") matches `org-context.tsx`. `WizardState.phase` is the wizard's local enum, not exported.

**Risks tracked in master spec §9:**
- "Real AWS scan times out" — N/A for D2 (no scan yet)
- "Cost Explorer rate limits" — N/A for D2
- "IAM role permissions wrong → scan fails" — handled in Task 3's error map (DescribeRegions probe surface AccessDenied as friendly text)
- "User connects empty account → no findings" — N/A for D2 (D4's overview problem)

---

## Execution handoff

Plan complete. Recommended: subagent-driven-development. Begin with Phase D2.A (Tasks 1–3) as a single batch since they're tightly coupled (schema → externalId → STS hardening, all backend infra).
