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
- `_harvest/` location: `C:\dev\_harvest\` (sibling of `stratos/`)
- Tier 1 cloned (shallow, Apache-2.0 ✅): optscale, cloud-custodian, opencost, infracost
- Tier 3 cloned (datasets): google-cluster-data (CC-BY), AzurePublicDataset
- Tier 2 **declined** (logged in PROVENANCE.md):
  - turbot/steampipe — AGPL-3.0
  - tailwarden/komiser — Elastic License 2.0 (forbids hosted SaaS)
- NOTICE entries: 0 (no extractions yet — clones are pattern-study staging)
- PROVENANCE entries: license-gate log only (no idea extractions yet)

### Recon hit list — where the next session reads first

**OptScale recommendations engine** (Python, Apache-2.0):
`_harvest/optscale/bumiworker/bumiworker/modules/recommendations/`
| File | Maps to |
|---|---|
| `rightsizing_instances.py` | `engine/rightsizing.py` (ENGINE §3) |
| `rightsizing_rds.py` | future RDS variant |
| `reserved_instances.py` | `engine/commitment.py` validation (ENGINE §5) |
| `abandoned_instances.py`, `instances_for_shutdown.py` | `engine/idle.py` (ENGINE §2) |
| `instances_in_stopped_state_for_a_long_time.py` | zombie detection |
| `obsolete_snapshots.py`, `s3_abandoned_buckets.py` | storage waste (Phase 2+) |

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

## Still to harvest (lower priority — wire when needed)

**Tier 3 cont. — Real public traces, fetched when proof loader is wired:**

- **Alibaba cluster-trace** — `alibaba/clusterdata` (microservices stress test).
- **Bitbrains GWA-T-12** — Grid Workloads Archive (multi-metric).

The actual *data* for Azure / Google traces is **not** in the cloned repos
— those are docs + SAS URLs. The proof loader downloads the trace itself
from the URLs in `_harvest/AzurePublicDataset/data/` references.

**Tier 4 — Reference reading only (probably no clone):**
- `facebook/prophet` — already in `requirements.txt`; read source via GitHub when seasonality needs hardening.
- `statsmodels/statsmodels` — same.

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
