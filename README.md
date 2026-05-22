# STRATOS

> The intelligent layer above your cloud. AI-native cloud cost intelligence.
> *Built solo, in the open, with no funding. Real product from day one.*

Read the briefing docs in order:

1. **[START_HERE.md](./START_HERE.md)** — the master plan
2. **[CLAUDE.md](./CLAUDE.md)** — what we build, the stack, the bar
3. **[ENGINE.md](./ENGINE.md)** — the math, the five algorithms
4. **[FOUNDATIONS.md](./FOUNDATIONS.md)** — the open-source supply chain
5. **[HARVEST.md](./HARVEST.md)** — harvest-and-prove protocol

Working memory: **[PROJECT_STATE.md](./PROJECT_STATE.md)** — updated every session.

---

## Quick start

```bash
# Web app (Next.js 14, App Router)
pnpm install
pnpm dev                  # http://localhost:3000

# Engine (Python 3.12, FastAPI)
pnpm engine:install       # creates engine/.venv and installs deps
pnpm engine:dev           # http://localhost:8000  →  /health
```

## Repo layout

```
stratos/
├── apps/web/           Next.js command center (UI)
├── engine/             Python brain — the math (ENGINE.md)
├── integrations/       Wrappers: Custodian, Infracost, OpenCost
├── proof/              Real-data proof harness (the public demo)
├── NOTICE              Auto-maintained attribution (Apache-2.0 etc.)
└── PROVENANCE.md       Auto-maintained: idea X came from repo Y
```

## Laws (non-negotiable)

1. **Python owns truth. Claude owns language.** The LLM never computes a dollar.
2. **License-clean always.** NOTICE + PROVENANCE auto-maintained. No GPL/AGPL copying.
3. **Build the brain before the beauty.** Engine + proof harness first.
4. **AWS read-only forever.** No write IAM scope.
5. **Real over theoretical.** Ship working pipelines, not PDFs.
