<div align="center">

# Stratos

**The intelligent layer above your cloud.**
Find wasted cloud spend, in dollars, in real time. Automatically.

</div>

---

## The problem

Enterprises burn **$230 billion every year** on cloud waste.

**32% of all cloud spend** is wasted — idle instances running at 2% CPU, over-provisioned databases, abandoned volumes, miscommitted reserved capacity, anomalous spikes nobody caught until the invoice arrived.

The existing tools are dashboards built for accountants. They show you charts of where your money went. They don't tell you what's broken, what to fix, or what it's worth. They don't speak the language engineers actually use to make decisions.

Cloud waste isn't a finance problem. It's an engineering problem — pretending to be a finance problem.

## What Stratos is

An analytics platform that reads your cloud telemetry, runs a battery of statistical algorithms across every resource, surfaces dollar-quantified findings, and explains each one in plain English.

It is built for the engineers who own the cloud bill — CTOs, VP Engs, platform leads — not for finance teams writing quarterly reports.

Three things make it different:

1. **The math is real, not vibes.** Five statistical engines — idle detection via geometric-mean utilization, rightsizing via p95-headroom, anomaly detection via EWMA bands, commitment optimization via the newsvendor model, forecasting via Holt-Winters with √t confidence cones — produce every number. The reasoning layer writes the prose. It never computes a dollar.

2. **Every finding traces to a deterministic calculation you can audit.** No black boxes. Click any number to see the algorithm, the inputs, the math. If a $7,097/month idle-EC2 finding is wrong, you can prove it from the trace.

3. **Read-only forever.** Stratos assumes a cross-account IAM role with `Describe*` and `GetMetric*` permissions. It never has write access to your infrastructure. The fix recommendations are yours to apply, on your terms.

## Mission

Make cloud cost optimization a solved problem for engineering teams.

Not a quarterly meeting. Not a procurement project. Not a vendor pitch.
A continuous, automatic, mathematically defensible loop that closes the gap between *"we should fix that"* and *"it's fixed."*

## How this saves you thousands

Self-host the repo, connect your AWS account, and the engine runs across your real telemetry. Typical first-scan findings on a mid-size account (50–500 EC2 instances):

| What we find | How often | Typical monthly savings |
|---|---|---|
| EC2 instances at <5% sustained CPU for 14+ days | 1 in 8 instances | $80 – $400 per instance |
| EBS volumes detached or unused for 30+ days | 12% of volumes | $0.10/GB/month — adds up to thousands |
| Over-provisioned RDS instances with idle CPU + memory | 1 in 5 databases | $200 – $2,000 per database |
| Reserved-instance / Savings-Plan gaps via newsvendor optimum | every account | 15 – 35% of on-demand spend |
| Cost anomalies caught the same day (vs. invoice date) | weekly | varies — sometimes a runaway service in the thousands per day |
| Forecast drift outside the √t confidence cone | monthly | catches budget overruns 2 – 3 weeks earlier |

**Real example** from the public proof harness (Azure VM trace, ~5,000 instances): the engine surfaces $7.09M/year in identifiable waste, every dollar traceable to a specific instance ID and a specific algorithm output.

A typical $50K/month AWS account has $10–15K/month in waste sitting on the table. The math is public, the algorithms are auditable, and self-hosting costs you nothing but compute.

You can be running it in under ten minutes.

## How to use it — 5 steps

```bash
# 1. Clone and install
git clone https://github.com/ruufaayl/Stratos.git stratos
cd stratos
pnpm install
pnpm engine:install
```

```bash
# 2. Configure
cp .env.example .env.local
# fill in: DATABASE_URL (Neon), CLERK_*, ANTHROPIC_API_KEY
# the engine runs locally and needs no extra env
```

```bash
# 3. Boot
pnpm dev                 # web → http://localhost:3000
pnpm engine:dev          # engine → http://localhost:8000/health
```

```bash
# 4. Connect AWS (read-only)
# In the web app, click "Connect AWS" → launches a CloudFormation
# template that creates a read-only IAM role in your account.
# Permissions: Describe* + GetMetric* + Cost Explorer Read.
# No write scope. Ever.
```

```bash
# 5. Watch the first scan
# The engine streams findings via SSE as it analyzes your resources.
# Each finding shows: $-quantified savings, the algorithm used,
# the evidence, the plain-English reasoning, and the exact resource.
# Acknowledge, snooze, or apply — your call.
```

That's it. From clone to first dollar-quantified finding in under ten minutes.

## How it works

```
┌─────────────────┐       ┌──────────────────┐       ┌────────────────┐
│  AWS / Azure /  │       │  Stratos engine  │       │   Dashboard    │
│  GCP telemetry  │ ────► │  Python, FastAPI │ ────► │   Next.js,     │
│  CloudWatch +   │       │  numpy + scipy   │       │   real-time    │
│  Cost Explorer  │       │                  │       │   SSE stream   │
└─────────────────┘       └──────────────────┘       └────────────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │   Reasoning      │
                          │   layer          │
                          │   (explanation   │
                          │    only)         │
                          └──────────────────┘
```

The engine ships five algorithms today:

| Algorithm | What it finds | Math |
|---|---|---|
| **Idle detection** | Resources doing nothing | Geometric-mean utilization over 14d, low-bound threshold per resource class |
| **Rightsizing** | Over-provisioned compute and storage | p95 headroom analysis against a sized catalog |
| **Anomaly detection** | Cost spikes outside normal bands | Exponentially-weighted moving average with adaptive variance bands |
| **Commitment optimization** | Reserved-instance and Savings-Plan gaps | Newsvendor model from operations research, demand-side fit |
| **Forecasting** | Where this month's bill is heading | Holt-Winters with √t-scaled confidence cones |

