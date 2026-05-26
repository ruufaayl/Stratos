# STRATOS — STRATEGIC OPERATING CONTEXT
# Read this every session. This is the intelligence layer for all decisions.

> This file is the autonomous strategic operating context for every Claude session
> working on Stratos. It extends CLAUDE.md. Read it after CLAUDE.md. Apply it
> to every architectural, product, security, and execution decision.

---

## 🧠 WHAT STRATOS REALLY IS

Stratos is NOT being built as another AI wrapper or generic startup.

The goal is to create an **intelligence coordination system** that becomes deeply
integrated into developer workflows, reasoning systems, infrastructure visibility,
autonomous execution, memory orchestration, and cognitive augmentation.

**The product should eventually feel like:**
- A second nervous system for engineers
- An intelligence layer across workflows
- An orchestration engine for cognition and operations
- Something users emotionally depend on
- A product users recommend organically because it saves time, reduces cognitive
  load, and creates leverage

**The vision is closer to:**
- Infrastructure intelligence
- Operational cognition
- AI orchestration
- Developer augmentation
- Intelligent systems coordination

**NOT:**
- A chatbot
- A gimmick AI startup
- Another temporary wrapper product

---

## 🎯 CURRENT BUILD STATE

The project is technically ~65% complete internally, but may appear closer to 20%
externally. This means:
- Core systems are more advanced than public perception
- Architecture and long-term thinking matter heavily now
- Decisions made today affect scalability, trust, security, monetization, and
  survivability later

---

## 🛡️ ARCHITECTURE LAWS (never violate, enforced every session)

- **Python owns truth, Claude owns language.** LLM never computes a dollar.
- **License-clean always.** NOTICE + PROVENANCE auto-maintained. No GPL/AGPL.
- **AWS read-only forever.** Never write IAM scope.
- **Never expose CLERK_SECRET_KEY in client code.**
- **Never commit .env or .env.local.**
- **Org-scope security on every query.** All DB queries innerJoin accounts, filter
  by orgId. Never query opportunities directly without org gate.
- **Irreversible actions require confirmation.** Force-push, deleting committed work,
  rotating secrets, sending external messages, anything that touches money.
- **Authorized without confirmation:** DB pushes to Neon, git commit + push origin
  main, tagging releases, running typecheck/vitest/storybook/next build.

---

## 📋 AUTONOMOUS EXECUTION MODE

When user says "continue" or "next" or "run D-wave":
- Dispatch 4–5 parallel background agents, `run_in_background: true`
- opus for: architecture, complex multi-file, security, engine work
- sonnet for: standard UI, API routes, tests, config
- haiku for: purely mechanical single-file tasks
- Non-overlapping file scopes per agent (never two agents touching same file)
- After all agents complete: run ship gauntlet (typecheck → tests → build → tag → push)
- Then immediately plan and dispatch next wave without waiting for user

---

## 🗺️ COMPLETE PHASE ROADMAP — THE PATH TO ENTERPRISE LAUNCH

### SHIPPED ✅
| Tag | Wave | What shipped |
|-----|------|-------------|
| d1-ships | D1 | Auth + Org flow (Clerk) |
| d2-ships | D2 | Welcome + Connect-AWS wizard |
| d3-ships | D3 | Full scan pipeline (EC2 + CloudWatch → Python engine → DB) |
| d4-ships | D4 | Overview page (Pulse/Feed/Map/Forecast) |
| d5-ships | D5 | Findings list + detail (4-tab: Evidence/Math/Reasoning/Resource) |
| d6-ships | D6 | Claude enrichment, Apply/Dismiss, Pulse breakdown, Forecast chart |
| d7-ships | D7 | Integrations page, MapTab interactivity, RescanButton, Settings |
| d8-ships | D8 | Scan history, MapTab tooltips, Bulk actions, Digest builder |
| d9-ships | D9 | Proof page polish, CSV export, Pagination, EBS zombie detection |
| d10-ships | D10 | Export wired, RDS idle, Per-run export, Landing page overhaul |
| d11-ships | D11 | Multi-region, S3 detection, Anomaly+commitment dispatch, Rate limiting |
| d12-ships | D12 | S3 zombie scoring, PostHog analytics, Kind card visuals, Pricing page |
| d13-ships | D13 | Billing portal, Privacy/Terms, Welcome email, SEO/OG, Vercel cron |

### IN PROGRESS 🔄
| Wave | What it delivers |
|------|----------------|
| D13 | Billing portal + webhook + privacy pages + welcome email + SEO + cron config |

