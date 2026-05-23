# STRATOS — PROJECT_STATE.md
> Claude Code updates this at the end of EVERY work session so the next
> session picks up instantly. This is the working memory of the build.

Last Updated: Day 2 — Phase 4 core built (2026-05-23)

## Current Phase
PHASE 4 — Polish + Public Launch — **CORE COMPLETE**; pending live keys + Vercel deploy.

## Status
ENGINE + WEB END-TO-END WORKING — Phase 4 features built and typechecked.

Live, verified routes:
- `GET /`              200  landing page + Clerk auth controls (SignedIn/SignedOut/UserButton)
- `GET /proof`         200  public demo with live SSE ticker (LiveScanTicker)
- `GET /pricing`       200  two-tier pricing page (Free / Pro $199/mo)
- `GET /sign-in`       200  Clerk sign-in
- `GET /sign-up`       200  Clerk sign-up
- `GET /dashboard`     307  → /sign-in (auth gate working); "Connect AWS" → /onboarding
- `GET /onboarding`    auth-gated — 4-step IAM wizard (name, CFn/manual, ARN, done)
- `GET /engine/health` 200  Next.js rewrite to FastAPI /health
- Engine `/health`     200
- Engine `/proof/synthetic` 200  full ranked output with cost-map nodes
- Engine `/proof/stream`     200  SSE stream, running_total ticks live

Engine tests: **34/34 passing**.

## What's done

### Phase 0 — Foundation & Harvest (Week 1) — COMPLETE
- [x] Monorepo + pnpm workspaces
- [x] Next.js 14.2.26 + TS strict + Tailwind dark-first theme
- [x] Clerk auth (middleware with public-route allowlist, sign-in/up routes,
      `/__clerk/(.*)` matcher for dev-browser sync)
- [x] Drizzle + Neon (3 tables: `accounts`, `runs`, `opportunities` —
      schema deployed to Neon via `drizzle-kit migrate`)
- [x] FastAPI engine skeleton + `/health`
- [x] NOTICE + PROVENANCE.md with auto-append markers
- [x] `_harvest/` populated

### Phase 1 — The Brain (Weeks 2–4) — COMPLETE
- [x] `engine/idle.py` — geometric-mean CPU+net + 7 tests
- [x] `engine/rightsizing.py` — p95 + headroom + risk + spike-veto guard + 8 tests
- [x] `engine/anomaly.py` — EWMA + EW-stddev band, no-lookahead + 6 tests
- [x] `engine/fixtures.py` — deterministic generators + 9-VM `synthetic_fleet()`
- [x] `engine/catalog.py` — AWS us-east-1 on-demand snapshot
- [x] `engine/main.py` — `/analyze` endpoint
- [x] `proof/run_proof.py --synthetic` — **MONTHLY WASTE IDENTIFIED: $701.13** on 9 VMs
- [x] `proof/loaders/azure.py` — reads Azure V1 vm_cpu_readings CSV

### Phase 2 — Money Math + Pipeline (Weeks 5–7) — COMPLETE
- [x] `engine/commitment.py` — Newsvendor optimum + 6 property-tests
- [x] `engine/forecast.py` — Holt-Winters + √t band + 5 tests
- [x] `apps/web/lib/engine/types.ts` — Zod-validated engine output shapes
- [x] `apps/web/lib/engine/client.ts` — typed fetch + EngineError
- [x] `apps/web/lib/ai/explain.ts` — Claude Sonnet 4.6 with FORBID-numbers prompt
- [x] `/api/analyze`, `/api/explain`, `/api/engine/health` route handlers

### Phase 3 — Command Center UI (Weeks 8–10) — COMPLETE
- [x] Landing page with hero + three-pillar architecture strip + CTAs
- [x] Tailwind design tokens fully wired
- [x] **Zone A — Pulse**: 4-tile strip with sparklines + delta arrows
- [x] **Zone B — Opportunity Feed**: staggered Framer Motion cards
- [x] **Zone C — Cost Map**: squarified treemap (d3-hierarchy)
- [x] **Zone D — Forecast Cone**: pure-SVG line + √t band + anomaly dots
- [x] Public `/proof` page with all four zones + `LiveScanTicker` SSE consumer
- [x] Authenticated `/dashboard` with onboarding → `/onboarding` CTA
- [x] Engine `/proof/stream` SSE + `LiveScanTicker` client component

### Phase 4 — Polish + Public Launch (Weeks 11–12) — CORE COMPLETE
- [x] **Clerk auth controls** — SignedIn/SignedOut/UserButton across all pages
- [x] **Live SSE consumer** — `LiveScanTicker` animates waste counter on /proof
- [x] **Stripe Pro tier** ($199/mo):
      - `lib/stripe.ts` — singleton + PLANS constant
      - `POST /api/stripe/checkout` — Checkout Session with clerk_user_id
      - `POST /api/stripe/webhook` — upgrade/downgrade on subscription events
      - `/pricing` page with two-column layout + `CheckoutButton` client component
      - DB migration: `accounts.tier` + `accounts.stripe_customer_id` → applied to Neon
