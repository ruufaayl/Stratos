# Stratos — Information Architecture (v1)

> **Status:** Locked 2026-05-25.
> **Authors:** founder + agent.
> **Inputs:** `CLAUDE.md`, `docs/superpowers/specs/2026-05-24-brand-identity-design.md`, `docs/superpowers/plans/2026-05-24-design-system-v2.md`.
> **Outputs:** consumed by every subsequent screen spec, sitemap commit, navigation skeleton, and screen-build plan.

---

## 1. Why this exists

We have a brand and a design system. We do not have a **map of the product**. Without an IA, every screen redesigns the nav, the URL pattern, the empty-state, and the back-button behavior. Customers feel that. So before we draw screen six, we lock the full sitemap, URL contract, permission model, and the state-variant rules every screen inherits.

This doc is the source of truth for:
- which routes exist
- what each route is for
- who can see it
- how it connects to the next route
- which engine endpoint feeds it
- which P0/P1/P2 wave it ships in

Subsequent sub-projects (UI design, screen builds) **slice from this doc by section**, not by individual screen. Section by section is how 200 screens get shipped.

---

## 2. Locked product decisions (the 4 that shaped the sitemap)

| # | Decision | Consequence on IA |
|---|---|---|
| 1 | **Many orgs per user** (Clerk Organizations) | Every app route is `/app/[org]/…`. Org-switcher in primary nav. `/orgs` route for cross-org list. Per-org settings tree duplicated. |
| 2 | **AWS + Azure + GCP day-1** | Three connect-wizards, three inventory taxonomies, cloud-switcher in secondary nav, unified `/app/[org]` overview + per-cloud `/app/[org]/{aws,azure,gcp}` deep dives. ~30% more screens. |
| 3 | **Self-serve + Enterprise** | Adds `/enterprise`, `/demo-request`, `/security` (SOC2 page), full `/legal/*` tree, sales-CRM webhook. Pricing page is BOTH conversion funnel AND enterprise-contact landing. |
| 4 | **No public share / embed** | Everything behind sign-in. No `/share/[token]` routes. No iframe-able dashboards. No OG-image generation for findings. **Smaller surface area.** |

---

## 3. User taxonomy & permission model

### 3.1 User roles within an org

Three roles. (Resist a fourth — every extra role doubles permission UI.)

| Role | Capabilities |
|---|---|
| **Owner** | Everything. Exactly **1 per org** (transferable). Owns billing. Cannot be removed by anyone but themselves. |
| **Admin** | Everything except: delete org, transfer ownership, change billing plan. Can invite, manage roles, manage integrations, change all settings. |
| **Member** | Read all findings, dashboards, reports. Acknowledge / archive / snooze findings. Create reports. Cannot change settings, integrations, or invite. |

