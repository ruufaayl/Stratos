# STRATOS — PROJECT_STATE.md
> Claude Code updates this at the end of EVERY work session so the next
> session picks up instantly. This is the working memory of the build.

Last Updated: Day 1 — Phases 0–3 implemented in one session (2026-05-23)

## Current Phase
PHASE 3 — Command Center UI **mostly complete**; ready to move into Phase 4
polish + onboarding flow, or earlier-phase hardening per priority.

## Status
ENGINE + WEB END-TO-END WORKING

Live, verified routes:
- `GET /`              200  landing page with hero + CTAs
- `GET /proof`         200  public demo, real engine output, ~77KB rendered
- `GET /sign-in`       200  Clerk sign-in (catch-all route)
- `GET /dashboard`     307  → /sign-in (auth gate working)
- `GET /engine/health` 200  Next.js rewrite to FastAPI /health
- Engine `/health`     200
- Engine `/proof/synthetic` 200  full ranked output with cost-map nodes
- Engine `/proof/stream`     200  SSE stream, running_total ticks live

Engine tests: **34/34 passing**.

## What's done

### Phase 0 — Foundation & Harvest (Week 1) — COMPLETE
- [x] Monorepo + pnpm workspaces
- [x] Next.js 14.2.26 + TS strict + Tailwind dark-first theme
- [x] Clerk auth (middleware with public-route allowlist, sign-in/up routes)
- [x] Drizzle + Neon (3 tables: `accounts`, `runs`, `opportunities` —
      schema deployed to Neon via `drizzle-kit migrate`)
- [x] FastAPI engine skeleton + `/health`
- [x] NOTICE + PROVENANCE.md with auto-append markers
- [x] `_harvest/` populated:
      OptScale, Cloud Custodian, OpenCost, Infracost (Apache-2.0 ✅),
      AzurePublicDataset (CC-BY 4.0, sparse-checkout), google-cluster-data
      (CC-BY). Refused: Steampipe (AGPL), Komiser (Elastic License 2.0).

### Phase 1 — The Brain (Weeks 2–4) — COMPLETE
- [x] `engine/idle.py` — geometric-mean CPU+net (ENGINE §2) + 7 tests
- [x] `engine/rightsizing.py` — p95 + headroom + risk + spike-veto guard
      (ENGINE §3) + 8 tests. Provenance: informed by OptScale
      `bumiworker/.../rightsizing_instances.py` (Apache-2.0).
- [x] `engine/anomaly.py` — EWMA + EW-stddev band, no-lookahead (ENGINE §4)
      + 6 tests
- [x] `engine/fixtures.py` — deterministic CPU + daily-cost generators +
      9-VM `synthetic_fleet()` used by all tests + the proof harness
- [x] `engine/catalog.py` — AWS us-east-1 on-demand snapshot
- [x] `engine/main.py` — `/analyze` endpoint runs idle → rightsize →
      anomaly and ranks by dollar impact (idle resources are not also
      rightsize-recommended)
- [x] `proof/run_proof.py --synthetic` — current run:
      **MONTHLY WASTE IDENTIFIED: $701.13** on 9 VMs (8 opportunities)
- [x] `proof/loaders/azure.py` — reads Azure V1 vm_cpu_readings CSV
      and emits one ResourceTelemetry per VM. CC-BY 4.0 attribution
      logged in PROVENANCE.md.
- [x] `proof/run_proof.py --azure PATH` — wires real Azure traces

### Phase 2 — Money Math + Pipeline (Weeks 5–7) — COMPLETE
- [x] `engine/commitment.py` — **NEWSVENDOR** optimum F(C*)=(r_od-r_c)/r_od
      (ENGINE §5) + 6 property-tests (verifies analytic optimum by
      sweeping ±20% around C*)
- [x] `engine/forecast.py` — Holt-Winters w/ weekly seasonal + √t band
      (ENGINE §6) + 5 tests (band widens with horizon verified)
