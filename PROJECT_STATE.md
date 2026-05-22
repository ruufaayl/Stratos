# STRATOS — PROJECT_STATE.md
> Claude Code updates this at the end of EVERY work session so the next
> session picks up instantly. This is the working memory of the build.

Last Updated: Day 1 — Phase 0 scaffold complete (2026-05-23)

## Current Phase
PHASE 0 — Foundation & Harvest (Week 1)

## Status
SCAFFOLD COMPLETE — awaiting harvest input

## Next Task
Drop the first batch of repos into `../_harvest/` (sibling of `stratos/`, per
HARVEST.md). See "What to put in _harvest/ first" below for the priority list.
Then Claude Code runs the Harvest Protocol on each.

## Completed (this session)
- [x] git initialized (`main` branch)
- [x] Monorepo root: pnpm workspaces, root `package.json`, `.gitignore`,
      `.editorconfig`, `.nvmrc` (node 22), `.env.example`, `README.md`
- [x] Next.js 14 web app at `apps/web/`:
      - TypeScript strict, App Router, RSC
      - Tailwind 3.4 with Stratos dark-first design tokens (CLAUDE.md palette)
      - Inter + JetBrains Mono fonts, tabular-num data styling
      - shadcn/ui-ready (`components.json`, `lib/utils.ts` with `cn` + `usd`)
      - Landing page placeholder + engine `/health` link via Next rewrite
- [x] Auth: Clerk wired
      - `middleware.ts` with public-routes matcher (`/`, `/proof/*`,
        `/sign-in`, `/sign-up`, `/engine/health`)
      - `app/sign-in/[[...sign-in]]` + `app/sign-up/[[...sign-up]]` routes
- [x] Database: Drizzle + Neon
      - `lib/db/schema.ts`: `accounts`, `runs`, `opportunities` tables
        — opportunities store RAW engine math + separate `explanation` field
        for Claude reasoning (architecture law: Python owns truth)
      - `lib/db/index.ts`: Neon HTTP driver wired to Drizzle
      - `drizzle.config.ts` for migrations
      - `lib/env.ts`: zod-validated, typed env access
- [x] Python engine at `engine/`:
      - FastAPI service skeleton: `engine/main.py` with `/health` + `/`
      - `requirements.txt` (FastAPI, uvicorn, pydantic, numpy, scipy,
        statsmodels, pandas, pytest, httpx, ruff)
      - Empty algorithm modules with docstrings pointing at ENGINE.md
        sections: `idle.py`, `rightsizing.py`, `anomaly.py`,
        `commitment.py`, `forecast.py`
      - `models.py`: `ResourceTelemetry` dataclass (the atomic unit)
      - `tests/test_health.py`: smoke test for the skeleton
      - `pyproject.toml` (pytest + ruff config)
- [x] `NOTICE` (empty Apache-style template)
- [x] `PROVENANCE.md` (with auto-append markers + entry template for
      the Harvest Protocol)
- [x] `integrations/` + `proof/` directories with READMEs explaining intent

## Locked Decisions
- Brand: STRATOS. Global, no HQ, real product, build in public.
- Strategy: prove on REAL public data first → launch open → get recognized
  → THEN approach AWS / real accounts / seed.
- Stack: Next.js 14 + TS / Python engine (numpy, scipy, statsmodels, Prophet,
  PuLP) / FastAPI on Modal / Neon + Drizzle / Clerk / Anthropic Claude.
- Architecture law: Python owns truth, Claude owns language. LLM never
  computes a dollar figure.
- License law: auto-maintain NOTICE + PROVENANCE. Reimplement ideas, never
  copy GPL/AGPL. AWS read-only always.
- Package manager: pnpm 10.32.1 workspaces (no Turborepo yet — add when needed)
- Node 22, Python 3.12.

## Harvest Status
- _harvest/ repos cloned: NONE YET — see priority list below
- NOTICE entries: 0
- PROVENANCE entries: 0

