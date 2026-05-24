# Stratos — IA Competitive Study

> **Status:** Research complete 2026-05-25.
> **Authored by:** AI research agent from public sources only. No product sign-ups required.
> **Purpose:** Inform and stress-test the locked IA spec at `docs/superpowers/specs/2026-05-25-information-architecture.md`.
> **Scope:** 17 competitor products across three categories + cross-cutting synthesis + 3 concrete IA change recommendations.

---

## 1. Executive Summary (Top 10 Findings, Ranked)

1. **No direct competitor has a visual node editor.** Zero cloud cost management products use canvas-based node editors for analysis or configuration. The genre is dominated by filter-heavy list views, dashboards, and tabbed reports. Node editors belong to a different audience and problem class.

2. **The findings/recommendations page is the core product in every CCM tool.** Whether called "Recommendations," "Opportunities," "Insights," or "Alerts," this is where users live. Competitors compete hardest on how well they surface, prioritize, and contextualize actionable items. Our `/findings` section is correctly the heart of the IA.

3. **Left sidebar + topbar is the universal CCM nav pattern.** Every mature product uses this: an icon-or-label left rail (6–10 items) plus a topbar for account/org context. The only variation is icon-only vs icon+label collapsed states. Our two-rail design is exactly right.

4. **Multi-tenancy via workspace/org is the dominant pattern, but implementation varies wildly.** Vantage uses "workspaces" that segment cost data (not teams). Datadog uses "organizations." Linear uses teams within a single org. Stripe uses connected accounts. None of them handle *user orgs* + *cloud accounts* as two distinct hierarchies the way we do — which is actually correct for our use case.

5. **Command bar (⌘K) is now table-stakes at the high end.** Vantage, Linear, Stripe, and Datadog all have it. Cloudability and CloudHealth do not. It's a clear quality signal. Our spec correctly includes it.

6. **URL design is a quality signal no one talks about.** The best products (Linear, Stripe, Vercel) use clean slug-based URLs with tabs as routes. The worst (CloudHealth, older CCM tools) use UUIDs or query-string monstrosities. Our URL spec is ahead of most direct competitors.

7. **First-run onboarding is uniformly the weakest screen in CCM products.** Most competitors show an empty state or a basic wizard. Vantage shows an "all providers" integration grid. Nobody has nailed the "watch it work on real data before you connect anything" pattern — which is exactly what our `/proof` page does.

8. **Settings hierarchy is deeper than most products need.** CloudHealth and Cloudability have notoriously complex settings trees. The best products (Stripe, Linear) flatten settings into ~5–7 sections. Our 13-section settings tree may be slightly over-engineered at v1 — but it's defensible given enterprise + billing complexity.

9. **Mobile is a non-factor in direct competitors.** CloudHealth, Cloudability, Densify, Vantage — none have meaningful mobile experiences. This validates our desktop-first stance. Vercel and Linear have mobile views, but they are dev-tool outliers.

10. **The node-editor tools (n8n, ComfyUI, Langflow, Dagster) share a common pattern: canvas + right-panel + execution log.** This pattern is powerful for expert users building pipelines. It's deeply unsuited for executives reviewing cost findings. If we ever build a "policy rule editor" for automated remediation, a stripped-down n8n-style canvas *might* be worth considering — but not for analysis presentation.

---

## 2. Category A — Direct Competitors (Cloud Cost Management)

### 2.1 Vantage (vantage.sh)

**Who it's for:** Engineering-led companies that want a Stripe-quality CCM product. Modern, well-designed, similar target audience to Stratos.

#### Top-level navigation