There is no `viewer` role at v1. If "read-only" emerges as a real need, we add it later — but most "viewer" requests are actually billing-tier requests (don't pay per seat), which we solve with pricing, not roles.

### 3.2 Cross-cutting actors

- **Anonymous visitor** → marketing site only, never sees app routes (middleware redirects `/app/*` to `/sign-in`).
- **Signed-in user with no org** → routed to `/orgs/create`.
- **Signed-in user with org but no cloud connection** → routed to `/app/[org]/welcome` (forced wizard).
- **Stratos staff** → `/admin/*` routes, completely separate auth gate, NEVER mixed with customer routes.

---

## 4. URL contract

Locked patterns. Deviations require a doc update.

```
/                                  Marketing root
/{public-page}                     Marketing pages (kebab-case)
/blog/[slug]                       Blog (date-slug)
/docs/[...slug]                    Docs (nested)
/legal/{terms|privacy|dpa|aup}     Legal (fixed list)

/sign-in, /sign-up, /accept-invite/[token]   Auth

/orgs                              List user's orgs
/orgs/create                       Create org
/app/[org]                         Org root (slug, not UUID)
/app/[org]/{section}               Section root
/app/[org]/{section}/[id]          Detail
/app/[org]/{section}/[id]/{tab}    Tabbed detail (URL is source of truth for tab)

/me/{section}                      User-level (cross-org) settings

/admin/*                           Internal staff only
/api/*                             API (not user-facing routes)
```

### 4.1 URL rules

1. **Slugs over UUIDs in the URL bar.** `org` and `report` use slugs. Resource IDs (EC2 instances, S3 buckets) keep their cloud-native IDs because customers paste them.
2. **Tabs are URLs.** A tab change is a route change. Deep-linkable, back-button works, browser history respects it.
3. **Filter state lives in query params.** `?cloud=aws&kind=idle&account=acme-prod`. Sharable. Bookmarkable.
4. **Pagination is `?page=N` (1-indexed).** Never offset/limit in URL.
5. **No trailing slash.** Next.js default.
6. **All route changes that mutate URL must update query params atomically** — no half-state.
7. **Sensitive identifiers never in URL.** No tokens, no PII, no AWS account numbers in query params we'll log. Account IDs are fine in path, never in query.

### 4.2 Reserved org slugs (cannot be used as user-chosen org slugs)

`admin`, `api`, `app`, `blog`, `changelog`, `contact`, `customers`, `demo-request`, `docs`, `enterprise`, `legal`, `me`, `orgs`, `pricing`, `proof`, `security`, `settings`, `sign-in`, `sign-up`, `status`, `support`.

---

## 5. Sitemap (the tree)

```
PUBLIC (no auth)
├── /                                Landing — hero, social proof, "see live demo"
├── /pricing                         Tiers + Enterprise contact card
├── /enterprise                      Long-form sales page (SOC2, MSA, SSO)
├── /demo-request                    Sales-team form
├── /security                        Trust center index
│   ├── /security/soc2               SOC2 report request
│   └── /security/responsible-disclosure
├── /customers                       Logo wall + 2-3 long case studies
│   └── /customers/[slug]            Individual case study
├── /blog                            Engineering blog index
│   └── /blog/[slug]                 Post
├── /changelog                       Product changelog (paginated)
├── /docs                            Docs root
│   ├── /docs/getting-started
│   ├── /docs/algorithms             Engine math explained
│   ├── /docs/security
│   ├── /docs/integrations
│   ├── /docs/api                    REST API reference (auto-generated)
│   └── /docs/[...slug]              Nested
├── /legal/terms
├── /legal/privacy
├── /legal/dpa                       Data Processing Addendum
├── /legal/aup                       Acceptable Use Policy
├── /legal/cookies
├── /proof                           PUBLIC live demo (unauth, the wedge)
├── /proof/[datasetSlug]             Switch datasets (Azure / Google / Alibaba)
├── /robots.txt, /sitemap.xml, /llms.txt

AUTH (Clerk)
├── /sign-in
│   ├── /sign-in/sso                 SSO start
│   ├── /sign-in/mfa                 MFA challenge
│   ├── /sign-in/reset-password
│   └── /sign-in/verify-email
├── /sign-up
├── /accept-invite/[token]
└── /sign-out                        POST endpoint, redirects /

ORG BOOTSTRAP (signed in, no org / no cloud yet)
├── /orgs                            List user's orgs (if 2+, otherwise skip)
├── /orgs/create                     Name org, set slug
└── /app/[org]/welcome               First-cloud connect wizard, then "scanning…"

APP (gated, scoped to org)
├── /app/[org]                       Unified overview (across clouds)
│   ├── ?tab=pulse                   Real-time waste pulse (Zone A from current dashboard)
│   ├── ?tab=feed                    Findings feed
│   ├── ?tab=map                     Cost map (treemap)
│   ├── ?tab=forecast                Forecast cone
│   └── ?tab=impact                  Realized savings tracker (P1 — cumulative $ from acked findings)
│
├── /app/[org]/aws                   AWS overview
├── /app/[org]/azure                 Azure overview
├── /app/[org]/gcp                   GCP overview
│
├── /app/[org]/{cloud}/accounts                     List
├── /app/[org]/{cloud}/accounts/[accountId]         Detail
├── /app/[org]/{cloud}/regions                      List
├── /app/[org]/{cloud}/regions/[regionId]           Detail
├── /app/[org]/{cloud}/services                     Breakdown
├── /app/[org]/{cloud}/services/{service}           Service-specific (ec2, rds, s3, ebs, eks, lambda, other)
├── /app/[org]/{cloud}/resources/[resourceId]       Resource detail (tabbed: Overview | Findings | Utilization | History)
│
├── /app/[org]/findings              All findings, filterable
│   ├── /app/[org]/findings/[id]                    Detail (tabbed: Evidence | Math | Reasoning | Resource | History)
│   ├── /app/[org]/findings/saved                   Saved filter views
│   └── /app/[org]/findings/archived
│   (Filter by kind via ?kind=idle|rightsize|anomaly|commitment|drift|zombie)
│
├── /app/[org]/forecast              Cone view
│   ├── /app/[org]/forecast/scenarios               What-if
│   └── /app/[org]/forecast/budgets                 Budget alerts
│
├── /app/[org]/reports               Index
│   ├── /app/[org]/reports/monthly                  Auto-generated digest
│   ├── /app/[org]/reports/executive                Exec-ready PDF
│   ├── /app/[org]/reports/custom                   Builder
│   ├── /app/[org]/reports/scheduled                Delivery schedules
│   └── /app/[org]/reports/[reportId]               Saved report
│
├── /app/[org]/integrations          Index (visual tile grid)
│   ├── /app/[org]/integrations/connect/aws         Add another AWS account
│   ├── /app/[org]/integrations/connect/azure
│   ├── /app/[org]/integrations/connect/gcp
│   ├── /app/[org]/integrations/slack
│   ├── /app/[org]/integrations/jira
│   ├── /app/[org]/integrations/pagerduty
│   ├── /app/[org]/integrations/webhooks
│   │   └── /app/[org]/integrations/webhooks/[id]
│   └── /app/[org]/integrations/api-keys
│       └── /app/[org]/integrations/api-keys/[id]
│
└── /app/[org]/settings              Org settings index
    ├── /app/[org]/settings/general                 Name, slug, timezone, currency, fiscal year
    ├── /app/[org]/settings/members                 Team table
    │   ├── /app/[org]/settings/members/invite      Bulk invite form
    │   └── /app/[org]/settings/members/[userId]    Member detail (change role / remove)
    ├── /app/[org]/settings/roles                   (read-only at v1, future custom roles)
    ├── /app/[org]/settings/sso                     Enterprise tier: SAML / OIDC / SCIM
    ├── /app/[org]/settings/audit-log
    ├── /app/[org]/settings/billing                 Plan + usage entry
    │   ├── /app/[org]/settings/billing/plan        Pick / change tier
    │   ├── /app/[org]/settings/billing/usage       Meters
    │   └── /app/[org]/settings/billing/invoices    Stripe portal link
    ├── /app/[org]/settings/notifications           Default channels
    ├── /app/[org]/settings/data-retention
    └── /app/[org]/settings/danger                  Delete org, export data

USER (cross-org, scoped to person)
├── /me                              Profile
├── /me/preferences                  Theme (dark-only at v1 — placeholder), density, locale
├── /me/security                     Password, MFA, passkeys
├── /me/sessions                     Active devices
└── /me/api-keys                     Personal access tokens (separate from org keys)

ADMIN (Stratos staff only, separate auth gate)
├── /admin                           Internal dashboard
├── /admin/orgs                      All orgs
│   └── /admin/orgs/[id]             Org detail + impersonate button
├── /admin/users
│   └── /admin/users/[id]
├── /admin/impersonate/[orgId]       Impersonate session start
├── /admin/billing                   Stripe reconciliation
├── /admin/engine                    Engine queue + worker health
├── /admin/feature-flags
├── /admin/audit-log                 Internal actions audit
└── /admin/announcements             Schedule banner messages

ERROR + UTILITY
├── /404
├── /500
├── /maintenance                     Toggleable via env var
└── /status                          (link to external statuspage, not self-hosted)
```

---

## 6. Navigation system

### 6.1 Marketing site

**Top nav (sticky):** logo · Live demo · Pricing · Docs · Sign in · `[Connect account]` (primary CTA)
**Footer:** Product / Company / Legal / Resources columns.

No mega-menu. No drop-downs. Single line.

### 6.2 App (`/app/[org]/*`)

The app uses a **two-rail navigation** pattern.

```
┌─ Rail 1 (left, ~64px) ─────────────────────────────────┐
│  [Logo]                                                │
│                                                        │
│  ⊞  Overview         /app/[org]                        │
│  ⚠  Findings         /app/[org]/findings               │
│  ▲  Forecast         /app/[org]/forecast               │
│  ☰  Reports          /app/[org]/reports                │
│  ⚙  Integrations     /app/[org]/integrations           │
│  ⬢  Inventory        /app/[org]/{activeCloud}          │
│                                                        │
│  (push to bottom)                                      │
│  🔔 Notifications                                       │
│  ⚙  Settings         /app/[org]/settings               │
│  [User avatar]       → menu (Profile, Sign out, Admin) │
└────────────────────────────────────────────────────────┘
```

**Rail 1** is icons-only at narrow widths, icon + label at wide. Always visible. Active route highlighted with intel-500 left border.

**Top bar (60px):**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Org switcher ▾]  ›  [Section]  ›  [Subsection]    [Search ⌘K]   [Cloud ▾] │
└────────────────────────────────────────────────────────────────────────────┘
```

- **Org switcher** (left): shows active org slug. Click → dropdown with all orgs + "Create org" + "Manage orgs". (Required because of multi-org decision.)
- **Breadcrumbs** (middle-left): up to 3 segments, current page is non-clickable.
- **Search (⌘K)**: command bar — see §6.3.
- **Cloud switcher** (right, only shown when section is cloud-scoped): AWS / Azure / GCP. Persists in `localStorage` per org as the default active cloud.

### 6.3 Command bar (⌘K / Ctrl-K)

Globally available inside app. Categories:

| Category | Examples |
|---|---|
| Navigate | "go to findings", "go to forecast", "settings/members" |
| Search resources | "i-0abc1234", "acme-prod-rds", "bucket: logs-archive" |
| Search findings | "idle ec2 us-east-1", "anomalies last 24h" |
| Actions | "invite member", "connect AWS account", "create report" |
| Switch | "switch org → personal", "switch cloud → Azure" |
| Help | "docs: rightsizing", "contact support" |

Single Fuse.js-backed source. Keyboard-first. Esc closes.

### 6.4 Mobile / narrow (< 768px)

The app is **desktop-first** (engineers at desks). On narrow widths:
- Rail 1 collapses to a hamburger
- Top bar collapses to logo + ⌘K
- Tabbed views (`?tab=`) become a horizontal scroll strip
- Tables become a card list (responsive table)

No native app at v1. PWA install is fine.

---

## 7. State variants — the contract every screen inherits

Every screen designs **all six** of these. Skipping one is a defect.

| State | Trigger | Required content |
|---|---|---|
| **Loading** | Initial fetch in flight | Skeleton matching final layout. Never spinner-only. |
| **Empty (first-run)** | User has access but no data exists yet (e.g. AWS connected but no scan completed) | Illustrative `<Empty>` with primary CTA back to the unblocking action. |
| **Empty (filtered)** | User filtered everything out | "No findings match these filters" + "Clear filters" button. |
| **Partial** | Some sub-queries failed (e.g. AWS scan succeeded but Azure timed out) | Banner at top + render what we have. Never hide partial truth. |
| **Permission denied** | User's role can't view this | `<Empty>` with "Ask an admin for access" + admin email mailto. Never a blank page. |
| **Error** | Server/network failed | `<Empty>` with error chip + "Retry" + "Contact support" + correlation ID. |

The `<Empty>` primitive (already built) is the chassis for the bottom four. Loading state lives in each component's skeleton. Partial state uses `<Toast role="status">` for the banner.

---

## 8. Screen catalog (canonical list)

Format: `route` · purpose · primary user · primary action · engine endpoint(s) · wave.
Waves: **P0** = ship before first paying customer · **P1** = ship before public launch (HN) · **P2** = polish / enterprise / nice-to-have.

### 8.1 Marketing (public, unauth)

| Route | Purpose | Primary user | Primary action | Wave |
|---|---|---|---|---|
| `/` | Convert visitor → connect account | CTO/VP-Eng | Click "See it find waste in real time" or "Connect account" | P0 |
| `/proof` | Public live demo on real public-cloud traces | Skeptic engineer | Watch findings stream in | P0 |
| `/proof/[dataset]` | Pick a different public dataset (Azure / Google / Alibaba) | Skeptic engineer | Switch dataset | P1 |
| `/pricing` | Show tiers, route to checkout OR enterprise contact | CTO/VP-Eng + Finance | Pick tier OR click "Talk to sales" | P0 |
| `/enterprise` | Sales pitch + SOC2 + SSO + MSA | Enterprise procurement | Submit demo request | P1 |
| `/demo-request` | Form (name, company, AWS spend tier, message) → CRM webhook | Procurement | Submit | P1 |
| `/security` | Trust center root | Security team | Click through to SOC2 | P1 |
| `/security/soc2` | Request SOC2 report (gated form) | Security team | Request | P1 |
| `/security/responsible-disclosure` | Bug-bounty / security email | Security researcher | Email us | P1 |
| `/customers` | Logo wall + case study previews | CTO doing diligence | Click into case study | P2 |
| `/customers/[slug]` | Long-form case study | Same | Read | P2 |
| `/blog` | Engineering blog index, paginated | Engineer | Read post | P1 |
| `/blog/[slug]` | Post | Engineer | Read + share | P1 |
| `/changelog` | Product changelog, RSS-able | Existing user + investor | Subscribe | P1 |
| `/docs` | Docs root | New user | Pick topic | P0 |
| `/docs/getting-started` | First connect → first finding flow | New user | Follow steps | P0 |
| `/docs/algorithms` | Engine math explained (idle, rightsize, etc.) | Engineer in diligence | Understand methodology | P0 |
| `/docs/security` | How we handle credentials, RO scope, encryption | Security-minded | Trust building | P0 |
| `/docs/integrations` | Per-integration setup | Existing user | Follow steps | P1 |
| `/docs/api` | Auto-generated REST API reference | Platform team | Call API | P2 |
| `/legal/terms` | ToS | Legal | Read | P0 |
| `/legal/privacy` | Privacy policy | Legal | Read | P0 |
| `/legal/dpa` | Data Processing Addendum (downloadable) | Legal | Download | P1 |
| `/legal/aup` | Acceptable Use | Legal | Read | P1 |
| `/legal/cookies` | Cookie policy | Legal | Read | P1 |

**Marketing total: ~25 unique routes, P0 = 8.**

### 8.2 Auth

| Route | Purpose | Wave |
|---|---|---|
| `/sign-in` | Email + password OR SSO entry | P0 |
| `/sign-in/sso` | SSO redirect handshake | P1 |
| `/sign-in/mfa` | TOTP / WebAuthn challenge | P0 |
| `/sign-in/reset-password` | Reset flow | P0 |
| `/sign-in/verify-email` | Email verification landing | P0 |
| `/sign-up` | New account | P0 |
| `/accept-invite/[token]` | Accept org invite | P0 |
| `/sign-out` | POST → redirect / | P0 |

**Auth total: 8 unique routes, all P0/P1.** Clerk provides most of these out of the box — we wrap in our brand chrome.

### 8.3 Org bootstrap

| Route | Purpose | Wave |
|---|---|---|
| `/orgs` | List user's orgs (skipped if exactly 1) | P0 |
| `/orgs/create` | Name + slug new org | P0 |
| `/app/[org]/welcome` | Forced first-cloud-connect wizard, then "scanning…" | P0 |

**Org bootstrap: 3 routes, all P0.**

### 8.4 App — Overview & cloud surfaces

| Route | Purpose | Engine | Wave |
|---|---|---|---|
| `/app/[org]` | Unified pulse + tabs (pulse/feed/map/forecast) | `/api/analyze?org=X` | P0 |
| `/app/[org]/aws` | AWS-only overview | `/api/analyze?org=X&cloud=aws` | P0 |
| `/app/[org]/azure` | Azure-only overview | `/api/analyze?org=X&cloud=azure` | P1 |
| `/app/[org]/gcp` | GCP-only overview | `/api/analyze?org=X&cloud=gcp` | P1 |
| `/app/[org]/{cloud}/accounts` | List accounts in cloud | `/api/accounts?cloud=X` | P0 (aws) / P1 |
| `/app/[org]/{cloud}/accounts/[id]` | Account detail | `/api/accounts/[id]` | P0 (aws) / P1 |
| `/app/[org]/{cloud}/regions` | Region rollups | `/api/regions` | P1 |
| `/app/[org]/{cloud}/regions/[id]` | Region detail | `/api/regions/[id]` | P1 |
| `/app/[org]/{cloud}/services` | Service breakdown | `/api/services` | P1 |
| `/app/[org]/{cloud}/services/ec2` | EC2 (or equivalent VM) | `/api/services/compute` | P0 (aws) |
| `/app/[org]/{cloud}/services/rds` | RDS (or DB) | `/api/services/db` | P1 |
| `/app/[org]/{cloud}/services/s3` | S3 (or object) | `/api/services/object` | P1 |
| `/app/[org]/{cloud}/services/ebs` | EBS (or block) | `/api/services/block` | P1 |
| `/app/[org]/{cloud}/services/eks` | EKS / AKS / GKE | `/api/services/k8s` | P2 |
| `/app/[org]/{cloud}/services/lambda` | Lambda / Functions / Cloud Functions | `/api/services/serverless` | P2 |
| `/app/[org]/{cloud}/services/other` | Catch-all (NAT, ELB, etc.) | `/api/services/misc` | P2 |
| `/app/[org]/{cloud}/resources/[id]` | Single resource drill-down | `/api/resources/[id]` | P0 (aws) / P1 |

Subtotal: ~17 templates × 3 clouds for many of them. The IA collapses them to 17 designs, parameterized by cloud.

### 8.5 App — Findings (the core product)

| Route | Purpose | Engine | Wave |
|---|---|---|---|
| `/app/[org]/findings` | All findings, faceted | `/api/findings` | P0 |
| `/app/[org]/findings?kind=idle` | Filter view | same | P0 |
| `/app/[org]/findings?kind=rightsize` | Filter view | same | P0 |
| `/app/[org]/findings?kind=anomaly` | Filter view | same | P0 |
| `/app/[org]/findings?kind=commitment` | Filter view | same | P1 |
| `/app/[org]/findings?kind=drift` | Filter view | same | P2 |
| `/app/[org]/findings?kind=zombie` | Filter view | same | P1 |
| `/app/[org]/findings/[id]` | Detail w/ tabs: Evidence / Math / Reasoning / History | `/api/findings/[id]` | P0 |
| `/app/[org]/findings/[id]?tab=evidence` | Telemetry charts that prove the finding | same | P0 |
| `/app/[org]/findings/[id]?tab=math` | The literal algorithm walkthrough | same | P0 |
| `/app/[org]/findings/[id]?tab=reasoning` | Claude's plain-English explanation | same | P0 |
| `/app/[org]/findings/[id]?tab=history` | Audit log: ack'd by, snoozed, fixed | same | P1 |
| `/app/[org]/findings/saved` | User-saved filter views (smart lists) | local + `/api/saved-views` | P1 |
| `/app/[org]/findings/archived` | Acknowledged / dismissed | `/api/findings?status=archived` | P1 |

### 8.6 App — Forecast / Reports / Integrations / Settings (summary)

| Cluster | Routes | Wave mix |
|---|---|---|
| Forecast | `/forecast`, `/forecast/scenarios`, `/forecast/budgets` | P0 / P2 / P1 |
| Reports | `/reports`, `/reports/monthly`, `/reports/executive`, `/reports/custom`, `/reports/scheduled`, `/reports/[id]` | P1 across the board |
| Integrations | `/integrations`, connect/{aws,azure,gcp}, slack, jira, pagerduty, webhooks, api-keys (+ detail routes) | P0 (aws), P1 (slack), rest P2 |
| Settings | general, members + invite + detail, roles, sso, audit-log, billing + plan + usage + invoices, notifications, data-retention, danger | members/billing/general/danger = P0, rest P1/P2 |

### 8.7 User (cross-org)

| Route | Wave |
|---|---|
| `/me` | P0 |
| `/me/preferences` | P1 |
| `/me/security` | P0 |
| `/me/sessions` | P1 |
| `/me/api-keys` | P2 |

### 8.8 Admin (internal)

Internal-only — designed last. ~10 routes, all P1/P2.

---

## 9. Screen count summary

| Section | Unique route templates | Designed states (×6 variants each) |
|---|---|---|
| Marketing | 25 | ~40 (many static, no loading/empty) |
| Auth | 8 | ~15 |
| Org bootstrap | 3 | ~10 |
| App — Overview / Cloud surfaces | 17 (× 3 clouds = 32 instances) | ~85 |
| App — Findings | 14 | ~40 |
| Forecast | 3 | ~12 |
| Reports | 6 | ~24 |
| Integrations | 12 | ~30 |
| Settings | 13 | ~45 |
| Me (cross-org) | 5 | ~15 |
| Admin | 10 | ~20 |
| Error / utility | 4 | ~6 |
| **Total** | **~120 routes** | **~340 designed states** |

The "200 screens" estimate was the right order of magnitude — and once we collapse cloud-parametric routes into shared designs, **~120 unique templates** carry the whole product.

---

## 10. P0 launch surface (the must-ship list)

To open the doors to first paying customer (AWS-only, 1 org per user happy path):

```
Marketing:   /, /proof, /pricing, /docs/{getting-started, algorithms, security},
             /legal/{terms, privacy}                         8 screens