- [x] **Resend weekly email digest**:
      - `lib/email/digest.ts` — HTML + text templates (no extra deps)
      - `POST /api/digest` — send digest for a single user
      - `GET /api/digest/cron` — weekly fan-out to all Pro users
      - `vercel.json` — cron every Monday 09:00 UTC
- [x] **AWS IAM onboarding flow** (read-only, cross-account):
      - `lib/aws/connect.ts` — validateAwsRole (AssumeRole + EC2 smoke test)
        + generateExternalId (confused-deputy prevention)
      - `POST /api/accounts` — validate role before persisting; `GET /api/accounts`
      - `/onboarding` page + `ConnectWizard` 4-step component
        (name → CloudFormation one-click or manual IAM instructions → ARN entry → done)
- [ ] Deploy to Vercel (needs STRIPE_*, RESEND_API_KEY, CLERK keys, CRON_SECRET)
- [ ] Stripe live mode (test mode now)
- [ ] CloudFormation template upload to `stratos-cfn` S3 bucket
- [ ] Build-in-public posts (engine internals as content)
- [ ] Show HN

## Locked Decisions
- Brand: STRATOS. Global, no HQ, real product, build in public.
- Strategy: prove on REAL public data first → launch open → Show HN → AWS.
- Stack: Next.js 14 + TS / Python engine / FastAPI / Neon + Drizzle / Clerk /
  Claude / Stripe / Resend.
- Architecture law: **Python owns truth, Claude owns language.**
  The DB enforces it — `opportunities.engine_data` is raw engine math,
  `opportunities.explanation` is the only field Claude writes to.
- License law: NOTICE + PROVENANCE auto-maintained. No GPL/AGPL.
- AWS read-only IAM always. `validateAwsRole` never issues writes.
- Package manager: pnpm 10 workspaces. Node 22, Python 3.12.
- Stripe webhook is the ONLY source of tier truth — never the checkout redirect.
- Drizzle config: fixed to use node:fs env loader (avoids @next/env CJS interop).

## Pending — needs the user

1. **Claim Clerk keys** — visit `https://dashboard.clerk.com/apps/claim` and
   paste real keys into `.env.local`.
2. **Set Stripe keys** in `.env.local`:
   `STRIPE_SECRET_KEY=sk_test_...` + `STRIPE_WEBHOOK_SECRET=whsec_...`
   + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` + `STRIPE_PRO_PRICE_ID=price_...`
   Create the product in Stripe dashboard: "$199/month, Stratos Pro".
3. **Set RESEND_API_KEY** in `.env.local` (get from resend.com).
4. **Deploy to Vercel** — `vercel --prod` from `apps/web/`, or connect the
   GitHub repo in Vercel dashboard. Set all env vars in Vercel project settings.
5. **Upload CloudFormation template** for one-click IAM role creation:
   Create `stratos-cfn` S3 bucket, upload `stratos-readonly-role.json` (template TBD).
6. **Azure trace** for real headline — SAS URLs at
   `C:\dev\_harvest\AzurePublicDataset\AzurePublicDatasetV1Links.txt`.

## Blockers
None — all code paths typecheck clean, 34/34 engine tests pass.
Stripe/Resend/AWS validation degrade gracefully (503/disabled) when keys absent.

## How to run locally

```powershell
# Engine
pnpm engine:dev                # http://localhost:8000  -> /health
pnpm engine:test               # 34/34 passing

# Web
pnpm dev                       # http://localhost:3000
#   /           landing + auth nav
#   /proof      demo + live SSE ticker
#   /pricing    Stripe checkout (disabled without STRIPE_SECRET_KEY)
#   /sign-in    Clerk
#   /dashboard  gated; "Connect AWS" → /onboarding
#   /onboarding 4-step AWS IAM wizard

# Proof harness CLI
engine/.venv/Scripts/python -m proof.run_proof --synthetic
```

## Commit log
```
e52d124 feat: Phase 4 -- Stripe Pro, Resend digest, AWS IAM onboarding, live SSE ticker
(prior: Phase 0–3 in a single session)
```

## Notes for next session
- **CloudFormation template**: need to write `stratos-readonly-role.json` with
  parameters `ExternalId` + `StratosPrincipal` and create the IAM role + policy.
  Upload to S3 so the wizard's one-click link works.
- **Vercel deploy**: `NEXT_PUBLIC_APP_URL` needs to be set so digest emails
  link to the real domain (default: `https://stratoscloud.io`).
- **`STRATOS_AWS_PRINCIPAL`** env var: set this to the Stratos AWS account's
  ARN (the one the cross-account role will trust) before production launch.
- **Show HN checklist**: landing → /proof → real Azure headline → pricing →
  onboarding flow demo. Screenshot each step, write the HN post.
- **Engine hardening pass** (optional before launch): read OptScale
  `bumiworker/.../instances_in_stopped_state_for_a_long_time.py` → zombie module.