Vantage uses a **left sidebar + topbar** pattern. The sidebar organizes into these primary sections (derived from their Explore Bar's 29 navigable pages):

- **Overview** — executive dashboard of all Cost Reports as widgets
- **Cost Reporting** → Cost Reports, Dashboards, Segments, Network Flow Reports, Kubernetes Efficiency Reports, Financial Commitment Reports
- **Recommendations** (called "Automated Waste Detection") — list of optimization opportunities
- **Budgets & Alerts** — Budget management + alerting
- **Active Resources** — live inventory of provisioned resources
- **Integrations** — 30+ provider connections (AWS, Azure, GCP, Snowflake, Datadog, etc.)
- **Settings** → Workspaces, Teams, Users, Audit Logs, Access Tokens, Billing & Plans

The sidebar is icon+label at full width; the "Explore Bar" (⌘K) is a command palette that searches all 29 pages plus saved reports.

#### URL pattern

Console lives at `https://console.vantage.sh/`. Navigation uses underscore-separated paths:
- `/reporting` for cost reports
- `/overview` for dashboard
- `/settings/workspaces`
- `/settings/teams`
- `/settings/billing`

They use `console.vantage.sh` as the root, with feature paths off the root. No org-in-path — instead workspace isolation is configured within settings, not via URL scoping. This is a meaningful architectural difference from Stratos.

#### Multi-tenancy

Vantage uses **Workspaces** as the isolation primitive, not organizations. A workspace separates cloud provider integrations into distinct cost views (e.g., Production workspace vs. Staging workspace). Teams are an enterprise feature layered on top of workspaces, with RBAC access grants. This is *not* a multi-org model — it's multi-account within a single customer org. URL does not change per workspace; workspace context is a session setting.

#### Pipeline/data presentation

No visual pipeline editor. Data is presented through:
- **Cost Reports**: Filterable/groupable charts and tables, area charts showing cost over time, grouped by service/account/tag/region
- **Dashboards**: Multi-widget canvas of Cost Report summaries (configurable, not real-time)
- **Treemaps**: Available within Cost Reports for hierarchical cost breakdown
- **Active Resources table**: Flat list of all provisioned resources with cost attribution

#### Findings / opportunities

Called "Recommendations" or "Automated Waste Detection." Presented as a filterable list with:
- Per-recommendation estimated monthly savings
- Resource type, region, and account
- Remediation steps with copy-paste CLI commands (recent addition)
- Saved views for recommendation filtering
- No severity/priority ranking visible in public docs — sorted by savings impact

#### Empty / first-run

After account creation and before any cloud integration: users land on Overview with an empty widget grid plus a CTA to add integrations. The getting-started flow is: create account → connect provider via cross-account IAM role → wait for ingestion → land on Overview with real data.

No "watch it work first" pattern. You must connect to see anything.

#### Onboarding

Three steps: create account → connect provider → wait for data. AWS connection uses a cross-account IAM role (read-only). The wizard is straightforward but you're blind until ingestion completes (can take hours for large accounts).

#### Settings hierarchy

Flat and clean — roughly 7 top-level settings pages (General, Workspaces, Teams, Users, Access Tokens, Audit Logs, Billing). Not deeply nested. Enterprise-gated features (RBAC) gate behind plan upgrades gracefully.

#### Command bar / search

Yes — **Explore Bar** (⌘K). Searches across 29 pages AND all saved objects (reports, dashboards, budgets, etc.). Permission-scoped. One of the best command bars in the CCM category.

#### Mobile / responsive

Not meaningfully responsive. Marketing site is responsive. Console is desktop-only.

#### What to steal

1. **The Explore Bar model:** indexes 29 pages + all saved objects + permission-scoped. Our ⌘K spec should do the same — expose all 29-equivalent routes *and* all user-created objects (reports, saved views).
2. **"Saved views" for findings filters:** Vantage calls them "Saved Recommendation Views." Users create named filter presets and share them. Our `/findings/saved` route is correctly modeled.
3. **Overview as a dashboard of saved reports:** The Overview page is just "all your Cost Reports as widgets." This is elegant — you build reports once and the overview self-populates. Consider this pattern for our `/app/[org]?tab=feed`.

#### What to avoid

1. **Workspace-not-org model:** Vantage's workspace concept is confusing — it's not a real tenant isolation boundary, it's a data filter. Our explicit `/app/[org]` scoping with Clerk is cleaner for B2B SaaS.
2. **No empty-state before connection:** Vantage forces you to connect before seeing any value. Our `/proof` route is a direct counter to this anti-pattern.

---

### 2.2 CloudHealth (VMware / Broadcom — now "Tanzu CloudHealth")

**Who it's for:** Large enterprise. Originally acquired by VMware, now under Broadcom. Complex, feature-rich, enterprise-bureaucratic.

#### Top-level navigation

Heavy sidebar with many sections. Main areas:
- **Dashboard/Home** — dynamic widget board with optimization savings summary, realized savings widget, Smart Summary widget
- **Cost Reports** (called "FlexReports") — custom bill analysis
- **Recommendations/Optimization** — rightsizing, waste detection
- **Reservations** (AWS Reserved Instances management)
- **Kubernetes Reports** — container cost chargeback
- **Policies** — threshold and alert configuration
- **FlexOrgs** — multi-org management (enterprise)
- **Setup / Admin** — GraphQL API explorer, user management

The sidebar is **static and cannot be personalized** — a notable user complaint. Top-left has an organization switcher.

#### URL pattern

Not publicly documented. Enterprise product, deep UUID-based URLs inferred from documentation patterns. Unlikely to have clean slugs.

#### Multi-tenancy

Uses **FlexOrgs** — a hierarchical org management system where enterprise customers can create sub-organizations for different business units, regions, or clients. Org switcher is top-left on every screen. This is roughly analogous to our org model but far more bureaucratic (supports hundreds of sub-orgs for MSPs).

#### Pipeline/data presentation

No visual pipeline editor. Traditional dashboard + table + chart approach. The Anomaly Dashboard is a dedicated section for cost anomalies (not integrated into the main findings flow). Cost data presented through FlexReports (essentially a report builder with drag-and-drop columns).

#### Findings / opportunities

"Optimization" section shows recommendations. Basic list format with savings impact. No severity ranking visible. No dismissal or snooze workflow documented publicly. The optimization widget on the home page shows total potential savings and links to the detailed list.

#### Empty / first-run

Not publicly documented in detail. Enterprise onboarding is typically human-assisted.

#### Onboarding

Sales-led. Not self-serve. Requires onboarding call.

#### Settings hierarchy

Complex. Setup → Admin contains the GraphQL API Explorer, user management, and policy configuration. FlexOrgs adds another layer. Many users report that navigation is confusing due to the static sidebar and deep settings nesting.

#### Command bar / search

No command bar. No ⌘K equivalent. Significant usability gap vs. modern tools.

#### Mobile / responsive

No meaningful mobile experience.

#### What to steal

1. **FlexOrgs hierarchy for MSPs:** If Stratos eventually targets managed service providers, a sub-org hierarchy is a real need. Not for v1, but the pattern exists.
2. **Home-page optimization widget:** Showing total potential savings prominently on the home page with a link to details is effective — our `/app/[org]?tab=pulse` should do this.

#### What to avoid

1. **Static sidebar:** Users hate it. Our customizable (pinned) approach + ⌘K is correct.
2. **Sales-led onboarding:** We are self-serve by design. The "call us to get started" pattern is the thing we're explicitly not doing.

---

### 2.3 Cloudability (Apptio / IBM)

**Who it's for:** Large enterprise FinOps teams. IBM acquired Apptio. Heavy governance and financial planning focus.

#### Top-level navigation

Sidebar-based. Main sections:
- **Dashboards** — default + custom dashboards per role/department
- **True Cost Explorer** — multi-cloud cost drill-down with treemap visualization
- **Reports** — "a library of reports out of the box" plus custom report builder
- **Budgets** — budget tracking and alerting
- **Anomaly Detection** — cost spike identification
- **Recommendations** — rightsizing + commitment discount optimization
- **Governance** — policy rules, tagging enforcement
- **Business Mapping** — cost allocation by team/product/project
- **Unit Economics** — cost per unit metric tracking

The sidebar is role-adaptive — different user personas (DevOps, Finance, Executive, etc.) see different default views.

#### URL pattern

Not publicly documented. Enterprise/IBM product — likely UUID-based.

#### Multi-tenancy

Single-org, multi-cloud. Users can customize "Views" per persona. No true multi-org in the public product (enterprise deals handle this differently).

#### Pipeline/data presentation

No visual pipeline editor. Treemap in the True Cost Explorer is the most visual element — hierarchical breakdown of where money is going. Dashboards are widget-based (chart, metric, table widgets). Data is multi-cloud unified.

#### Findings / opportunities

"Recommendations" section for rightsizing. "Anomaly Detection" is separate from recommendations — you navigate between them manually. No unified "findings" concept. This is an anti-pattern we've correctly avoided with our unified `/findings` route.

#### Empty / first-run

Not publicly documented for self-serve (no self-serve exists in practice).

#### Onboarding

Enterprise, sales-led.

#### Settings hierarchy

Deep. "Some users find the interface difficult to navigate, making adoption challenging" (Gartner Peer Insights). Multiple layers of org, billing, data settings.

#### Command bar / search

No command bar.

#### Mobile / responsive

No meaningful mobile experience.

#### What to steal

1. **Role-adaptive views:** Cloudability's persona-based dashboard starting points (Finance vs. DevOps vs. Executive) is genuinely useful. Our reports section (monthly, executive, custom) maps to this. Worth considering role-based *default* dashboard states.
2. **True Cost Explorer treemap + drill-down:** Hierarchical treemap that lets you click into a section and see the breakdown is the best-in-class pattern for cost map visualization. Our `/app/[org]?tab=map` should borrow this interaction.

#### What to avoid

1. **Separate Anomaly + Recommendations surfaces:** Cloudability treats anomalies and recommendations as different navigation sections. We correctly unify both under `/findings` with `?kind=` filtering.
2. **Governance as a separate top-level section:** At v1, governance concepts (tagging, policies) belong inside Settings or as a finding kind — not as a primary nav item.

---

### 2.4 Datadog Cloud Cost Management

**Who it's for:** Existing Datadog customers who want cost correlated with observability data. Not a standalone CCM product — an add-on to the existing Datadog platform.

#### Top-level navigation

Datadog's CCM is embedded within the Datadog sidebar, which is organized into product areas. The full sidebar structure:

**Top section:** Search + recently accessed pages + Watchdog + Service Management links

**Middle section (product areas):**
- Infrastructure
- APM (Application Performance Monitoring)
- Digital Experience
- Software Delivery
- Security (Cloud SIEM, Code Security, Cloud Security, etc.)
- **Cloud Costs** — embedded here, not a top-level section

**Bottom section:** Logs, Metrics (core data primitives)

**Support:** Settings, Help at the very bottom

CCM-specific navigation within Cloud Costs:
- Analyze → Cost Monitors, Cost Changes
- Setup → AWS, Azure, GCP, Oracle, SaaS integrations, Custom Costs, Datadog Costs
- Tagging and Cost Allocation
- Container Cost Allocation (K8s, ECS)

#### URL pattern

Datadog uses `app.datadoghq.com` root with product paths. Cloud Cost is at approximately `/cost/analytics`. Clean paths, no org-in-URL (org is session-level like most observability tools).

#### Multi-tenancy

Single Datadog org per customer. Multi-org is done via Datadog's Organization management — customers with multiple Datadog orgs can view cross-org data in some cases. Not designed for MSP use.

#### Pipeline/data presentation

Datadog CCM introduces **Tag Pipelines** — a visual rules editor for enriching cloud cost tags before attribution. This is the closest thing to a "pipeline editor" in the CCM space. It's not a node canvas — it's a rule list editor — but it's conceptually a pipeline that transforms raw cost data. Worth noting. Also has Workflow Automation for acting on cost recommendations.

#### Findings / opportunities

Cloud Cost Monitors — alerting on cost changes and thresholds. No "findings" concept per se. Recommendations surface within the Cost Explorer as inline suggestions. Less structured than Vantage or Stratos's approach.

#### Empty / first-run

Must have an existing Datadog account. CCM setup requires connecting AWS/Azure/GCP within Datadog's infrastructure setup.

#### Onboarding

Complex — requires Datadog agent setup, billing connector configuration, and waiting 24–48 hours for cost data. Not self-serve friendly for non-Datadog users.

#### Settings hierarchy

Inherits Datadog's complex settings hierarchy. `ddaorg.datadoghq.com/organization-settings` for org-level settings, product-level settings per product.

#### Command bar / search

Yes — Datadog has a global search/command bar. One of the better implementations in observability.

#### Mobile / responsive

Datadog has a mobile app (iOS/Android) with limited functionality. Not focused on CCM specifically.

#### What to steal

1. **Tag Pipelines concept:** A visual (or list-based) rule editor for enriching/reclassifying cost data before analysis is a legitimate feature for enterprise users. Worth adding to our roadmap after v1 as a "Cost Attribution Rules" editor under Settings.
2. **Embedding cost alongside observability data:** Datadog's superpower is showing cost *alongside* performance metrics. Our `/app/[org]/{cloud}/resources/[id]` page should co-display cost trend + utilization — the pattern where you see both is more powerful than either alone.
3. **AI for Cost Analysis (Bits Assistant):** Datadog added an AI chat interface for querying cost data. Our Claude integration is ahead of this, but their approach of embedding AI within the cost explorer (not as a separate page) is the right UX model.

#### What to avoid

1. **CCM as an add-on, not a product:** Datadog's CCM only matters if you're already in Datadog. Standalone CCM (our model) captures customers who don't want to adopt a full observability stack.
2. **24–48 hour data delay as table-stakes:** Datadog's CCM has significant data latency. Our architecture should aspire to same-day or sub-day data freshness as a differentiator.

---

### 2.5 AWS Cost Explorer + Compute Optimizer

**Who it's for:** AWS-native customers who don't want a third-party tool. Free tier with paid API access. The baseline every CCM product is compared against.

#### Top-level navigation

Accessed via the AWS Billing and Cost Management console at `console.aws.amazon.com/costmanagement/`. Left navigation pane contains:

- **Cost Explorer** — interactive cost and usage graphs
  - Cost & Usage (main view)
  - Reports (saved reports)
  - Reservations (RI coverage, utilization, recommendations)
  - Savings Plans (coverage, utilization, recommendations)
- **Anomaly Detection** — separate section
- **Budgets** — budget alerts
- **Cost Categories** — rule-based cost allocation
- **Cost Allocation Tags** — tagging management
- **Billing Conductor** — custom billing rates (enterprise)

**AWS Compute Optimizer** is a *separate console* (`console.aws.amazon.com/compute-optimizer/`) with its own navigation:
- Dashboard
- EC2 instances
- Auto Scaling groups
- Lambda functions
- EBS volumes
- ECS services
- RDS instances

This split between "cost" (Cost Explorer) and "rightsizing recommendations" (Compute Optimizer) is a significant usability problem. They use the same underlying recommendation engine but require navigating between two separate consoles.

#### URL pattern

AWS uses `console.aws.amazon.com/{service}/home` pattern. Account/region context is a session-level setting, not in the URL. Heavily query-param-based. Not a model to emulate.

#### Multi-tenancy

AWS Organizations handles multi-account. Cost Explorer can be configured to show costs across an organization's management account. But the navigation doesn't change per account — you switch accounts via a session-level account switcher at the top of the AWS console.

#### Pipeline/data presentation

No visual pipeline editor. The Cost Explorer uses a traditional chart + filter + table layout. The "new look" (2022) added a summary widget above the chart, a split-panel view for filters, and improved color accessibility. The Cost Categories revamp (2024) added a split-view panel for rule editing.

Visualization:
- Area/bar chart (cost over time)
- Grouped breakdown table
- Downloadable as CSV
- Treemap: not natively in Cost Explorer (Compute Optimizer has some visualization, not treemap)

#### Findings / opportunities

Fragmented across three surfaces:
1. Cost Explorer → Reservations → Recommendations
2. Cost Explorer → Savings Plans → Recommendations
3. Compute Optimizer → per-service recommendations

Each has different UI patterns. No unified findings list. This fragmentation is a major pain point for AWS users and is the gap products like Vantage and Stratos exist to fill.

#### Empty / first-run

No empty state — you must be an AWS customer. Cost Explorer requires enabling it first (one-click, but data takes 24 hours to appear after first enable).

#### Onboarding

Not applicable — it's built into AWS console. No separate onboarding.

#### Settings hierarchy

Inherits AWS console settings complexity. Billing Preferences, Cost Allocation Tags, Cost Categories each have separate settings pages.

#### Command bar / search

AWS console has a universal search bar. Does not search cost-specific objects.

#### Mobile / responsive

AWS console has a mobile app but it is not usable for cost management.

#### What to steal

1. **The "reservations" and "savings plans" sections as distinct surfaces:** These commitment types are genuinely different enough to warrant dedicated pages, not just filter states. Our `/app/[org]/findings?kind=commitment` is a single filter — consider if commitment recommendations deserve a dedicated section after v1.

#### What to avoid

1. **Split consoles:** Cost Explorer + Compute Optimizer being separate apps is the quintessential anti-pattern we exist to fix. Our unified `/findings` is the right answer.
2. **24-hour data lag as acceptable:** AWS's "data available yesterday" model trains users to accept staleness. We should aspire to fresher data and call it out as a differentiator.

---

### 2.6 OptScale (Hystax, Apache-2.0)

**Who it's for:** Engineering/FinOps teams who want an open-source self-hosted option. Supports AWS, Azure, GCP, Alibaba, Kubernetes. We've already harvested reference architecture from this codebase.

#### Top-level navigation

Based on README and open-source screenshots, the main navigation includes:

- **Cost Analytics & Recommendations** — cost optimization insights
- **Resource Management / Pools** — hierarchical pool-based resource organization
- **Shared Environments** — non-production environment management
- **Cost Geo Map** — geographic visualization of spend
- **VM Power Schedules** — automated start/stop schedules for resource savings
- **Reserved Instances / Savings Plans** — commitment tracking
- **Cost Breakdown by Owner** — attribution by team/owner

Sidebar-based navigation. Icon+label pattern. Not visually polished — looks like a functional open-source tool.

#### URL pattern

Self-hosted, so URL depends on deployment. Docs show paths like `/report/cost-explorer`, `/resources/pools`. Clean path-based structure.

#### Multi-tenancy

**Pools** are the multi-tenancy primitive — you create hierarchical pools that represent business units, teams, or projects. Resources are assigned to pools. Each pool has budget limits and optimization rules. This is more granular than org-based tenancy — it's more like cost allocation tags modeled as a tree.

#### Pipeline/data presentation

No visual pipeline editor. Traditional list + chart approach. The Geo Map is a distinctive feature (choropleth map showing cost concentration by region). Resource pools displayed as a hierarchical tree view.

#### Findings / opportunities

"Recommendations" list with categories: rightsizing, scheduling, abandoned resources, subscription management. Filter by recommendation type, cloud, and pool. Dismissal workflow exists. This is the feature set we harvested from.

#### Empty / first-run

Open-source, so first-run is a setup wizard for cloud credentials. No "try without credentials" mode.

#### Onboarding

CLI-based installation (Docker/Kubernetes). Cloud credentials added via wizard after deploy.

#### Settings hierarchy

Standard open-source settings: Organization, Cloud accounts, Users & Roles, Billing, Integrations.

#### Command bar / search

No command bar.

#### Mobile / responsive

No mobile-specific experience.

#### What to steal

1. **Pool-based cost allocation hierarchy:** OptScale's hierarchical pool model (Org → Team → Project → Resource) is more flexible than tag-based allocation. Worth considering as a "cost allocation groups" feature post-v1.
2. **Geographic cost map:** A choropleth world map showing cost by region is genuinely useful for multi-region deployments. Could enhance our inventory views.

#### What to avoid

1. **Open-source UX debt:** OptScale is functional but visually dated. The brand investment we've made in dark, polished design is a genuine competitive moat against open-source alternatives.

---

### 2.7 Cast.ai

**Who it's for:** Kubernetes-focused teams. Automatically optimizes Kubernetes cost and performance. Not a general cloud cost tool — purely K8s.

#### Top-level navigation

Sidebar sections (from documentation):
- **Overview / Dashboard** — cluster cost summary
- **Node Autoscaling** — spot instance management, bin packing
- **Workload Autoscaling** — horizontal/vertical pod scaling
- **Cost Monitoring** — namespace/workload/cluster cost breakdown
  - Idle Resources (within Cost Monitoring)
  - Available Savings (within Cost Monitoring)
- **Application Performance Automation (APA)** — automated remediation
- **AI Enabler** — LLM/GPU workload optimization
- **Database Optimizer** — DB performance tuning
- **Kubernetes Security** — runtime security
- **Administration** — SSO, RBAC, org management

Sidebar is icon+label. Cluster-scoped — most views are per-cluster, with a cluster switcher in the topbar.

#### URL pattern

Not publicly documented. SaaS console at `app.cast.ai`. Likely `/clusters/[cluster-id]/[section]` pattern.

#### Multi-tenancy

Organization-level account with multiple clusters per org. Navigation is cluster-scoped — you pick a cluster and navigate within it. Cross-cluster views exist (cost monitoring aggregates across clusters).

#### Pipeline/data presentation

No visual pipeline editor. Dashboards and tables. "Impact Dashboard" shows savings achieved over time. Cost Monitoring shows namespace-level cost breakdown in table/chart format.

#### Findings / opportunities

"Available Savings" section in Cost Monitoring shows specific optimization opportunities (idle nodes, oversized workloads). Not a unified findings concept — it's a sub-section of Cost Monitoring.

#### Empty / first-run

Connect a cluster via Helm chart installation. Read-only mode available (observe before enabling automation). Clear "here's what we'd save" preview before committing to automated changes.

#### Onboarding

Prerequisites: kubectl, helm. Connect cluster → Cast.ai installs agent → shows available savings in read-only mode → user enables automation.

#### Settings hierarchy

Administration section: SSO, RBAC, org settings. Plus per-cluster Autoscaler settings.

#### Command bar / search

No command bar.

#### Mobile / responsive

No mobile experience.

#### What to steal

1. **Read-only mode before automation:** Cast.ai's "observe before you act" pattern (show what we'd do, let you approve) is a smart trust-building mechanism for automated remediation. If we ever build automated actions, this staged approval flow is the right model.
2. **"Impact Dashboard" for proving ROI:** A historical view of how much waste the product has eliminated over time is powerful for retention and justifying renewal. We should add a realized-savings tracker to our overview/reporting area post-v1.

