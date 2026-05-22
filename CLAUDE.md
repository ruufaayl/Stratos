# STRATOS — CLAUDE.md
# AI-Native Cloud Cost Intelligence — The Master Context

> This is the single source of truth for WHAT we are building and HOW we
> operate. Read this first, then ENGINE.md (the math), FOUNDATIONS.md (the
> open-source supply chain), and HARVEST.md (the build+prove protocol).

---

## 🌍 IDENTITY

**Stratos** — the intelligent layer above your cloud.
Tagline: *"Your cloud, optimized. Automatically."*

- **Global. No HQ. No country.** Someone is building real infrastructure
  right now, in the open, and it works. That's the entire brand energy.
- Built solo. No partners. No waiting for permission.
- A real working product from day one — NOT a waitlist, NOT a slideshow,
  NOT an LLM theorizing. Real code, real pipelines, real dollars.

---

## 🎯 WHAT WE ARE BUILDING

An AI-native platform that finds wasted cloud spend, quantifies it in
dollars, and recommends (eventually executes) the fix — built for engineering
teams, not accountants.

The wedge: cloud waste is a ~$230B/year global problem. 32% of all cloud
spend is wasted on idle and oversized resources. Nobody has solved it
elegantly for builders. We do.

---

## 🪜 THE STRATEGY (the order of operations that wins with $0)

1. **Prove on REAL public data first.** We run our engine against real public
   cloud telemetry (millions of real VMs — Azure/Google/Alibaba traces) and
   surface real-dollar waste in real time. This proves the product works
   WITHOUT needing an AWS account, a customer, or a dollar of funding.
2. **Launch in the open.** A live demo anyone can watch: our engine finding
   six figures of waste in real public data, live. Build-in-public. Show HN.
3. **Get recognized.** The working demo earns the audience and credibility.
4. **THEN approach AWS + real accounts + seed.** We arrive with a finished,
   proven product — not a pitch deck. We never ship an incomplete product.
   We ship a complete product that currently runs on public datasets.

---

## 🏗️ TECH STACK

### Frontend (the command center)
- Next.js 14 (App Router, RSC) + TypeScript (strict)
- Tailwind CSS + shadcn/ui + Framer Motion
- Recharts + d3-hierarchy (treemap) for visualization
- Zustand (client state) + TanStack Query (server state)
- Server-Sent Events for real-time waste streaming

### The Brain (analytics engine)
- Python: numpy, scipy, statsmodels, pandas, Prophet, PuLP
- FastAPI service (stateless), deploy on Modal (scales to zero, free tier)
- Our proprietary algorithms (see ENGINE.md)

### Reasoning layer
- Anthropic Claude API — Haiku for classification, Sonnet for explanations
- Claude NEVER computes numbers. Python owns truth; Claude owns language.

### Data + infra
- PostgreSQL (Neon, serverless, EU region option)
- Drizzle ORM, Zod validation everywhere
- Upstash Redis + BullMQ for jobs
- Clerk (auth), Resend (email), PostHog (analytics), Sentry (errors)
- Vercel (web hosting), GitHub Actions (CI)
- Stripe (activate at first revenue)

### Cloud integration (for when real users arrive)
- AWS SDK v3, read-only IAM cross-account role — NEVER write permissions
- Cost Explorer, CloudWatch, EC2/RDS/S3/EBS describe APIs, Price List API

### Harvested foundations (see FOUNDATIONS.md, all license-gated)
- OptScale (Apache-2.0) — rightsizing reference architecture
- Cloud Custodian (Apache-2.0) — remediation execution layer
- OpenCost (Apache-2.0) — Kubernetes cost (Phase 2)
- Infracost (Apache-2.0) — IaC pre-spend estimation

---

## 📐 OPERATING PRINCIPLES

- **Smart-worker, not just hard-worker.** Harvest solved primitives, sprint
  on the product. Reimplement ideas clean; never drag in monoliths.
- **Truth is sacred.** Every dollar figure must survive a customer checking
  it against their real bill. The LLM never does arithmetic.
- **License-clean always.** Auto-maintain NOTICE + PROVENANCE.md. This is
  free insurance against a diligence-killing lawsuit. Non-negotiable.
- **Real over theoretical.** We ship working pipelines, not PDFs of scores.
- **Build in public.** The build is the marketing.

---

## 📁 REPO STRUCTURE

```
stratos/
├── engine/          # Python brain — the math (ENGINE.md)
│   ├── idle.py
│   ├── rightsizing.py
│   ├── anomaly.py
│   ├── commitment.py      # the newsvendor money-maker
│   ├── forecast.py
│   └── main.py            # FastAPI service
├── apps/web/        # Next.js command center
├── integrations/    # wrappers: custodian, infracost, opencost
├── proof/           # the real-data proof harness + live demo
├── NOTICE           # auto-maintained attribution
└── PROVENANCE.md    # auto-maintained: what idea came from where
```

---

## 🎨 DESIGN LANGUAGE (full detail in START_HERE + ENGINE §8)

- Dark-first. Engineers work at night. #0A0A0F background.
- Primary indigo #6366F1 (intelligence/trust). Accent emerald #10B981
  (savings/good). Red #EF4444 (waste/bad). Amber #F59E0B (risk).
- Inter for UI, JetBrains Mono for data/code.
- Data-dense, never cluttered. Every number tells a story.
- Green = money saved. Red = money burning. A 5-year-old gets it instantly.

---

## ✅ DEFINITION OF DONE (the bar)

A stranger lands on our page, watches our engine analyze real public cloud
data and surface ~$500K of waste in real time, sees Claude explain each
finding in plain English, and thinks "I need this on my account." Self-serve,
no human in the loop, license-clean, running our own code. That is a product.
