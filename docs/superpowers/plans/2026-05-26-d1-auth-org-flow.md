# Sub-project D1 — Auth + Org Flow (Wave 1, Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task.

**Goal:** Custom auth pages on Clerk Elements API + org creation/list/invite flow, on the v2 design system, inside (and outside) the app shell. Ship gate: stranger can sign up → verify email → create org → land on `/app/[org]/welcome`.

**Architecture:** Two route groups in Next.js — `(auth)` for unauthenticated forms with their own minimal centered layout (logo + form + footer), `(orgs)` for org list/create that runs inside Clerk auth but outside the app shell. The app shell wraps only `/app/[org]/*` (already done in sub-project C).

**Tech stack:** Clerk Elements (`@clerk/elements`) for `<SignIn.Root>` / `<SignUp.Root>` composables, our v2 design-system primitives (Card / Input / Button / Stat), Tailwind v2 tokens. Vitest + Testing Library for hook + render tests. Clerk's test-mode codes (`424242`) for verification step in tests.

**Spec source:** `docs/superpowers/specs/2026-05-25-wave-1-thinnest-journey.md` §3 (5 critical-path screens) + §6.1 (custom Clerk Elements forms).

---

## File structure

**Create:**
```
apps/web/
├── app/
│   ├── (auth)/                                  # route group — no app-shell wrap
│   │   ├── layout.tsx                           # centered minimal layout (logo + form + footer)
│   │   ├── sign-in/[[...sign-in]]/page.tsx      # Clerk Elements SignIn.Root
│   │   ├── sign-up/[[...sign-up]]/page.tsx      # Clerk Elements SignUp.Root
│   │   └── accept-invite/[token]/page.tsx       # invitation acceptance
│   ├── (orgs)/                                  # route group — auth required, no shell
│   │   ├── layout.tsx                           # similar centered layout, but signed-in
│   │   ├── orgs/page.tsx                        # list user's orgs (skip-redirect if exactly 1)
│   │   └── orgs/create/page.tsx                 # name + slug + sigil color picker
│   └── api/orgs/route.ts                        # POST create org (Clerk pass-through with our validation)
├── components/auth/
│   ├── auth-card.tsx                            # centered card wrapper used by sign-in/sign-up
│   ├── auth-link.tsx                            # styled <Link> for "Forgot password?", "Sign up", etc.
│   ├── auth-footer.tsx                          # legal + brand line
│   ├── otp-input.tsx                            # 6-digit code split-input (used by verify-email + MFA)
│   ├── sigil-picker.tsx                         # 7-color picker for orgs/create
│   └── slug-input.tsx                           # slug input with live availability check + reserved-slug validation
├── lib/auth/
│   ├── reserved-slugs.ts                        # const list from IA §4.2
│   └── post-auth-redirect.ts                    # decide where to send user after sign-in/up
└── components/auth/__tests__                    # paired tests
```

**Modify:**
```
apps/web/middleware.ts                           # extend after-sign-in/up redirect logic
```

---

## Phase 1.A — Setup + shared auth chrome

### Task 1: Install Clerk Elements + auth-card scaffold

**Files:**
- Modify: `apps/web/package.json` (add `@clerk/elements`)
- Create: `apps/web/components/auth/auth-card.tsx`
- Create: `apps/web/components/auth/auth-link.tsx`
- Create: `apps/web/components/auth/auth-footer.tsx`
- Create: `apps/web/app/(auth)/layout.tsx`

- [ ] **Step 1: Add the dep**

```bash
cd /c/dev/stratos/apps/web && pnpm add @clerk/elements
```