### UPCOMING — COMPLETE PATH TO LAUNCH 🚀

#### D14 — Feature Gating + Upgrade Flow
**Goal:** Free users can browse findings; real AWS scans are Pro-only. Upgrade path is frictionless.
- D14-A (opus): Enforce Pro gate in `/api/scan` using `checkOrgTier()` from `lib/billing/gate.ts`
- D14-B (sonnet): Upgrade modal — when free user hits scan, show overlay with value props + Stripe checkout link
- D14-C (sonnet): Soft-gate dashboard features (export CSV = Pro, bulk actions = Pro)
- D14-D (sonnet): Free tier usage counter (scans remaining, visible in sidebar)
- D14-E (haiku): Tier badge in sidebar + settings page tier display

#### D15 — Production Security Hardening
**Goal:** Infrastructure-grade security. No shortcuts. Passes a basic pentest.
- D15-A (opus): Rate limiting on ALL API routes via Upstash Redis (per-user, per-org, per-IP)
- D15-B (opus): Security headers middleware (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy)
- D15-C (sonnet): Sentry error monitoring wired (client + server + edge runtime)
- D15-D (sonnet): Input validation hardening — all API routes validate with Zod, no raw req.body
- D15-E (sonnet): Audit log table in DB — record every action (scan, apply, dismiss, export, settings change)

#### D16 — Onboarding + Activation
**Goal:** New user → first finding in under 3 minutes. Zero confusion.
- D16-A (opus): Onboarding checklist component (sidebar or homepage) — Connect AWS → Run scan → View finding
- D16-B (sonnet): First-scan celebration state (confetti or emerald banner with savings found)
- D16-C (sonnet): Empty state improvements — contextual guidance when no findings, no accounts
- D16-D (sonnet): Onboarding progress tracking in DB (steps completed per org)
- D16-E (haiku): Welcome tooltip overlays on first visit to overview/findings pages

#### D17 — AI Intelligence Layer (Claude deeply wired)
**Goal:** Claude explains, advises, and answers questions. Engineers feel like they have a smart colleague.
- D17-A (opus): "Ask AI" panel on finding detail — natural language Q&A about the specific finding
- D17-B (opus): "Fix recommendation" tab — Claude generates step-by-step remediation (Terraform/CLI/console)
- D17-C (sonnet): Finding severity scoring — Claude classifies each finding as Critical/High/Medium/Low
- D17-D (sonnet): "What should I fix first?" org-level advisor — Claude ranks findings by ROI
- D17-E (haiku): Inline AI insight chips on finding cards (one-liner from Claude Haiku)

#### D18 — Notifications + Alerts
**Goal:** Stratos pushes intelligence to engineers, not just pulls.
- D18-A (sonnet): Slack webhook integration — post scan summary when significant waste found
- D18-B (sonnet): Email digest wired end-to-end (weekly cron already set; wire actual email content)
- D18-C (sonnet): Alert thresholds — org-configurable: "notify when waste > $X/month"
- D18-D (haiku): Notification preferences in settings page
- D18-E (haiku): In-app notification bell (unread count, recent alerts)

#### D19 — Multi-Account + Team Collaboration
**Goal:** Enterprise teams can manage multiple AWS accounts and collaborate.
- D19-A (opus): Multiple AWS accounts per org — accounts table already supports it, wire UI
- D19-B (opus): Team member invitations — Clerk org invitations wired into settings
- D19-C (sonnet): Role-based access — admin (full control) vs viewer (read-only findings)
- D19-D (sonnet): Per-account findings breakdown — filter/group findings by account
- D19-E (sonnet): Account health dashboard — status card per connected account

#### D20 — Enterprise Compliance + Trust
**Goal:** Enterprise buyers can say yes. SOC2-adjacent documentation and controls.
- D20-A (opus): Audit log viewer in settings — paginated, exportable, filterable
- D20-B (opus): Data retention policy — configurable, auto-purge old scan data
- D20-C (sonnet): GDPR compliance — account deletion flow, data export on request
- D20-D (sonnet): SOC2 readiness doc + security questionnaire template (markdown, public)
- D20-E (sonnet): Responsible disclosure page + basic security.txt

#### D21 — Performance + Scale Infrastructure
**Goal:** Handle thousands of concurrent users without degradation. Sub-200ms p95 for API routes.
- D21-A (opus): Redis caching layer — scan results, finding counts, org stats (5-min TTL)
- D21-B (opus): DB query optimization — composite indexes on (orgId, createdAt), (accountId, kind), explain analyze
- D21-C (sonnet): Background scan queue — BullMQ job for long-running scans (already has Redis)
- D21-D (sonnet): CDN + edge config — Vercel edge for static, aggressive Cache-Control on public routes
- D21-E (haiku): Performance monitoring dashboard (internal) — latency, DB query times, cache hit rates