#### What to avoid

1. **K8s-only scope:** Cast.ai's narrow focus means they can't serve multi-cloud cost needs. Our breadth is a deliberate design choice.

---

### 2.8 Spot.io (now absorbed into Flexera)

**Who it's for:** Originally infrastructure cost optimization via spot instances and reserved capacity. Acquired by NetApp, then spot.io domain redirects to Flexera. The product still exists as "Spot by NetApp" within NetApp's portfolio.

#### Top-level navigation

Now that spot.io is Flexera, the navigation is Flexera's ITAM + FinOps platform. The original Spot product modules:
- **Elastigroup** — spot instance management
- **Ocean** — Kubernetes cost optimization
- **Eco** — reserved instance lifecycle management
- **CloudAnalyzer** — cost visibility and recommendations

These became Flexera modules. Navigation is a product-switcher model (pick the module, then navigate within it).

#### What to steal

1. **Reserved instance lifecycle management (Eco):** The concept of tracking the full lifecycle of a reserved instance (purchase → utilization → expiry → renewal recommendation) as a dedicated workflow is worth noting. Our `/findings?kind=commitment` should model this lifecycle.

#### What to avoid

1. **Product-switcher nav:** Having separate top-level navigation per product module creates cognitive overhead. Our unified sidebar is better.