## Engine Status
- Skeleton: ✅ FastAPI app, `/health` route, smoke test
- idle.py: stub (Phase 1, week 2)
- rightsizing.py: stub (Phase 1, week 2)
- anomaly.py: stub (Phase 1, week 3)
- commitment.py: stub (Phase 2, week 5)
- forecast.py: stub (Phase 2, week 5)
- proof/run_proof.py: not started (Phase 1, week 3)

## UI Status
- Shell: ✅ landing page + Clerk auth pages
- Dashboard zones (Pulse, Feed, Cost Map, Forecast): not started (Phase 3)

## Blockers
- None. Waiting on user to populate `_harvest/`.

## What to put in `_harvest/` first (priority order)

These are the highest-value targets. Drop each into `../_harvest/<repo>/`
as a sibling of `stratos/`. See HARVEST.md for the protocol Claude Code
then runs on each.

**Tier 1 — Day 1 (highest impact, all Apache-2.0)**

1. **`hystax/optscale`** — full FinOps platform, the biggest unlock.
   Reference rightsizing edge cases + RI/SP optimizer for validation.
   ```
   git clone https://github.com/hystax/optscale ../_harvest/optscale
   ```

2. **`cloud-custodian/cloud-custodian`** — CNCF, multi-cloud remediation
   engine. We'll wrap it (Pattern B) for the action layer.
   ```
   git clone https://github.com/cloud-custodian/cloud-custodian \
     ../_harvest/cloud-custodian
   ```

3. **`opencost/opencost`** — CNCF Kubernetes cost allocation. The
   reference for K8s cost attribution when we add it.
   ```
   git clone https://github.com/opencost/opencost ../_harvest/opencost
   ```

4. **`infracost/infracost`** — Terraform pre-spend estimation. Wrap as
   CLI (Pattern B) for the shift-left feature.
   ```
   git clone https://github.com/infracost/infracost ../_harvest/infracost
   ```

**Tier 2 — Day 2 (verify license first per FOUNDATIONS §1)**

5. **`turbot/steampipe`** — query cloud as SQL. **VERIFY LICENSE FIRST**
   — the core has been AGPL-flavored. If AGPL, shell out only.
   ```
   git clone https://github.com/turbot/steampipe ../_harvest/steampipe
   ```

6. **`tailwarden/komiser`** — inventory dashboard. **VERIFY LICENSE FIRST**.
   ```
   git clone https://github.com/tailwarden/komiser ../_harvest/komiser
   ```

**Tier 3 — Real public traces (PROOF data, not code repos)**

These are datasets, not source. Each requires attribution that will be
auto-logged in `NOTICE` when the loader is wired.

7. **Azure Public Dataset** (PRIMARY proof — 2.6M VMs, 5-min CPU).
   ```
   git clone https://github.com/Azure/AzurePublicDataset \
     ../_harvest/AzurePublicDataset
   ```
   Then download a sample trace per their README.

8. **Google cluster-data** (CC-BY).
   ```
   git clone https://github.com/google/cluster-data \
     ../_harvest/cluster-data
   ```

9. **Alibaba cluster-trace** (microservices stress test).
10. **Bitbrains GWA-T-12** (multi-metric).

**Tier 4 — Math library reference reading (not vendored — just patterns)**

11. `facebook/prophet` — read for seasonality handling patterns.
12. `statsmodels/statsmodels` — already in our `requirements.txt`; clone
    optional for source spelunking.

## Notes for the next session
- First milestone is the real-data waste number from `proof/run_proof.py`.
  Everything in Phase 0–1 serves that. Build the brain before the beauty.
- After `_harvest/` is populated, run: "For each repo in `_harvest/`, run
  the Harvest Protocol from HARVEST.md. License-gate first."
- Engine venv setup: `pnpm engine:install` (creates `engine/.venv` and
  installs `requirements.txt`).
- To run: `pnpm dev` (web) + `pnpm engine:dev` (engine, in another terminal).
- DB migrations: set `DATABASE_URL` first, then `pnpm db:generate` →
  `pnpm db:push`.