Auth:        /sign-in, /sign-up, /sign-in/{mfa, reset-password, verify-email},
             /accept-invite/[token], /sign-out               7 screens

Org boot:    /orgs/create, /app/[org]/welcome               2 screens

App (AWS):   /app/[org] + 4 tabs,
             /app/[org]/aws,
             /app/[org]/aws/accounts + [id],
             /app/[org]/aws/services/ec2,
             /app/[org]/aws/resources/[id],
             /app/[org]/findings + 4 kinds + /[id] (4 tabs),
             /app/[org]/forecast,
             /app/[org]/integrations + /connect/aws         ~22 screens

Settings:    /settings/{general, members, members/invite,
             billing, billing/plan, danger}                  6 screens

User:        /me, /me/security                              2 screens

Error:       /404, /500                                      2 screens
                                                            ─────
                                                            ~50 screens
```

50 screens to ship, all on the design system we just built. That's the **P0 product**.

P1 expansion (Azure + GCP, Slack, public launch readiness): another ~40.
P2 (enterprise SSO, admin tools, polish): another ~30.

---

## 11. Section ownership / build order

The right slicing isn't "all marketing first" or "all app first" — it's **end-to-end thinnest customer journey**. The build order:

1. **Wave 1 — End-to-end auth + first finding** (P0 critical path)
   - `/sign-up` → `/orgs/create` → `/app/[org]/welcome` → `/integrations/connect/aws` → `/app/[org]` (overview with at least one real finding shown)
   - Proves the product can onboard a stranger without us in the room.
2. **Wave 2 — Findings depth**
   - `/app/[org]/findings` list + filter, `/app/[org]/findings/[id]` with all 4 tabs.
3. **Wave 3 — Marketing site**
   - `/`, `/proof`, `/pricing`, `/docs/*`, `/legal/*`. Reuses every primitive.
4. **Wave 4 — Settings + billing + invite**
   - `/settings/general`, `/settings/members + /invite`, `/settings/billing + /plan + /danger`.
5. **Wave 5 — Forecast + reports**
6. **Wave 6 — Azure + GCP** (duplicate the AWS section structure)
7. **Wave 7 — Enterprise surface** (SSO, audit-log, `/enterprise`, `/security/*`)
8. **Wave 8 — Admin internal**

Each wave is a separate planning + execution cycle. Each wave produces working, testable software on its own. We do NOT design wave 5 until wave 2 ships.

---

## 12. Out of scope for this IA (and why)

- **Native mobile app** — PWA covers it for v1.
- **Light mode** — explicitly punted in the brand spec. Dark-only.
- **i18n** — English-only at launch. Currency display is per-org setting but copy is not localized.
- **Multi-tenant white-label** — not a real customer ask yet.
- **In-app messaging / Intercom** — defer to support email + docs.
- **Public share / embed** — locked decision §2.4.
- **Custom roles beyond Owner/Admin/Member** — defer.

---

## 13. Anti-goals

- No mega-menus.
- No "modules" or "apps" inside the app (e.g. no app-switcher between "FinOps" and "Optimizer" — it's all one product).
- No vanity sub-domains per org (we use slugs in the path, not `acme.stratos.io`).
- No marketing tricks (no countdown timers, no fake scarcity, no "join the waitlist" — we have a live product).

---

## 14. Open questions (flag, don't block)

These do not block the IA spec but will surface during implementation:

1. **Org-slug uniqueness** — Clerk treats org slugs as globally unique. Confirm it works with our reserved-slug list (§4.2).
2. **Resource ID encoding in URL** — AWS ARNs contain `/` and `:`. We'll URL-encode them. Need a wrapper helper.
3. **Cloud-switcher persistence** — `localStorage` per org, but what if the user has access to AWS-only? Auto-hide the switcher.
4. **`/proof` vs `/app/[org]` overlap** — `/proof` shows the engine running on PUBLIC data. The authenticated overview is the same engine on customer data. Make sure the components are shared, not duplicated.
5. **Empty-org admin handling** — what if the last Owner leaves and only Members remain? Force-promote oldest Member to Admin? Block all settings? Need policy.

---

## 15. What this unlocks (next sub-projects)

This doc is consumed by:

- **Sub-project A — Marketing site** (Wave 3): hi-fi design + build of the 8 marketing P0 routes, on the design system.
- **Sub-project B — Auth + onboarding flow** (Wave 1): the critical-path 9 screens that convert stranger → connected account.
- **Sub-project C — App shell + nav skeleton**: the rail + topbar + ⌘K, routing, org context, cloud context. Built once, every screen plugs in.
- **Sub-project D — Findings UI** (Wave 2): the workhorse — list, filter, detail tabs.
- **Sub-project E — Settings + billing + invite** (Wave 4).
- **Sub-project F — Forecast + reports** (Wave 5).
- (etc.)

Each gets its own UI-spec doc and its own implementation plan.

The **immediate next step** after this IA lands is sub-project C (app shell + nav skeleton). Every other app screen depends on it being in place.

---

## 16. Addendum — competitor IA research (2026-05-25)

Source: `docs/superpowers/research/2026-05-25-ia-competitive-study.md` (1,257-line study of 17 products across direct CCM, node/pipeline AI tools, and best-in-class IA references).

### 16.1 Headline answer: no visual node editor

The user asked us to study ComfyUI, n8n, and other node/pipeline AI tools. The evidence is decisive: **no cost-management product uses a node editor, and none should.** Node editors serve users *constructing pipelines* (ML/data engineers). Stratos users *consume analysis results* (CTOs / VP Eng). Different job. Build cost is 3–6 weeks for a canvas primitive that delivers zero value to our audience. Re-evaluate only if enterprise demand surfaces for a custom cost-allocation rule editor — and even then, a list-based editor wins.

### 16.2 Three changes applied inline

| # | Change | Where in this spec | Priority |
|---|---|---|---|
| 1 | Add `?tab=impact` to `/app/[org]` overview — cumulative realized savings tracker | §5 sitemap | **P1** (needs weeks of data) |
| 2 | Add `?tab=resource` to `/app/[org]/findings/[id]` — summary card linking to full resource page | §5 sitemap | **P0** (Wave 1 core flow) |
| 3 | Add `?tab=findings` to `/app/[org]/{cloud}/resources/[resourceId]` — list of findings for this resource | §5 sitemap | **P0** (Wave 1 — must define now to avoid retrofit) |

Changes 2 + 3 are the **same bidirectional cross-link** modeled from both directions. Without them, a user who lands on a finding cannot see the resource's full context (cost trend, config, other findings on this resource) without losing place. This is the single biggest IA gap in every competitor we studied (Vantage, Cloudability, Datadog CCM, Cast.ai) — and the cheapest one to close.

### 16.3 Three patterns we explicitly reject

- **No customizable sidebar.** New Relic / Datadog allow it because their surface is 50+ capabilities. We have 7. A customizable rail adds complexity without payoff. Exception: pinned shortcuts to saved views (Stripe pattern) — but the 7-item nav itself never changes.
- **No per-service recommendation pages.** AWS / Densify split recommendations by service (EC2 tab, RDS tab, Lambda tab). This forces users into 6–8 pages. Our unified `/findings` + `?service=ec2` filter is strictly better. Service detail pages may show a *filtered* findings section, never their own data store.
- **No "click to refresh."** AWS Cost Explorer and older CCM tools show stale data and ask users to manually refresh. Our SSE architecture supports streaming. Use it. A "Last analyzed: 2h ago" indicator + auto-stream is the contract. Manual "Re-analyze now" exists only for explicit deep scans after connecting a new account.

### 16.4 Command-bar refinement

Vantage's ⌘K indexes 29 navigable pages **plus every saved user object** (saved reports, saved filter views, dashboards, budgets). Our §6.3 listed generic categories without explicitly enumerating saved objects. Make the index explicit when building the command bar: routes + resources + findings + saved-views + saved-reports + actions + help, in that order of recency-weighted ranking.