---

### 2.9 Densify

**Who it's for:** Large enterprise. AI-driven rightsizing recommendations for public cloud and containers. Extremely deep technical analysis but dated UI.

#### Top-level navigation

Sidebar + topbar. Main sections:
- **Optimization Overview** — aggregate view with Summary tab (charts) and Data tab (table)
- **Cloud Instances** → EC2, RDS, Lambda, ECS per service tabs
- **Container** → Kubernetes optimization
- **Approvals** — change approval workflow

The Instance Optimization Details dashboard uses a **split-pane design**: tabular list in top pane, detail panel in bottom pane. Tabs within the detail panel: resource utilization charts, system details, optimization approvals, attributes.

#### URL pattern

Not publicly documented. Enterprise product with deep tab-based navigation.

#### Multi-tenancy

Single-org, multi-cloud. No public information on MSP/multi-org support.

#### Pipeline/data presentation

No visual pipeline editor. The split-pane design (table + details panel) is the most distinctive UI pattern. Heavy emphasis on data tables and utilization charts (CPU/memory utilization histograms).

#### Findings / opportunities

Rightsizing recommendations organized by service type (EC2, RDS, Lambda, etc.) with tabs. Each recommendation shows current vs. recommended instance type, projected savings, and risk level. Approval workflow for gated changes.

#### Empty / first-run

Enterprise deployment — not self-serve.

#### Onboarding

Enterprise, sales-led.

#### Settings hierarchy

Standard enterprise settings.

#### Command bar / search

No command bar.

#### Mobile / responsive

No mobile experience.

#### What to steal

1. **Split-pane detail view for findings:** Densify's master-list / detail-panel layout (table on top, details below) is efficient for power users who need to compare multiple findings rapidly. Our `/findings` list could offer a split-pane mode for desktop.
2. **Risk level on recommendations:** Densify explicitly rates each recommendation by risk (Low/Medium/High) based on utilization analysis. Adding a risk signal to our findings would help users prioritize action.

#### What to avoid

1. **Service-siloed recommendations:** Densify shows EC2 recommendations separate from RDS recommendations. Our unified findings feed with `?kind=rightsize` across all services is the right approach.

---

## 3. Category B — Node-Based / AI Pipeline Tools

### 3.1 ComfyUI (Stable Diffusion node editor)

**Who it's for:** Advanced AI image generation users who want full control over the Stable Diffusion pipeline.

#### Canvas / editor structure

ComfyUI is a **blank canvas node editor**:
- **Canvas:** Infinite pan-and-zoom workspace. Nodes are rectangular blocks. Connection wires pass data between nodes (left=inputs, right=outputs, color-coded by data type).
- **Node types:** Load Checkpoint, CLIP Text Encoder, KSampler, VAE Encode/Decode, etc. Each node has input ports (left dots), output ports (right dots), and parameter fields (center).
- **Node search:** Double-click empty canvas to open search palette.
- **Panels:** Queue panel (Ctrl-0 toggle), History panel (H key toggle). Both are overlay panels, not permanent sidebar sections.
- **No persistent left sidebar.** Navigation is entirely canvas-centric.
- **Workflow management:** Save/load as JSON. Workflows embedded in PNG metadata.

#### Navigation

There is essentially no navigation UI in the traditional sense — ComfyUI is a single-screen application. The only navigation-like elements are:
- Queue panel (run history)
- Settings (gear icon, modal)
- Workflow import/export controls

#### Multi-tenancy

None. Local application, single user.

#### What this teaches for Stratos

ComfyUI's design philosophy — maximum flexibility, minimum scaffolding — is **not appropriate for cost management**. Our users are CTOs and VP Engs reviewing findings, not ML engineers constructing pipelines. The lack of any persistent navigation, empty states, or onboarding means ComfyUI is powerful for experts and impenetrable for newcomers.