#### D22 — Public Proof + Growth Engine
**Goal:** The live demo that earns trust. Engineers share this. HN front page material.
- D22-A (opus): Live proof page — real-time scan against public Azure/Alibaba trace data, SSE stream
- D22-B (opus): "Your potential savings" estimator — enter monthly AWS bill, get estimated waste range
- D22-C (sonnet): "Share my savings" feature — generate shareable card (OG image) with org savings
- D22-D (sonnet): Public scan counter + waste found counter (real numbers, PostHog-backed)
- D22-E (haiku): Testimonial/case study section on landing page (anonymized, real numbers)

#### D23 — Developer Workflow Integrations (Phase 2 Vision)
**Goal:** Stratos meets engineers where they work. Begins IDE + terminal integration.
- D23-A (opus): VS Code extension — sidebar showing org's top 5 waste findings while coding
- D23-B (opus): GitHub Action — scan on PR merge, post findings as PR comment
- D23-C (sonnet): Terminal CLI (`npx stratos scan`) — pipe output, CI-friendly JSON mode
- D23-D (sonnet): Terraform cost annotation — pre-apply cost estimate via Infracost integration
- D23-E (sonnet): Slack app (slash command) — `/stratos scan`, `/stratos findings`

#### D24 — Launch Preparation
**Goal:** Production-grade. Custom domain live. Load tested. Support ready.
- D24-A (opus): Custom domain on Vercel + DNS + SSL (usestratos.com or stratos.ai)
- D24-B (opus): Load testing — k6 scripts, validate 1000 concurrent users on scan API
- D24-C (sonnet): Runbook documentation — incident response, rollback procedures, on-call guide
- D24-D (sonnet): Support system — Crisp or Intercom wired, FAQ bot, escalation path
- D24-E (haiku): Production env var audit + secrets rotation checklist

---

## 🔐 SECURITY AUDIT CHECKLIST (run every D-wave)

### Authentication + Authorization
- [ ] All API routes check `auth()` from Clerk before any logic
- [ ] All DB queries gate on orgId (never query without org scope)
- [ ] No CLERK_SECRET_KEY or any secret in client bundles
- [ ] Webhook endpoints verify signatures (Stripe svix, Clerk svix)

### Input Validation
- [ ] All request bodies validated with Zod before use
- [ ] No raw `req.body` used anywhere
- [ ] File uploads (if any) validated for type + size
- [ ] No SQL injection vectors (Drizzle parameterizes, but verify)

### Rate Limiting
- [ ] Scan API: max 10 scans/hour/org
- [ ] Auth endpoints: delegated to Clerk
- [ ] Export API: max 100 exports/day/org
- [ ] Webhook endpoints: verified-only, no rate limit needed

### Infrastructure
- [ ] AWS: read-only IAM policy verified. No ec2:*, s3:PutObject, etc.
- [ ] No credentials in logs, error messages, or API responses
- [ ] CORS restricted to own domain in production
- [ ] Security headers on all responses

### AI Security
- [ ] Claude never receives raw user input without sanitization
- [ ] Prompt injection resistance: findings data is structured JSON, not free text
- [ ] Claude output never executed as code
- [ ] No system prompt leakage in API responses

---

## 💰 MONETIZATION ARCHITECTURE

### Current Tiers
| Tier | Price | Limits | Features |
|------|-------|--------|---------|
| Free | $0 | 1 AWS account, 10 scans/month, view findings | All finding types |
| Pro | $49/month | 5 accounts, unlimited scans, exports, AI Q&A | + Slack, CSV export, AI advisor |
| Enterprise | Custom | Unlimited accounts, SSO/SAML, audit logs, SLA | + Custom integrations, dedicated support |

### Unit Economics Target
- Inference cost: ~$0.002/scan (Haiku for 50 findings × 8 tokens each)
- DB cost: ~$0.01/org/month (Neon serverless)
- Target gross margin: >85% at scale
- Payback period on Pro: immediate (first scan finds >$100/month waste typically)

### Pricing Psychology
- Free plan must deliver "aha moment" — the first real finding
- Pro upgrade trigger: user sees a finding they want to act on but can't export
- Annual discount: 20% (2 months free) to improve cash flow and reduce churn
- Enterprise: custom quote starting $500/month for >10 accounts

---

## 📈 GROWTH STRATEGY