## Features

**Available today**

- Real-time pulse dashboard — top-of-funnel waste signal, anomaly feed, hierarchical cost map, forecast cone
- AWS connection wizard — one-click CloudFormation or manual IAM setup, validated via STS assume-role
- Multi-tenant: many organizations per user, role-based access (owner / admin / member)
- Custom authentication, MFA, SSO-ready
- Public proof harness — the engine runs against real public-cloud traces (Azure, Google, Alibaba VM datasets) so you can verify the math before connecting your own account
- Full dark-themed design system, WCAG AA, reduced-motion compliant
- Server-Sent Events streaming for live scan progress
- App shell with two-rail navigation, ⌘K command bar, organization switcher, cloud switcher, full keyboard shortcuts

**Shipping next**

- Real per-account scan pipeline — CloudWatch fetcher → engine → findings DB
- Per-finding evidence / math / reasoning tabs with bidirectional resource cross-link
- Findings inbox: acknowledge, snooze, archive
- Azure and GCP support
- Slack, Jira, PagerDuty integrations
- Kubernetes cost (via OpenCost) and IaC pre-spend estimation (via Infracost)

## Tech stack

**Frontend**
Next.js 14 (App Router, RSC), TypeScript strict, Tailwind with semantic design tokens, Radix UI primitives, Framer Motion, Recharts + d3-hierarchy for treemaps, TanStack Query for server state, Zustand for client state, Storybook 8 with accessibility addon.

**Engine**
Python 3.12, FastAPI, numpy, scipy, statsmodels, pandas, Prophet, PuLP. Stateless. Deploys to Modal or any container runtime.

**Data and infrastructure**
PostgreSQL on Neon serverless, Drizzle ORM, Zod validation throughout. Clerk for authentication and organizations. Stripe for billing. Vercel for web hosting. AWS SDK v3 with cross-account read-only IAM. PostHog for product analytics. Sentry for error tracking.

**Testing**
Vitest + Testing Library + jsdom for components. pytest for the engine. Playwright for end-to-end critical paths. Storybook visual regression. Every merge passes a strict CI gauntlet: typecheck, unit tests, Storybook build, production build — four green checks before anything lands.

## Status

Building in the open.

| Component | Status |
|---|---|
| Engine — all five algorithms, FastAPI service, tested | ✅ Shipped |
| Public proof harness — live demo on real public-cloud datasets | ✅ Shipped |
| Design system v2 — 10 primitives, semantic tokens, motion library, Storybook | ✅ Shipped |
| App shell — two-rail navigation, ⌘K command bar, providers, route gating | ✅ Shipped |
| Authentication + organization flow — custom forms, MFA, invitations, reserved-slug validation | ✅ Shipped |
| Connect-AWS wizard + first real scan against user accounts | 🚧 In progress |
| Real findings overview with bidirectional resource cross-link | 📋 Planned |
| Azure + GCP + integrations (Slack, Jira, PagerDuty) | 📋 Planned |

Roadmap is ship-gated by sub-project. Every sub-project produces working, testable software on its own. No PRD-ware. No slideware.

## Project structure

```
stratos/
├── apps/web/                    Next.js command center
│   ├── app/                     App Router routes
│   ├── components/
│   │   ├── ui/                  Design system primitives (10 components)
│   │   ├── shell/               App shell (rail, topbar, ⌘K, providers)
│   │   ├── auth/                Custom form components
│   │   ├── dashboard/           Pulse, Feed, Cost Map, Forecast
│   │   └── onboarding/          Connect-AWS wizard
│   ├── lib/
│   │   ├── design/              Token + motion library
│   │   ├── shell/               App-shell providers + registries
│   │   └── auth/                Auth helpers, reserved-slug list
│   └── db/                      Drizzle schema
├── engine/                      Python analytics engine
│   ├── idle.py
│   ├── rightsizing.py
│   ├── anomaly.py
│   ├── commitment.py
│   ├── forecast.py
│   └── main.py                  FastAPI service
├── integrations/                Wrappers for Cloud Custodian, Infracost, OpenCost
├── proof/                       Real-data proof harness
└── docs/                        Specs, plans, research
```

## Architecture principles

1. **The math owns truth. The reasoning layer owns language.** Every dollar figure traces to a deterministic calculation. The language layer never does arithmetic.
2. **License-clean always.** All harvested code is Apache-2.0 or compatible. Attribution maintained in `NOTICE` and `PROVENANCE.md`.
3. **Read-only by design.** Cross-account IAM roles have `Describe*` and `Get*` only. Never `Create`. Never `Update`. Never `Delete`.
4. **Ship working software, not specs.** Every commit is buildable, every commit is testable. The roadmap is git history.
5. **Build in public.** This repository is the marketing.

## License

The Stratos source is being prepared for publication under the Business Source License 1.1 with a change date converting to Apache 2.0 after three years.

You can read it, fork it, run it for yourself, and contribute back. You cannot offer a commercial managed Stratos service during the BSL window. After the change date, it becomes fully open source.

## Contact

This is an early-stage product. If you run cloud infrastructure at meaningful scale and want to talk, open an issue or reach out directly.

---

<div align="center"><sub><b>Stratos.</b> Your cloud, optimized. Automatically.</sub></div>