Verify it pulls a recent version (≥ 0.18 as of mid-2026). If it can't find the package, fall back to Clerk's documented namespace (`@clerk/clerk-react` exports may have been reorganized — check Clerk's docs).

- [ ] **Step 2: Write `auth-card.tsx`**

```tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function AuthCard({ title, subtitle, children, footer, className }: Props) {
  return (
    <div className={cn(
      "w-full max-w-[420px] bg-bg-elevated border border-border-subtle rounded-card p-8 shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
      className,
    )}>
      <div className="mb-6 text-center">
        <h1 className="text-h2 text-text-primary">{title}</h1>
        {subtitle && <p className="text-text-muted text-sm mt-2">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
      {footer && <div className="mt-6 pt-6 border-t border-border-subtle text-center text-mono-sm font-mono">{footer}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Write `auth-link.tsx`** — small typography-anchor with v2 intel-300 hover.
- [ ] **Step 4: Write `auth-footer.tsx`** — legal + brand line ("© Stratos · Global · No HQ" + links to /legal/terms /legal/privacy).
- [ ] **Step 5: Write `app/(auth)/layout.tsx`**

```tsx
import Link from "next/link";
import { AuthFooter } from "@/components/auth/auth-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-bg-canvas px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-text-primary">
        <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
        <span className="font-semibold tracking-tight">Stratos</span>
      </Link>
      <div className="flex-1 flex items-center w-full justify-center">{children}</div>
      <div className="mt-8 max-w-[420px] w-full">
        <AuthFooter />
      </div>
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/components/auth/ apps/web/app/(auth)/layout.tsx
git commit -m "d1: install @clerk/elements + AuthCard/AuthLink/AuthFooter + (auth) layout"
```

---

## Phase 1.B — Sign-up flow

### Task 2: `/sign-up` page (Clerk Elements custom form)

**Files:**
- Create: `apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `apps/web/components/auth/otp-input.tsx`

- [ ] **Step 1: Implement OTP input**

A 6-cell split-input. Each cell is one digit. Pasting a 6-digit code distributes across cells. Backspace moves backward. Focus advances forward on input.

```tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Props = {
  length?: number;
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
};

export function OtpInput({ length = 6, value, onChange, ariaLabel = "Verification code" }: Props) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, char: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[i] = char;
    const next = chars.join("").trimEnd().slice(0, length);
    onChange(next);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, "").slice(-1);
            if (c) {
              setAt(i, c);
              refs.current[i + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i]) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (text.length) {
              e.preventDefault();
              onChange(text);
              refs.current[Math.min(text.length, length - 1)]?.focus();
            }
          }}
          className={cn(
            "size-12 text-center text-xl font-mono bg-bg-surface border border-border-subtle rounded-md text-text-primary",
            "focus:border-intel-500 focus:outline-none",
          )}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Test the OTP**

```tsx
// apps/web/components/auth/otp-input.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OtpInput } from "./otp-input";
import * as React from "react";

function Harness() {
  const [v, setV] = React.useState("");
  return <><OtpInput value={v} onChange={setV} /><div data-testid="v">{v}</div></>;
}

describe("OtpInput", () => {
  it("types into cells in order and advances focus", () => {
    render(<Harness />);
    const cells = screen.getAllByLabelText(/Digit/);
    fireEvent.change(cells[0], { target: { value: "1" } });
    fireEvent.change(cells[1], { target: { value: "2" } });
    fireEvent.change(cells[2], { target: { value: "3" } });
    expect(screen.getByTestId("v").textContent).toBe("123");
  });

  it("accepts a pasted 6-digit code", () => {
    render(<Harness />);
    const cells = screen.getAllByLabelText(/Digit/);
    fireEvent.paste(cells[0], { clipboardData: { getData: () => "424242" } });
    expect(screen.getByTestId("v").textContent).toBe("424242");
  });
});
```

Run, expect FAIL → implement → PASS.

- [ ] **Step 3: Write `/sign-up` page**

Use `@clerk/elements/sign-up` composables. Pattern:

```tsx
import * as SignUp from "@clerk/elements/sign-up";
import * as Clerk from "@clerk/elements/common";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthLink } from "@/components/auth/auth-link";
import { OtpInput } from "@/components/auth/otp-input";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <SignUp.Root>
      <SignUp.Step name="start">
        <AuthCard
          title="Create your account"
          subtitle={<>Already have one? <AuthLink href="/sign-in">Sign in</AuthLink></>}
        >
          <Clerk.Field name="emailAddress">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">Work email</Clerk.Label>
            <Clerk.Input asChild><Input type="email" autoComplete="email" required /></Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>
          <Clerk.Field name="password">
            <Clerk.Label className="text-sm text-text-muted font-mono mb-1.5 block">Password</Clerk.Label>
            <Clerk.Input asChild><Input type="password" autoComplete="new-password" required /></Clerk.Input>
            <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
          </Clerk.Field>
          <SignUp.Action submit asChild>
            <Button className="w-full">Create account</Button>
          </SignUp.Action>
        </AuthCard>
      </SignUp.Step>

      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <AuthCard title="Verify your email" subtitle="We sent a 6-digit code">
            <Clerk.Field name="code">
              <Clerk.Input asChild>
                {/* OtpInput wired via render-prop pattern */}
                <OtpInput value="" onChange={() => {}} />
              </Clerk.Input>
              <Clerk.FieldError className="text-waste-500 text-mono-sm mt-1" />
            </Clerk.Field>
            <SignUp.Action submit asChild>
              <Button className="w-full">Verify</Button>
            </SignUp.Action>
          </AuthCard>
        </SignUp.Strategy>
      </SignUp.Step>
    </SignUp.Root>
  );
}
```

**Note on Clerk Elements + custom OTP input:** the `<Clerk.Input asChild>` slot doesn't perfectly support our OtpInput (it's a multi-input component). Two options:
- A: Drive OtpInput state locally + on each change call `Clerk.Input`'s underlying ref to set value + dispatch.
- B: Use `useSignUp()` hook directly for the verifications step instead of Elements, falling back to the lower-level Clerk React API for this one substep.

Option B is cleaner. Use Elements for the start step; use the hook for verifications. Refactor later if Clerk Elements gains better multi-input support.

- [ ] **Step 4: Smoke-test the page renders** — Storybook story OR a render test that confirms the form fields are present. Don't try to test the actual Clerk flow in unit tests (that needs e2e with Clerk test mode).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/auth/otp-input.tsx apps/web/components/auth/otp-input.test.tsx apps/web/app/(auth)/sign-up
git commit -m "d1: /sign-up page (Clerk Elements custom form) + OTP input"
```