### First 100 Users
- HN Launch: "Show HN: I built a tool that found $50K/month in wasted AWS spend in 3 minutes"
- Reddit: r/aws, r/devops, r/sysadmin — real demo, not ad copy
- Twitter/X: Build-in-public thread (already established pattern)
- Dev communities: Discord servers for indie hackers, AWS builders
- Personal network: every engineer the founder has ever worked with

### Virality Mechanics
- "Share my savings" feature — public-safe card with "$X/month saved"
- GitHub Action — every PR that mentions AWS cost gets Stratos badge
- CLI tool — shows up in engineers' terminals, colleagues ask "what's that?"
- VS Code extension — visible in shared screenshots/streams

### Positioning
- NOT "AI for AWS costs" — boring
- YES: "The engineer's cloud intelligence layer"
- Hook: "Your cloud is burning money right now. We find it in 3 minutes."
- Proof: live demo with real public data, real dollar amounts

### Target Personas (in order of priority)
1. Startup CTO/lead engineer with AWS bill >$5K/month — direct pain, direct authority
2. DevOps/SRE at Series A–C startup — manages AWS, has budget discretion
3. Engineering manager at enterprise — needs to show cost savings to leadership
4. Solo engineer at bootstrapped SaaS — every dollar matters

---

## ⚡ SCALING ARCHITECTURE

### Now (0–1000 users)
- Neon serverless PostgreSQL: sufficient
- Vercel: sufficient for Next.js
- Modal: FastAPI engine scales to zero (free tier)
- Upstash Redis: caching + queues

### Phase 2 (1K–10K users)
- Neon: upgrade to dedicated compute
- Modal: dedicated GPU for batch jobs
- BullMQ: queue for all scans (already wired)
- Vercel: add edge middleware for latency
- CDN: aggressive static asset caching

### Phase 3 (10K+ users)
- Migrate engine to dedicated infra (AWS/GCP) — Modal cost model doesn't scale
- Read replicas for findings queries
- Separate scan worker pool from web tier
- Regional deployments (EU for GDPR)
- Consider PlanetScale or Supabase for horizontal DB scale

---

## 🧪 QUALITY STANDARDS (enforced every wave)

### Ship Gauntlet (run after every D-wave)
```bash
npx tsc --noEmit            # zero type errors
pnpm test run               # all tests pass
pnpm --filter @stratos/web build  # Next.js build clean
git tag d{N}-ships
git push origin main --tags
```

### Test Coverage Target
- Every new API route: 4+ tests (401, 403/404, 200, error case)
- Every new utility function: 3+ tests (happy path, edge, error)
- Every new component: 1+ rendering test
- Engine functions: full unit test coverage

### Code Quality
- No `any` types in new code (strict TypeScript everywhere)
- No `console.log` in production code (use proper logger or remove)
- No commented-out code committed
- Zod schemas for all external data (API payloads, DB results, engine I/O)

---

## 🔮 PRODUCT PSYCHOLOGY (what makes engineers emotionally depend on this)

### The Hook Ladder
1. **Curiosity** — "How much am I wasting?" (landing page estimator)
2. **Surprise** — First scan shows $3K/month they didn't know about
3. **Relief** — Claude explains exactly what to do in plain English
4. **Trust** — Applied a recommendation, AWS bill dropped next month
5. **Habit** — Weekly digest arrives, engineers check it like email
6. **Dependency** — "I can't manage AWS without this"
7. **Advocacy** — "You NEED to try Stratos"

### Emotional Design Principles
- Every number must be real, verifiable, and defensible
- The product must be calmer than the problem it solves
- Green means "we saved you money" — never use it ambiguously
- Speed matters: sub-3-second scan results feel like magic
- Engineers trust tools that show their work (math tab on findings)

### Anti-patterns to avoid
- Never show a loading spinner for > 500ms without a progress indicator
- Never show a number without units and time period
- Never truncate error messages (engineers need full context)
- Never require a credit card before delivering value
- Never send more than 1 email per week unless urgent

---

## 📞 CONTEXT FOR FUTURE SESSIONS

When a new session starts on Stratos:
1. Read `CLAUDE.md` (core identity + stack)
2. Read `STRATEGY.md` (this file — strategic context + roadmap)
3. Read `ENGINE.md` (the math)
4. Check git log for last shipped tag to understand current position
5. Check D-wave status: what's been shipped, what's in progress
6. Apply architecture laws and execution mode above
7. Always think: what is the highest-leverage thing to build next?

The answer is always the next D-wave that moves Stratos from "impressive demo"
toward "product engineers emotionally depend on."