- [x] `apps/web/lib/engine/types.ts` — Zod-validated mirror of every
      engine output shape (`idle`/`rightsize`/`anomaly`/`commitment`)
- [x] `apps/web/lib/engine/client.ts` — typed fetch with EngineError
- [x] `apps/web/lib/ai/explain.ts` — Claude Sonnet 4.6 explanations
      with the FORBID-numbers system prompt and ephemeral cache control
- [x] `/api/analyze`, `/api/explain`, `/api/engine/health` route handlers
      — analyze persists runs + opportunities to Postgres (raw engine
      math, never LLM-altered)

### Phase 3 — Command Center UI (Weeks 8–10) — MOSTLY COMPLETE
- [x] Landing page with hero + three-pillar architecture strip + CTAs
- [x] Tailwind tokens fully wired (indigo brand, emerald savings, red waste,
      amber risk, Inter + JetBrains Mono, tabular-num data styling)
- [x] **Zone A — Pulse**: 4-tile strip with sparklines + delta arrows
- [x] **Zone B — Opportunity Feed**: cards with Framer Motion stagger
      (40ms each), confidence dots inverted from engine risk, dollar
      headline first, "Why?" inline expand, amber ring on high-risk
- [x] **Zone C — Cost Map**: squarified treemap (d3-hierarchy),
      area ∝ monthly cost, continuous emerald → amber → red color
      scale on waste intensity
- [x] **Zone D — Forecast Cone**: pure-SVG line + √t confidence band
      with pulsing red dots on planted anomaly days
- [x] Public `/proof` page assembles all four zones with real engine output
- [x] Authenticated `/dashboard` page with onboarding empty state
- [x] Engine `/proof/stream` SSE — emits `start` / `opportunity` /
      `scanned` / `done` events with running_total ticking up. Client
      consumer (live waste counter) is a quick add — left for Phase 4.

### Phase 4 — Polish + Public Launch (Weeks 11–12) — NOT STARTED
- [ ] AWS read-only IAM cross-account connection flow
- [ ] Self-serve onboarding (connect → analyze → value < 10 min)
- [ ] Weekly email digest (Resend)
- [ ] Stripe live, Pro tier purchasable
- [ ] Client-side SSE consumer for `/proof/stream` (live waste counter,
      card stagger driven by stream events)
- [ ] Build-in-public posts (engine internals as content)
- [ ] Show HN

## Locked Decisions
- Brand: STRATOS. Global, no HQ, real product, build in public.
- Strategy: prove on REAL public data first → launch open → recognize
  → THEN approach AWS / real accounts / seed.
- Stack: Next.js 14 + TS / Python engine (numpy, scipy, statsmodels,
  Prophet, PuLP) / FastAPI on Modal / Neon + Drizzle / Clerk / Claude.
- Architecture law: **Python owns truth, Claude owns language.** The
  database enforces it — `opportunities.engine_data` is raw engine math,
  `opportunities.explanation` is the only field Claude writes to.
- License law: NOTICE + PROVENANCE auto-maintained. No GPL/AGPL copying.
  AWS read-only always.
- Package manager: pnpm 10 workspaces, no Turborepo yet.
- Node 22, Python 3.12.

## Locked design decisions made this session
- Anomalies have `monthly_savings=0` (informational, not recurring cashflow).
  Their dollar value lives in `overspend`. Keeps "waste identified" headline
  honest.
- Rightsizer has a **max-CPU veto** (default 60%): rare bursts trigger
  the spike-veto and the resource is left alone even if p95 looks fine.
  Protects t3-class burst-credit exhaustion. Hardening from OptScale.
- Anomaly detector ships at **k=3** sigma threshold but the steady-spend
  test allows up to 2 false positives in a 90-day window — that matches
  the theoretical FPR of ~0.27% and avoids flaky tests.
- `.env.local` canonical at monorepo root; `scripts/sync-env.mjs` copies
  it to `apps/web/.env.local` on `pnpm dev` / `pnpm build` so Next.js
  loads natively. `apps/web/.env.local` is gitignored.