---

### Task 3: `/sign-in` page (Clerk Elements custom form)

**Files:**
- Create: `apps/web/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

Same pattern as `/sign-up` but using `@clerk/elements/sign-in` composables.

Steps:
1. `start` — email + password
2. `verifications` — handles MFA challenge (TOTP / WebAuthn / email-code) — branch by `<SignIn.Strategy name="...">`
3. `forgot-password` — email-only, sends reset link
4. `reset-password` — new password entry

Refer to Clerk Elements docs for the exact `<SignIn.Step>` and `<SignIn.Strategy>` shapes. The OtpInput is reused for the MFA-by-email path.

Commit: `d1: /sign-in page (Clerk Elements custom form) + MFA + reset-password`

---

### Task 4: `/accept-invite/[token]` page

**Files:**
- Create: `apps/web/app/(auth)/accept-invite/[token]/page.tsx`

A two-state page:
- If user is already signed in → server-side accept invite via Clerk API, redirect to `/app/[invitedOrg]/welcome` (or `/app/[invitedOrg]` if welcome already done).
- If signed out → show "You've been invited to {org}. Sign in to accept." with a sign-in button that preserves the invite token via query param.

Use Clerk's invitation token redemption API server-side. Wrap in a Server Component for the auto-redirect path.

Commit: `d1: /accept-invite/[token] page (auto-accept if signed in)`

---

## Phase 1.D — Org flow

### Task 5: `slug-input.tsx` with live availability + reserved-slug validation

**Files:**
- Create: `apps/web/lib/auth/reserved-slugs.ts`
- Create: `apps/web/components/auth/slug-input.tsx`
- Create: `apps/web/components/auth/slug-input.test.tsx`
- Create: `apps/web/app/api/orgs/check-slug/route.ts`

- [ ] **Step 1: Reserved slugs**

```ts
// apps/web/lib/auth/reserved-slugs.ts
// From IA spec §4.2
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin", "api", "app", "blog", "changelog", "contact", "customers",
  "demo-request", "docs", "enterprise", "legal", "me", "orgs",
  "pricing", "proof", "security", "settings", "sign-in", "sign-up",
  "status", "support",
]);