**Key insight:** Node editors work when the user IS the pipeline designer. In Stratos, users consume pipeline *outputs*, not design pipelines. These are fundamentally different user jobs.

---

### 3.2 n8n (Workflow Automation)

**Who it's for:** Developers and technical operations teams building workflow automations. The open-source alternative to Zapier/Make, self-hostable.

#### Canvas / editor structure

n8n uses a **left panel + canvas + right panel** layout:

**Left Panel (persistent sidebar):**
- Projects (personal project + team projects)
- Overview (all workflows, credentials, executions)
- Workflows list
- Credentials
- Variables
- Insights (analytics)
- Templates
- Settings

**Canvas (main area):**
- Infinite pan-and-zoom workspace
- Nodes connected by bezier-curve edges
- Node input/output on left/right sides
- Click a node → right panel opens with configuration

**Right Panel (context-sensitive):**
- Node configuration (event, account, parameters, test)
- Real-time input/output preview when testing

**Top Bar:**
- Workflow name (editable)
- Save / Execute / Activate controls
- Workflow settings

#### URL pattern

n8n uses a standard SaaS URL pattern: `/workflows/[id]` for the editor, `/credentials`, `/executions`. Clean and predictable.

#### Multi-tenancy

**Projects** are the isolation primitive. Users get a Personal Project by default. Team Projects group workflows + credentials with RBAC. Within a project, workflows/credentials are accessible to project members. Enterprise has LDAP/SAML SSO.

#### Navigation patterns

n8n's left panel is well-designed — it collapses/expands. The node library in the left panel organizes 500+ integrations by category. The "Insights" section provides analytics on workflow performance. This mirrors the concept of a "findings" feed for workflow operations.

#### Empty / first-run

Empty canvas with a large "+" button to add the first node. Quick-start templates visible. No hard-coded empty state — the canvas is the empty state.

#### What to steal

1. **Project-based isolation within an org:** n8n's Projects concept (personal + team projects within one n8n instance) is a smart incremental multi-tenancy model. Could inform future "team workspaces" within an org in Stratos.
2. **Real-time input/output preview alongside config:** Showing actual data flowing through a configuration panel is excellent UX for any rule-based editor. Relevant if we build a "Tag Pipeline" or "Alert Rule" editor.

#### What to avoid

1. **The canvas paradigm for non-expert users:** n8n's power users love the canvas. But n8n also prominently features templates and pre-built workflows because most users don't want to build from scratch. For Stratos, pre-configured analysis (our engine) is the product — not a blank canvas.

---

### 3.3 Zapier (Linear Workflow Automation)

**Who it's for:** Non-technical users building automations between apps. The most popular workflow automation tool.

#### Structure

Zapier is **not a canvas-first tool** — it uses a **linear step list** as the primary editor:
- Each Zap is a series of steps in a vertical list
- Each step has a trigger/action app + event selection
- Step configuration tabs: Setup, Configure, Test (simplified from prior 4-tab design)
- The "editor" is a step list, not a free-form canvas

Zapier also has **Canvas** (introduced 2024) — a separate product that is a node editor for *visualizing* systems of Zaps. But the Canvas is for diagramming, not building individual Zaps. This is an important distinction.

**Left panel in editor:** Pinned apps, Zapier products (Tables, Forms), built-in tools, search. AI-assisted (Copilot).

**Main Zapier dashboard (outside editor):**
- Zaps (list of all automations)
- Tables (database-like storage)
- Interfaces (form/page builder)
- Chatbots
- Canvas (system diagrams)
- Transfer (bulk data migration)

#### What to steal

1. **Separation of "system diagram" from "individual workflow editor":** Zapier Canvas is for high-level visualization; the Zap editor is for building individual automations. This separation is smart. If Stratos ever gets complex enough for users to want to see their "analysis pipeline" visually, a separate diagram view (like our `/app/[org]?tab=map`) could serve this role without making the primary editing interface a canvas.

#### What to avoid

1. **Canvas as a distraction:** Zapier's Canvas feature is powerful but adds complexity. The lesson is to not add visual tools until there's a clear user need.

---

### 3.4 Make (formerly Integromat)

**Who it's for:** Technical-to-semi-technical users who want more power than Zapier but a more structured tool than n8n.

#### Structure

Make uses a **radial/circular canvas** — a distinctive visual metaphor where scenarios (workflows) are displayed as a circle of module icons connected by curved lines. Modules are arranged around a central trigger. This is not an infinite canvas — it's a fixed radial layout.

**Navigation outside the editor:**
- Scenarios (list of all automations)
- Templates (pre-built scenarios)
- Connections (credentials)
- Data stores (key-value storage)
- Webhooks
- Keys
- Organizations and Teams (multi-tenancy)

**Multi-tenancy:** Organizations contain Teams. Users belong to org+team. This is a clear multi-tenant model.

#### What to steal

1. **Organization → Team hierarchy for multi-tenancy:** Make's Org + Team model (with explicit membership at each level) is clean. Our Owner/Admin/Member model within an org is simpler and correct for v1, but the Org → Team concept is worth noting for future "department" features.

---

### 3.5 Flowise (LLM Workflow Builder)

**Who it's for:** Developers building LLM applications with visual low-code tooling.

#### Structure

Canvas-based node editor built specifically for LLM pipelines. Key sections:

- **Agentflow** — multi-agent orchestration canvas
- **Chatflow** — single-agent/RAG chatbot canvas
- **Human in the Loop (HITL)** — review queue for agent outputs
- **Observability** — execution traces and monitoring

Each flow type has its own canvas. The left panel contains a palette of 100+ component nodes (LLMs, vector stores, memory, tools, etc.).

The marketing describes it as "like Figma but for backend AI applications" — which captures the expert-user, design-tool analogy perfectly.

#### What this teaches for Stratos

Flowise demonstrates that node editors work well when:
1. Users are building pipelines themselves (not consuming outputs)
2. The number of node types is manageable (~100 in Flowise)
3. Users have programming context to understand data flow

Cloud cost analysis in Stratos has ~6 finding types (idle, rightsize, anomaly, commitment, drift, zombie) — nowhere near the complexity that justifies a node canvas.

---

### 3.6 Langflow (LangChain Visual UI)

**Who it's for:** Python/LangChain developers who want a visual interface for building AI flows.

#### Structure

Canvas-based node editor. Main sections:

- **Flows** — canvas-based flow builder
- **Agents** — agent-specific flows
- **Playground** — real-time testing without full stack
- **API Keys** — developer authentication

The canvas uses a drag-and-drop component library. Components: LLMs, prompts, memory, retrievers, agents, tools. Components connect via typed ports (chain → chain, document → retriever, etc.).

**First-run:** Empty canvas with example flows and templates. Strong template library reduces blank-canvas paralysis.

#### What to steal

1. **Playground for testing without deployment:** Langflow's playground concept — test the flow before making it production — maps to our `/proof` concept. The idea of "see it work in isolation before connecting real data" is the right onboarding philosophy.

---

### 3.7 Apache Airflow (DAG Orchestration, mature)

**Who it's for:** Data engineering teams running production ETL/ML pipelines.

#### Structure

Web-based Airflow UI (Airflow 3.x) organized around DAGs:

**Top navigation (tabs):**
- DAGs (main list view)
- Assets (data lineage)
- Admin (config, connections, variables, pools)

**DAGs section:**
- DAG list with status heatmap, schedule, tags, recent run history
- Per-DAG detail page with tabs: Runs, Tasks, Events, Code, Details
- Views within a run: Grid (status heatmap), Graph (dependency graph)

**Grid View:** Status heatmap showing task states across recent runs — each column is a run, each row is a task. Color coding: green (success), red (failed), yellow (running), gray (skipped).

**Graph View:** Visual DAG (directed acyclic graph) showing task dependencies. Nodes are tasks, edges are dependencies. Click a node to inspect execution details.