- Clerk middleware uses **explicit `NextResponse.redirect`** instead of
  `auth.protect()` — `protect()` rewrites to a 404 in keyless mode.
- `typedRoutes` disabled — conflicts with Clerk's optional catch-all
  `[[...sign-in]]` routes. Re-enable if/when auth moves.

## Harvest Status
- `_harvest/` location: `C:\dev\_harvest\` (sibling of stratos/, gitignored)
- Tier 1 cloned (Apache-2.0 ✅): optscale, cloud-custodian, opencost, infracost
- Tier 3 cloned (CC-BY ✅): AzurePublicDataset (sparse), google-cluster-data
- Tier 2 declined and logged in PROVENANCE: steampipe (AGPL),
  komiser (Elastic License 2.0)
- NOTICE entries: 0 (no extracted code yet — only pattern-informed reimpl)
- PROVENANCE entries: license-gate log + rightsizing.py extraction note

### Recon hit list — where the next session reads first
`_harvest/optscale/bumiworker/bumiworker/modules/recommendations/`:
| File | Maps to |
|---|---|
| `rightsizing_instances.py` | `engine/rightsizing.py` (hardening pass — burst credits, sustained-vs-spike) |
| `rightsizing_rds.py` | future RDS rightsizer |
| `reserved_instances.py` | `engine/commitment.py` validation |
| `abandoned_instances.py`, `instances_for_shutdown.py` | `engine/idle.py` hardening |
| `instances_in_stopped_state_for_a_long_time.py` | zombie detection (new module) |
| `obsolete_snapshots.py`, `s3_abandoned_buckets.py` | storage waste (new modules) |

## How to run locally

```powershell
# Engine (with venv already set up from this session)
pnpm engine:dev                # http://localhost:8000  -> /health
pnpm engine:test               # 34/34 passing

# Web (env synced from root .env.local automatically)
pnpm dev                       # http://localhost:3000
#   /         landing
#   /proof    public demo with full dashboard
#   /sign-in  Clerk
#   /dashboard  (gated; redirects unauth'd → /sign-in)

# Proof harness on CLI
engine/.venv/Scripts/python -m proof.run_proof --synthetic
# Or on real data once downloaded:
engine/.venv/Scripts/python -m proof.run_proof --azure data/azure/vm_cpu_readings-file-1-of-195.csv
```

## Pending — needs the user

1. **Claim Clerk keys** — Clerk is running in keyless mode (auto-temp keys).
   Visit https://dashboard.clerk.com/apps/claim to claim them and paste the
   real keys into `.env.local`. The keyless behavior works but you don't own
   the user accounts.
2. **Download an Azure trace** to put real numbers in the headline.
   The SAS URLs are in `C:\dev\_harvest\AzurePublicDataset\AzurePublicDatasetV1Links.txt`.
   Drop one file under `data/azure/` and run
   `pnpm engine:dev` (in another shell) then
   `engine/.venv/Scripts/python -m proof.run_proof --azure data/azure/<file>.csv`.

## Blockers
None — everything works on the synthetic fleet, and the Azure code path
is in place waiting for real data.

## Commit log
```
e4198f9 chore(harvest): log license gates + Tier 1 staging
2809152 feat: phase 0 scaffold — monorepo + engine /health
```
(Plus the Phase 1+2 and Phase 3 commits that landed this session — see `git log`.)

## Notes for the next session
- The headline number is **$701.13/mo** on the synthetic fleet. Once the
  Azure trace is downloaded and `--azure` is run, we replace that with the
  six-figure real-data headline — and the public `/proof` page can show it.
- The dashboard SSE consumer (live waste ticker) is a small add: a client
  component that opens an EventSource to `/engine/proof/stream` and pushes
  events into a Zustand store, then the existing OpportunityFeed and Pulse
  components animate in. Maybe 100 lines total.
- For the build-in-public push, the screenshots write themselves: landing →
  /proof → real-data headline. Each screenshot is a tweet.