export function isReservedSlug(s: string): boolean {
  return RESERVED_SLUGS.has(s.toLowerCase());
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export function isValidSlugFormat(s: string): boolean {
  return SLUG_RE.test(s);
}
```

- [ ] **Step 2: Test reserved + format**

```ts
describe("reserved-slugs", () => {
  it("flags reserved", () => { expect(isReservedSlug("admin")).toBe(true); });
  it("passes valid", () => { expect(isReservedSlug("acme")).toBe(false); });
  it("validates slug format", () => {
    expect(isValidSlugFormat("acme-prod")).toBe(true);
    expect(isValidSlugFormat("-leading")).toBe(false);
    expect(isValidSlugFormat("trailing-")).toBe(false);
    expect(isValidSlugFormat("Caps")).toBe(false);
  });
});
```

- [ ] **Step 3: API route for availability**

```ts
// apps/web/app/api/orgs/check-slug/route.ts
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isReservedSlug, isValidSlugFormat } from "@/lib/auth/reserved-slugs";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") ?? "").toLowerCase();

  if (!isValidSlugFormat(slug)) return NextResponse.json({ ok: false, reason: "format" });
  if (isReservedSlug(slug)) return NextResponse.json({ ok: false, reason: "reserved" });

  const client = await clerkClient();
  const existing = await client.organizations.getOrganizationList({ query: slug, limit: 5 });
  const taken = existing.data.some((o) => o.slug?.toLowerCase() === slug);
  if (taken) return NextResponse.json({ ok: false, reason: "taken" });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: SlugInput component**

A controlled input that:
- Debounces the value (300ms)
- Fires `GET /api/orgs/check-slug?slug=X` after debounce
- Shows inline status: 🔄 "Checking…" / ✓ "Available" / ✗ "Reserved name" / ✗ "Already taken" / ✗ "Invalid format"
- Uses the design-system `<Input>` with `aria-invalid` when not OK

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/auth/reserved-slugs.ts apps/web/components/auth/slug-input.tsx apps/web/components/auth/slug-input.test.tsx apps/web/app/api/orgs/check-slug
git commit -m "d1: SlugInput with live availability + reserved-slug list (IA §4.2)"
```

---

### Task 6: `sigil-picker.tsx`

**Files:**
- Create: `apps/web/components/auth/sigil-picker.tsx`
- Create: `apps/web/components/auth/sigil-picker.test.tsx`

7-color picker. Each option is a small square swatch (3-color palette from the design system: intel-500, savings-500, risk-500, waste-500, plus 3 accent colors). User clicks a swatch to select. The selected color becomes `org.publicMetadata.sigilColor`.

Default selection: deterministic from the org name (hash function) — clicking randomize button picks again.

Tests:
- 7 buttons rendered
- Click changes selection
- `aria-pressed` on the selected one

Commit: `d1: SigilPicker (7 colors from v2 palette) for org creation`

---

### Task 7: `(orgs)` route group + layout

**Files:**
- Create: `apps/web/app/(orgs)/layout.tsx`

Similar to `(auth)` layout but server-component-gates that the user IS signed in. Redirects to `/sign-in?return_to=/orgs` if not.

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function OrgsLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?return_to=/orgs");
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-bg-canvas px-4 py-12">
      {/* logo, then children */}
      {children}
    </main>
  );
}
```