**Admin section:** Variables, Connections, Pools, Providers, Plugins, Config.

#### URL pattern

`/dags/[dag-id]/[view]` for DAG-specific pages. `/admin/connections`, `/admin/variables`. Clean and predictable.

#### Multi-tenancy

Single Airflow deployment per environment (no native multi-tenancy in open-source Airflow). Organizations run multiple Airflow instances. Astronomer (managed Airflow) adds workspace/org concepts.

#### What to steal

1. **Grid view for run history:** Airflow's status heatmap (run × task matrix) is an extremely information-dense way to show execution history at a glance. Our findings history view (`/findings/[id]?tab=history`) could use a similar pattern for showing scan history over time — each column is a scan date, each row is a check.
2. **Graph view as secondary, not primary:** Airflow shows the DAG graph as a view option on the detail page, not as the main navigation entry point. The list view is primary; the graph is secondary. This is the right hierarchy for analysis tools.

#### What to avoid

1. **Graph as the default mental model:** Users navigate by DAG name (list), not by visually locating a node in a graph. Data lineage graphs are useful for exploration, not primary navigation.

---

### 3.8 Dagster (Data Orchestration, Modern)

**Who it's for:** Modern data engineering teams who think in "assets" rather than "jobs." Developer-first, type-safe, with a sophisticated UI.

#### Structure

**Main navigation (top bar → sidebar sections):**
- **Overview** — "Factory floor" deployment-wide activity dashboard
- **Assets** — asset catalog with filtering + graph view
- **Runs** — execution history
- **Schedules** — automated triggers
- **Sensors** — event-based automation
- **Jobs** — workflow definitions
- **Deployment** — code locations, config, alerts

**Asset detail page tabs:**
- Overview, Partitions, Events, Checks, Lineage, Automation, Insights

**Runs section:** Gantt chart for execution visualization, event log, compute logs. Re-execution capabilities.

**Asset Graph:** All assets displayed as a DAG. Click any asset to open a flyout sidebar with details. The graph renders thousands of assets with group collapsing.

**Key insight:** Dagster's asset catalog is a knowledge graph of data lineage. The primary navigation is a *list* (catalog) not a graph. The graph is a secondary view for lineage exploration.

#### URL pattern

Clean paths: `/assets`, `/runs`, `/jobs/[job-name]`, `/schedules/[schedule-name]`. The webserver uses Next.js-style routing.

#### Multi-tenancy

Dagster+ (managed) adds Organizations and Teams. Self-hosted is single-tenant.

#### What to steal

1. **Asset detail page with tabbed deep-dive:** Dagster's per-asset page (Overview → Partitions → Events → Checks → Lineage → Automation → Insights) is the best reference for our `/findings/[id]` detail page tabs. The "Lineage" tab (dependency graph) is particularly applicable to our "Evidence" tab concept.
2. **Flyout sidebar on graph click:** In the asset graph, clicking a node opens a flyout sidebar with details without leaving the graph view. If we ever add a cost treemap or resource graph, this flyout pattern avoids full-page navigation.

#### What to avoid

1. **Graph as the default view for a catalog:** Dagster's asset list (catalog) is the primary view, graph is secondary. Our findings list-first approach is correct.

---

### 3.9 Prefect (Workflow Orchestration)

**Who it's for:** Data engineers and ML teams who want a Python-native orchestration tool that's less opinionated than Airflow/Dagster.

#### Structure

**Left sidebar sections:**
- Flows
- Flow Runs
- Deployments
- Work Pools
- Blocks (credentials and infrastructure configs)
- Variables
- Automations
- Events
- Workspace Settings

**Flow Runs page layout:**
- Filter controls at top (date, state, flow name, deployment, tags)
- Run history chart (timeline of run starts/durations)
- Flow runs table (name, state, start time, elapsed time, task count)

**Per-run detail:** Radar visualization (execution trace graph showing parent-child task relationships), event log, compute logs.

**Workspace model:** Each Prefect Cloud account has Workspaces. The sidebar is workspace-scoped. Workspace switcher in the topbar.

#### URL pattern

`app.prefect.cloud/[workspace-handle]/[section]` — workspace handle in URL path. Clean and logical.

#### Multi-tenancy

**Workspaces** are the isolation primitive within a Prefect account. Each workspace has its own flows, deployments, and settings. Teams (Prefect Cloud enterprise) allow RBAC within workspaces. URL is scoped by workspace handle.

#### What to steal

1. **Workspace handle in URL:** Prefect's `app.prefect.cloud/[workspace-handle]/runs` pattern is similar to our `/app/[org]/findings` pattern. The validation that slug-in-path is the right multi-tenant URL model.
2. **Run history chart above table:** Showing an aggregate timeline above the table (giving the "shape" of recent activity at a glance before drilling into individual rows) is a good pattern for our findings feed.

---

## 4. Category C — Best-in-Class IA References

### 4.1 Linear (Project Management)

Linear is the gold standard for developer-tooling information architecture. Every B2B SaaS product should study it.

**Key patterns:**
- **Inverted-L chrome:** Narrow left sidebar (icons + labels) + top bar for breadcrumbs and workspace context
- **Sidebar items:** Inbox, Triage, My Issues, Issues (all), Projects, Cycles, Roadmap, Teams (context-dependent), Favorites
- **Workspace switcher:** Top-left, always visible. Switching workspace changes the entire sidebar context
- **No tabs-as-pages at the wrong level:** List views are single pages with filter controls, not tabbed. Tabbing is reserved for detail pages
- **URL pattern:** `linear.app/[team-slug]/[view]` — team slug in path, not query param
- **Empty states:** Illustrated, purposeful, with clear primary action
- **Keyboard-first:** ⌘K command bar, extensive keyboard shortcuts, modal-free actions
- **Dense but not cluttered:** High information density with consistent spacing grid

**What Stratos borrows:**
- The inverted-L chrome is our two-rail navigation design — validated
- Team slug (= our org slug) in URL path — validated
- ⌘K command bar — validated
- Tabbing for detail pages (Issues → tabs: Activity, Relations, etc.) — maps to our `/findings/[id]?tab=` pattern

---

### 4.2 Vercel (Dev Tools — Clean Multi-Tenant)

Vercel manages teams → projects → deployments across a global edge network.

**Key patterns:**
- **Sidebar:** Resizable, collapsible. "Projects as filters" — you switch between team-level and project-level views of the *same sections* using a project filter, not separate nav trees
- **Multi-tenancy URL:** `vercel.com/[team-slug]/[project-name]` — team + project in path
- **Universal search:** Searches teams, projects, deployments, pages, settings. AI-powered navigation assistant
- **Mobile:** Floating bottom bar optimized for one-handed use (Feb 2026 default)
- **Settings:** Team-level settings and project-level settings share the same navigation pattern — consistent mental model
- **Empty states:** Beautifully designed with direct actions (import repo, connect domain, etc.)

**What Stratos borrows:**
- "Projects as filters" pattern: within a section, a context filter changes what you see without a full navigation change. Our cloud switcher (AWS/Azure/GCP) on each section is exactly this pattern.
- Universal search scoped to teams + projects + pages — our ⌘K spec should scope to org + cloud + section + saved objects.

---

### 4.3 New Relic (Observability)

Brand inspiration for Stratos. Dark theme, data-dense, engineering-audience.

**Key patterns:**
- **Fully customizable left nav:** Users pin the capabilities they use. No fixed sidebar. This is powerful for a platform with 50+ distinct capabilities, but may be overkill for Stratos v1 (we have ~7 primary sections)
- **All entities view:** A unified entity explorer showing all monitored infrastructure in one searchable/filterable view. Maps to our `/app/[org]/{cloud}/resources` concept
- **User menu bottom-left:** Moves profile/settings out of the primary nav into the bottom-left corner — good pattern for getting it out of the critical scanning path
- **"All capabilities" catalog:** New Relic exposes all features through a discovery catalog, letting users add what they need. This is an alternative to a fixed sidebar — works for a mega-platform, not for focused tools
- **Pinnable features:** "Pin this capability to sidebar" allows sidebar personalization without full customization chaos