Commit: `d1: (orgs) route group with signed-in guard`

---

### Task 8: `/orgs` page (list user's orgs)

**Files:**
- Create: `apps/web/app/(orgs)/orgs/page.tsx`

Server component. Lists user's organization memberships from Clerk. Each card shows: sigil swatch + org name + slug + member count + "Open" button → `/app/[slug]`.

If user has exactly 1 org and no pending invitations → redirect immediately to `/app/[slug]`.

If user has 0 orgs → redirect to `/orgs/create`.

If `?error=not-member` query param present → show toast at top.

Commit: `d1: /orgs page (lists orgs, redirects on exactly-1)`

---

### Task 9: `/orgs/create` page

**Files:**
- Create: `apps/web/app/(orgs)/orgs/create/page.tsx`
- Create: `apps/web/app/api/orgs/route.ts`

The form:
- Org name (text input, required)
- Slug (SlugInput, auto-filled from name as kebab-case but editable)
- Sigil color (SigilPicker, default derived from name)
- "Create org" submit button

On submit: POST `/api/orgs` with `{ name, slug, sigilColor }`. Server validates again, creates the org via Clerk, then sets the user as `org:owner`. Returns `{ orgSlug }`. Client navigates to `/app/[orgSlug]/welcome`.

```ts
// apps/web/app/api/orgs/route.ts
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isReservedSlug, isValidSlugFormat } from "@/lib/auth/reserved-slugs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const slug = String(body.slug ?? "").trim().toLowerCase();
  const sigilColor = String(body.sigilColor ?? "#6366F1");

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!isValidSlugFormat(slug)) return NextResponse.json({ error: "slug invalid format" }, { status: 400 });
  if (isReservedSlug(slug)) return NextResponse.json({ error: "slug reserved" }, { status: 400 });

  const client = await clerkClient();
  const org = await client.organizations.createOrganization({
    name, slug, createdBy: userId,
    publicMetadata: { sigilColor },
  });

  return NextResponse.json({ orgSlug: org.slug });
}
```

Page component:

```tsx
"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SlugInput } from "@/components/auth/slug-input";
import { SigilPicker } from "@/components/auth/sigil-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [sigil, setSigil] = React.useState("#6366F1");
  const [slugDirty, setSlugDirty] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // auto-derive slug from name until user edits slug manually
  React.useEffect(() => {
    if (!slugDirty) setSlug(slugify(name));
  }, [name, slugDirty]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, sigilColor: sigil }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't create org");
      setSubmitting(false);
      return;
    }
    router.push(`/app/${data.orgSlug}/welcome`);
  };

  return (
    <AuthCard title="Create your organization" subtitle="One org per company, team, or environment.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">Organization name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme, Inc." required />
        </div>
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">URL slug</label>
          <SlugInput value={slug} onChange={(v) => { setSlug(v); setSlugDirty(true); }} />
          <p className="text-text-faint text-mono-sm mt-1">stratos.dev/app/<span className="text-text-muted">{slug || "your-slug"}</span></p>
        </div>
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">Sigil color</label>
          <SigilPicker value={sigil} onChange={setSigil} />
        </div>
        {error && <div className="text-waste-500 text-mono-sm">{error}</div>}
        <Button type="submit" disabled={submitting || !name || !slug} className="w-full">
          {submitting ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </AuthCard>
  );
}
```

Commit: `d1: /orgs/create page + POST /api/orgs`

---

## Phase 1.E — Routing glue

### Task 10: Post-auth redirect logic

**Files:**
- Create: `apps/web/lib/auth/post-auth-redirect.ts`
- Modify: `apps/web/middleware.ts`

```ts
// apps/web/lib/auth/post-auth-redirect.ts
import { clerkClient } from "@clerk/nextjs/server";

export async function postAuthRedirectFor(userId: string, returnTo?: string): Promise<string> {
  if (returnTo && returnTo.startsWith("/")) return returnTo;
  const client = await clerkClient();
  const memberships = await client.users.getOrganizationMembershipList({ userId });
  const orgs = memberships.data;
  if (orgs.length === 0) return "/orgs/create";
  if (orgs.length === 1) return `/app/${orgs[0].organization.slug}`;
  return "/orgs";
}
```

Wire it via Clerk's `afterSignInUrl` / `afterSignUpUrl` props on the `<ClerkProvider>` in `apps/web/app/layout.tsx`, OR via the existing middleware that already handles `/app/[org]/*` gating.

Update the middleware so that:
- After successful sign-in or sign-up: if Clerk redirects to `/` (default), intercept and redirect to `postAuthRedirectFor(userId)`.

(Confirm exact integration point by reading the existing middleware.)

Commit: `d1: post-auth redirect to /app/[org] | /orgs | /orgs/create based on membership`

---

## Phase 1.F — Stories + final QA

### Task 11: Storybook stories for auth pages

**Files:**
- Create: `apps/web/components/auth/auth-card.stories.tsx`
- Create: `apps/web/components/auth/otp-input.stories.tsx`
- Create: `apps/web/components/auth/slug-input.stories.tsx`
- Create: `apps/web/components/auth/sigil-picker.stories.tsx`

Each story shows the component in its key states (default, hover, focused, invalid, loading). The full page-level forms are NOT in Storybook (they're tied to Clerk's hooks); they get manual smoke + e2e coverage instead.

Commit: `d1: Storybook stories for auth components`

---

### Task 12: Final D1 gauntlet + smoke

- [ ] `pnpm typecheck` PASS
- [ ] `pnpm test:run` PASS — at least 8 new tests across OTP, slug, reserved, sigil
- [ ] `pnpm storybook:build` PASS
- [ ] `pnpm build` PASS
- [ ] Manual smoke (requires Clerk test env):
  - Visit `/sign-up`, complete with `424242` code, see redirect to `/orgs/create`
  - Create org "test-co"
  - Land on `/app/test-co/welcome` (the existing shell placeholder)
  - Sign out
  - Visit `/sign-in`, sign back in, land on `/app/test-co` (single org → skip /orgs)

Commit: `d1: ships — auth + org flow gauntlet passes`

---

## Self-review

**Spec coverage check** against `docs/superpowers/specs/2026-05-25-wave-1-thinnest-journey.md` §6.1 + IA spec §8.2:

- `/sign-up` ✓ (Task 2)
- `/sign-up/verify-email` ✓ (Task 2 verifications step)
- `/sign-in` ✓ (Task 3)
- `/sign-in/mfa` ✓ (Task 3 verifications step)
- `/sign-in/reset-password` ✓ (Task 3 forgot-password / reset-password steps)
- `/accept-invite/[token]` ✓ (Task 4)
- `/orgs` ✓ (Task 8)
- `/orgs/create` ✓ (Task 9)
- Reserved-slug list ✓ (Task 5, sourced from IA §4.2)
- Post-auth redirect logic ✓ (Task 10)

**Placeholder scan:** none.

**Type consistency:** `RESERVED_SLUGS`, `isReservedSlug`, `isValidSlugFormat` exported from `lib/auth/reserved-slugs.ts` and consumed by both `slug-input.tsx` and `app/api/orgs/route.ts`. Sigil color is hex string everywhere.

**Risks tracked in master spec §9** carry forward — the Clerk-Elements-maturity risk is the most acute one. Phase 1.A Task 1 is the spike that resolves it; if `@clerk/elements` blocks us we revert to themed `<SignIn />` / `<SignUp />` (1-day rework) and continue.

---

## Execution handoff

Plan complete. Recommended: subagent-driven-development. Begin with Task 1 (the Clerk Elements spike + auth chrome).