**What Stratos borrows:**
- User menu at the bottom of the rail (not the top) — our spec already does this with user avatar
- Entity-explorer model for the resource inventory view

---

### 4.4 Datadog (Full Platform — not just CCM)

Already covered in Category A (§2.4). Key architectural insights:
- Sidebar organized by *product area*, not by feature
- Middle section groups: Infrastructure / APM / Digital Experience / Software Delivery / Security
- Bottom section: foundational data (Logs, Metrics) — always accessible without being primary nav
- **Implication for Stratos:** Our sidebar could organize as: Core (Overview, Findings, Forecast) → Data (Inventory) → Configuration (Reports, Integrations, Settings). This is a product-area grouping model.

---

### 4.5 Stripe Dashboard

Already analyzed in research. Key patterns (from the detailed URL analysis):

**Sidebar structure:** 4 clear groups (Primary, Shortcuts, Products, Settings)

**What Stratos borrows:**
1. **"Shortcuts" concept** — recently visited pages pinned for quick access. Our ⌘K covers this partially, but a "recent" section in the sidebar could add value
2. **Settings split into Account-level vs. Product-level:** Stripe separates `/settings/account` (name, payouts, legal) from `/settings/billing`, `/settings/checkout`, etc. Our settings tree does this but could be clearer about the org-level vs. feature-level distinction
3. **Workbench for integration debugging:** Stripe's `/workbench` (API logs + webhook event inspector) is a fantastic pattern for trust-building with engineering users. Our future API logs view should follow this model.

---

## 5. Cross-Cutting Synthesis

### 5.1 Common Patterns Across Direct Competitors (Table-Stakes)

Every serious CCM product ships these. If Stratos doesn't have them, we look unfinished:

| Pattern | What it is | Example |
|---|---|---|
| **Left sidebar + topbar** | 6–10 primary nav items in a left rail, topbar for org context + search | All: Vantage, Datadog, Harness, Cast.ai |
| **Findings/Recommendations list** | Filterable list of actionable optimization opportunities sorted by savings | All tools have this; execution quality varies |
| **Multi-cloud unified overview** | Single dashboard showing total spend across all connected clouds | Vantage, Cloudability, CloudHealth |
| **Cost trend charts (area/bar)** | Time-series cost visualization with grouping by service/account/tag/region | Universal |
| **Treemap for hierarchy drill-down** | Hierarchical proportional area chart for cost breakdown | Vantage, Cloudability, AWS Cost Explorer (partial) |
| **Budget alerts** | Set a spend threshold, get notified when breached | All products |
| **Anomaly detection alerts** | ML-driven detection of cost spikes | Vantage, Datadog, CloudHealth, Harness |
| **CSV export** | Raw data export for finance teams | All products |
| **Role-based access control** | Owner/Admin/Member or similar 3–4 tier model | All products |
| **Cloud provider connection wizard** | Step-by-step account connect flow, typically read-only IAM | All products |

### 5.2 Common Patterns Across Node-Based Tools (Visual Pipeline IA)

All 7 node-based tools (ComfyUI, n8n, Zapier, Make, Flowise, Langflow, Airflow, Dagster, Prefect) share these patterns:

| Pattern | Description |
|---|---|
| **Canvas is the primary workspace** | Free-form infinite canvas with zoom/pan for building pipelines |
| **Left panel = component library** | Searchable palette of node types, dragged onto canvas |
| **Right panel = context detail** | Node configuration, data preview, test output — opens on node click |
| **Top bar = workflow controls** | Save, run, activate/deactivate, naming |
| **Separate "list" page for workflow management** | The canvas editor is entered *from* a list page that shows all workflows |
| **Execution history** | A separate section/tab showing past runs with status, logs, and errors |
| **Connections/Credentials management** | A dedicated section for managing authentication credentials for integrations |
| **Empty canvas paralysis mitigation** | Templates, examples, or guided start to prevent blank-page fear |

### 5.3 Should Stratos Have a Visual Node Editor?

**No.**

The evidence is decisive. Here is the reasoning:

**Who uses node editors:** Expert users who are *constructing* data pipelines — ML engineers, data engineers, automation builders. The workflow is: design → test → deploy → monitor.

**Who uses Stratos:** CTOs and VP Engs who are *consuming* analysis results — reviewing findings, taking action on recommendations, tracking spend trends. The workflow is: connect → review → act.

These are different jobs. A node editor for Stratos would be building the product for the *engine developer*, not the *business user*.

**The one exception:** A visual rule editor for "cost allocation rules" or "tag pipelines" (similar to Datadog's Tag Pipelines feature) could be valuable at enterprise tier for users who need to define custom attribution logic. But this is a *settings editor*, not the primary product UI. And even then, a simple rule-list editor (not a canvas) is almost certainly sufficient.

**Build cost:** A canvas node editor is one of the most complex UI primitives to build correctly (virtualized rendering, connection routing algorithms, undo/redo stack, keyboard navigation). The engineering investment is 3–6 weeks minimum and ongoing maintenance burden. For zero user benefit at v1.

**Recommendation:** Ship v1 without any node editor. Revisit *only* if enterprise customers request a rule-builder for custom cost allocation logic, and then implement a list-based rule editor (not a canvas).

---

## 6. Three IA Changes to Make

### Change 1: Add "Realized Savings" / Impact Tracker to Overview

**Source:** Cast.ai Impact Dashboard, Vantage Overview page, CloudHealth Realized Savings widget.

**Problem in current IA:** The `/app/[org]` overview (§8.4) describes four tabs: pulse, feed, map, forecast. None of these explicitly tracks *historical* savings realized from acting on findings. Users need to justify the product's ROI at renewal time.

**Proposed change:** Add a fifth tab (or widget on the existing pulse tab):
```
/app/[org]?tab=impact
```
Shows: cumulative estimated savings from acknowledged findings over time (week / month / quarter / YTD). A running tally of "Stratos has helped you save $X this quarter." This is a retention and upsell mechanism disguised as a UX feature.

**Priority:** P1 (not P0 — needs a few weeks of data to be meaningful).

---

### Change 2: Explicitly Separate "Finding Detail" Evidence from "Resource Detail"

**Source:** Dagster per-asset tabs (Overview / Partitions / Events / Checks / Lineage / Automation / Insights), Densify split-pane design.

**Problem in current IA:** The `/findings/[id]` detail page has tabs: Evidence | Math | Reasoning | History. "Evidence" is telemetry data about the specific finding. But "resource detail" (`/app/[org]/{cloud}/resources/[id]`) has a separate page for general resource information (all findings for this resource, utilization history, configuration).

Currently the spec treats these as separate trees (findings tree vs. inventory tree). But users who land on a finding will immediately want to see the *resource context* (what is this resource, what else is happening with it). This cross-link exists but isn't formally modeled.

**Proposed change:** Add a **Resource** tab to `/findings/[id]`:
```
/app/[org]/findings/[id]?tab=evidence     (current: telemetry that proves this finding)
/app/[org]/findings/[id]?tab=math         (current: algorithm walkthrough)
/app/[org]/findings/[id]?tab=reasoning    (current: Claude explanation)
/app/[org]/findings/[id]?tab=resource     (NEW: full resource context — type, config, all findings for this resource)
/app/[org]/findings/[id]?tab=history      (current: audit log)
```
The Resource tab is a *link-in* to the resource detail page, not a duplication. It shows a summary card with a "View full resource" link. This prevents the user from having to navigate away to get resource context.

**Priority:** P0 — this affects the core findings workflow.

---

### Change 3: Add a "Findings by Resource" View

**Source:** Vantage's "Active Resources" table (cross-link between cost data and resource inventory), Dagster's asset catalog, AWS Cost Explorer's resource-level drill-down.

**Problem in current IA:** The current findings structure is finding-centric (list of findings, each about one resource). But a power-user question is: "Show me all the findings about a specific account, or all findings about my EC2 fleet." This is the *resource-centric* view of findings.

Currently, you can filter `/findings?account=X` to see all findings for an account. But there's no explicit "findings FOR this resource" surface on the resource detail page itself.

**Proposed change:** Add a **Findings** tab to `/app/[org]/{cloud}/resources/[resourceId]`:
```
/app/[org]/{cloud}/resources/[resourceId]          (existing)
/app/[org]/{cloud}/resources/[resourceId]?tab=overview    (default: cost trend, metadata)
/app/[org]/{cloud}/resources/[resourceId]?tab=findings    (NEW: all findings for this resource)
/app/[org]/{cloud}/resources/[resourceId]?tab=utilization (existing-ish: CPU/memory charts)
/app/[org]/{cloud}/resources/[resourceId]?tab=history     (configuration change log)
```

This creates a bidirectional link: findings → resource, and resource → findings. Users who browse inventory should see "this instance has 2 open findings" and click through to see them.

**Priority:** P0 for AWS resources (we're already building this surface in Wave 1).

---

## 7. Three Patterns We Should NOT Adopt

### Anti-Pattern 1: Fully Customizable / Personalized Sidebar

**Who does it:** New Relic (pinnable capabilities), Datadog (partially).

**Why it seems good:** Users see only what they use. Reduces cognitive load.

**Why we should not do it:** Stratos has 7 primary sections. New Relic has 50+ capabilities across monitoring, APM, security, logs, etc. Customization is justified when the product surface is so large that no single user needs all of it. With 7 sections, a customizable sidebar adds complexity (what if a user hides Findings?) with no benefit. Our sidebar is small enough that every user should see all sections all the time.

**The exception:** The user can pin specific saved views (saved reports, saved filter sets) as "shortcuts" — similar to Stripe's Shortcuts section. But the primary 7-item nav never changes.

---

### Anti-Pattern 2: Recommendations Split by Service Type

**Who does it:** AWS (Cost Explorer recommendations vs. Compute Optimizer), Densify (EC2 tab, RDS tab, Lambda tab), Harness (to some extent).

**Why it seems reasonable:** Different cloud services have different optimization levers. EC2 rightsizing is different from RDS rightsizing.

**Why we should not do it:** Splitting recommendations by service forces users to visit 6–8 different pages to see "all the things I should act on." Our unified `/findings` feed with `?kind=rightsize&service=ec2` filter parameters is strictly better. Users should be able to see all findings in one list, filtered as needed, not forced to navigate per-service to find everything.

**The exception:** The `/app/[org]/{cloud}/services/ec2` page can show a section of findings *specific to EC2* — but those are still pulled from the unified findings API with a filter, not a separate data store.

---

### Anti-Pattern 3: On-Demand Data (Polling / Manual Refresh)

**Who does it:** AWS Cost Explorer (24-hour data lag), Densify (batch analysis runs), older CCM tools.

**Why it seems reasonable:** Cloud billing data is delivered in batch (hourly to daily depending on provider). Real-time is genuinely hard.

**Why we should not do it:** Even if the underlying billing data is hourly, our UX should hide this lag. Users should see a "last analyzed" timestamp, and the scan should run automatically on a schedule (triggered by new billing data). Manual "refresh" buttons signal that the product is not confident in its own freshness. Our Server-Sent Events architecture (per CLAUDE.md) supports streaming updates. Use it.

**The right model:** Data freshness indicator in the topbar ("Last updated: 2 hours ago") + automatic refresh when new data arrives + "Re-analyze now" button only for explicitly triggered deep scans (e.g., after connecting a new account). Never "click to see if anything changed."

---

## 8. Citations / Source URLs

| Source | URL |
|---|---|
| Vantage marketing site | https://www.vantage.sh/ |
| Vantage documentation | https://docs.vantage.sh/ |
| Vantage Explore Bar announcement | https://www.vantage.sh/blog/explore-bar |
| Vantage Overview launch | https://www.vantage.sh/blog/vantage-launches-overview |
| Vantage Workspaces | https://docs.vantage.sh/workspaces |
| Vantage Getting Started | https://docs.vantage.sh/getting_started |
| CloudHealth Broadcom Tech Docs | https://techdocs.broadcom.com/us/en/ca-enterprise-software/it-operations-management/cloudhealth/saas/index.html |
| CloudHealth New UX overview | https://techdocs.broadcom.com/us/en/vmware-tanzu/cloudhealth/tanzu-cloudhealth/saas/tnz-cloudhealth/exploring-cloudhealth-new-experience-about-cloudhealth-new-user-experience.html |
| Cloudability / Apptio product | https://www.apptio.com/products/cloudability/ |
| Datadog Cloud Cost Management | https://docs.datadoghq.com/cloud_cost_management/ |
| Datadog Navigation Redesign | https://www.datadoghq.com/blog/datadog-navigation-redesign/ |
| Datadog Quick Nav Menu | https://www.datadoghq.com/blog/datadog-quick-nav-menu/ |
| AWS Cost Explorer UI | https://docs.aws.amazon.com/cost-management/latest/userguide/ce-exploring-data.html |
| AWS Cost Explorer New UI | https://aws.amazon.com/blogs/aws-cloud-financial-management/aws-cost-explorers-new-ui-and-common-use-cases/ |
| OptScale GitHub | https://github.com/hystax/optscale |
| OptScale Hystax | https://hystax.com/optscale/ |
| Cast.ai | https://cast.ai/ |
| Cast.ai Docs | https://docs.cast.ai/docs/cast-ai-anywhere-getting-started |
| Spot.io / Flexera | https://spot.io/ |
| Densify | https://www.densify.com/ |
| Densify Optimization Overview | https://densify.com/docs/Content/Densify_Com/Viewing_the_Optimization_Overview_Report.htm |
| Harness CCM | https://developer.harness.io/docs/cloud-cost-management/ |
| ComfyUI GitHub | https://github.com/comfy-org/ComfyUI |
| n8n docs | https://docs.n8n.io/ |
| n8n UI overview | https://docs.n8n.io/courses/level-one/chapter-1/ |
| Zapier UI updates | https://www.xray.tech/post/zapier-ui-updates-fall-2024 |
| Zapier Canvas guide | https://zapier.com/blog/zapier-canvas-guide/ |
| Make (Integromat) | https://make.com/ |
| Flowise GitHub | https://github.com/FlowiseAI/Flowise |
| Langflow docs | https://docs.langflow.org/ |
| Apache Airflow UI | https://airflow.apache.org/docs/apache-airflow/stable/ui.html |
| Dagster webserver | https://docs.dagster.io/guides/operate/webserver |
| Prefect UI docs | https://prefect-284-docs.netlify.app/ui/flow-runs/ |
| Prefect workspaces | https://docs.prefect.io/v3/manage/cloud/workspaces |
| Linear redesign | https://linear.app/now/how-we-redesigned-the-linear-ui |
| Linear docs | https://linear.app/docs/projects |
| Vercel dashboard | https://vercel.com/docs/projects |
| Vercel dashboard nav | https://vercel.com/changelog/new-dashboard-navigation-available |
| New Relic navigation | https://docs.newrelic.com/docs/new-relic-solutions/new-relic-one/new-navigation-transition-guide/ |
| New Relic new UI blog | https://newrelic.com/blog/news/new-ui-new-relic |
| Stripe dashboard basics | https://docs.stripe.com/dashboard/basics |
| Stripe dashboard 2024 update | https://support.stripe.com/questions/dashboard-update-may-2024 |
| G2 Vantage reviews | https://www.g2.com/products/vntg-inc-vantage/reviews |
| Gartner Cloudability reviews | https://www.gartner.com/reviews/product/ibm-cloudability |

---

*Research completed 2026-05-25. All sources accessed via public web, no authentication required.*
