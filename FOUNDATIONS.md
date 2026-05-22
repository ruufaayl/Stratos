# STRATOS — FOUNDATIONS.md
## The Open-Source Ecosystem We Stand On

> Strategy: We do not invent the analytics from zero. Every serious infra
> company is a graph of open-source primitives held together by proprietary
> glue. We assemble best-in-class, license-clean repos into one pipeline,
> overhaul what needs overhauling, and our moat is the orchestration + the
> accumulated benchmark data — not the individual pieces.
>
> Read this WITH CLAUDE.md and ENGINE.md. This is the supply chain.

---

## ⚠️ STEP ZERO — THE LICENSE FILTER (do this before anything)

This is the single thing that separates people who know what they're doing
from people who get destroyed in due diligence. You are building a
proprietary SaaS you intend to raise money on. The license of every repo you
touch determines whether you can legally build on it.

**The rule:**

| License | Can build proprietary SaaS on it? | Verdict |
|---|---|---|
| MIT / BSD / Apache 2.0 | Yes — use, modify, keep your code private | ✅ GREEN |
| MPL 2.0 / LGPL | Yes, with file-level disclosure of changes | 🟡 CAREFUL |
| GPL / AGPL | No — copyleft can force you to open YOUR source | 🔴 STOP |

AGPL is the landmine. If you link AGPL code into your SaaS, you can be
required to release your entire proprietary codebase. This has killed real
acquisitions. **Before vendoring any repo, run:**

```bash
# check the license of any repo before you touch it
gh repo view OWNER/REPO --json licenseInfo
# or just look — the LICENSE file is in the root
```

Everything marked GREEN below is verified safe. Everything marked VERIFY,
you confirm yourself before merging. No exceptions.

---

## 🗺️ THE PIPELINE → REPO MAP

Our pipeline from ENGINE.md has stages. Each stage has a best-in-class
open-source foundation. Here's the assembled supply chain:

```
┌──────────────────────────────────────────────────────────────────┐
│ STAGE 1: INVENTORY & INGESTION                                     │
│   What: pull every resource + cost + metric from the cloud         │
│   Foundation: Steampipe (query cloud as SQL) [VERIFY license]      │
│   Backup: raw boto3 / AWS SDK (always GREEN)                       │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 2: COST ALLOCATION & VISIBILITY                              │
│   What: break spend down by service/team/tag, K8s cost             │
│   Foundation: OpenCost (CNCF, Apache 2.0) ✅                       │
│   Reference: OptScale's allocation engine (Apache 2.0) ✅          │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 3: THE ANALYTICS BRAIN (waste, rightsizing, anomalies)       │
│   What: the actual math from ENGINE.md                             │
│   Foundation: OptScale rightsizing engine (Apache 2.0) ✅          │
│   Libraries: numpy / scipy / statsmodels / Prophet (all GREEN)     │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 4: COMMITMENT OPTIMIZATION (the newsvendor money math)       │
│   What: optimal Savings Plan / RI coverage                         │
│   Foundation: OUR code (ENGINE.md §5) — this is proprietary edge   │
│   Reference: OptScale RI/SP module for validation (Apache 2.0) ✅  │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 5: REMEDIATION & GOVERNANCE (actually fix things)            │
│   What: kill zombies, schedule off-hours, enforce policy           │
│   Foundation: Cloud Custodian / c7n (CNCF, Apache 2.0) ✅          │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 6: IaC PRE-SPEND ESTIMATION                                  │
│   What: cost a change BEFORE it's deployed (Terraform)             │
│   Foundation: Infracost (Apache 2.0) ✅                            │
├──────────────────────────────────────────────────────────────────┤
│ STAGE 7: REASONING + INTERFACE                                     │
│   What: Claude explains, the command center renders                │
│   Foundation: OUR code — the proprietary glue + UX                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📦 THE REPOS — VERIFIED DETAILS

### 1. OptScale — `hystax/optscale` ✅ Apache 2.0 (VERIFIED)
**The biggest unlock.** A complete, production FinOps platform — used by
PwC, Nokia, DHL, Airbus — fully open under Apache 2.0. Supports AWS, Azure,
GCP, Alibaba, Kubernetes. Has anomaly detection, RI/SP optimization, and
what they call "one of the best rightsizing engines."

**How we use it:** This is our REFERENCE ARCHITECTURE, not a dependency to
swallow whole. We study how their rightsizing engine handles edge cases our
ENGINE.md math doesn't yet cover, lift the patterns (legal under Apache 2.0),
and rebuild leaner inside our Python engine. Don't fork the whole monolith —
extract the intelligence.

### 2. Cloud Custodian — `cloud-custodian/cloud-custodian` ✅ Apache 2.0
CNCF Incubating project. A YAML rule engine that actually *acts* on cloud
resources — kill idle instances, schedule off-hours, enforce tagging, delete
zombie volumes. Multi-cloud (AWS/Azure/GCP/K8s).

**How we use it:** This becomes our REMEDIATION EXECUTION LAYER (Stage 5).
Our engine decides *what* to fix; Custodian's policy engine executes it
safely. We wrap it — generate Custodian policies programmatically from our
recommendations, so the user clicks "apply" and Custodian does the work.
This saves us from writing dangerous resource-mutation code ourselves.

### 3. OpenCost — `opencost/opencost` ✅ Apache 2.0
CNCF project, the open standard for Kubernetes cost monitoring. Real-time
cost allocation down to the pod/namespace/label.

**How we use it:** When we add Kubernetes support (Phase 2), this is the
allocation foundation. Don't build K8s cost attribution from scratch — it's
a solved problem and the solution is Apache 2.0.

### 4. Infracost — `infracost/infracost` ✅ Apache 2.0
Shows the cost of a Terraform change before you deploy it. CLI + CI
integration.

**How we use it:** Stage 6, the "shift-left" feature. A killer differentiator
later: tell a team their PR will add $800/mo *before* they merge it. Wrap the
Infracost CLI, surface the diff in our UI.

### 5. Steampipe — `turbot/steampipe` 🟡 VERIFY LICENSE FIRST
Query live cloud APIs as if they were SQL tables. Incredible for inventory —
`select * from aws_ec2_instance where cpu_utilization < 5` is a real query.
**Caution:** the core engine and the plugins may have different licenses
(core has been AGPL-flavored). VERIFY before vendoring into the SaaS. If the
core is AGPL, use it only as an external CLI tool you shell out to (process
isolation), never linked into your code — or just use boto3 directly.

### 6. Komiser — `tailwarden/komiser` 🟡 VERIFY LICENSE FIRST
Multi-cloud resource inventory + cost visibility dashboard. Was MIT, but
licensing shifted after the Tailwarden acquisition. VERIFY current license
before any use. Good for pattern-study regardless.

### 7. The Math Libraries — all ✅ GREEN
```
numpy, scipy       BSD            the array + optimization math
statsmodels        BSD            Holt-Winters forecasting
pandas             BSD            time series wrangling
prophet            MIT            advanced seasonality (Meta)
PuLP               MIT            linear programming for commitment LP
scikit-learn       BSD            clustering for workload fingerprinting
```
These are the actual engine internals. All permissive. Use freely.

---

## 🔧 THE MERGE / OVERHAUL ARCHITECTURE

"Download them, merge them, overhaul them" — done right, this is NOT pasting
five codebases into one repo. That creates an unmaintainable Frankenstein
that dies in month two. Here's how real infra companies actually do it:

### Pattern A — VENDOR (use the code directly)
For permissive libraries that do one job well (numpy, Prophet, Infracost
CLI), you import or shell out to them. Zero modification. They're tools in
your toolbox.

### Pattern B — WRAP (orchestrate an external engine)
For larger Apache-2.0 systems that *act* (Cloud Custodian), you don't
absorb the code — you drive it from outside. Our engine generates its config,
calls it, reads its output. Process isolation also sidesteps license risk.

```python
# our engine turns a recommendation into a Cloud Custodian policy
def to_custodian_policy(rec: dict) -> dict:
    if rec["kind"] == "idle":
        return {
            "policies": [{
                "name": f"stratos-stop-idle-{rec['resource_id']}",
                "resource": "aws.ec2",
                "filters": [{"InstanceId": rec["resource_id"]}],
                "actions": [{"type": "stop"}],   # safe: stop, not terminate
            }]
        }
    # ... other recommendation kinds
```

### Pattern C — EXTRACT (study the reference, rebuild leaner)
For the crown-jewel logic in big platforms (OptScale's rightsizing edge
cases), Apache 2.0 lets you read the source, learn the approach, and write
your own cleaner version tuned to our data model. You keep the intelligence,
shed the monolith's weight. This is where our ENGINE.md math gets battle-
hardened against patterns someone already discovered.

### The result — our actual repo
```
stratos/
├── apps/web/            # Next.js — OUR proprietary UI (Pattern: original)
├── engine/             # Python brain — OUR math, hardened via Pattern C
│   └── vendor/         # permissive libs, Pattern A
├── integrations/
│   ├── custodian/      # Pattern B wrapper around Cloud Custodian
│   ├── infracost/      # Pattern B wrapper around Infracost CLI
│   └── opencost/       # Pattern B, Phase 2 (K8s)
└── NOTICE              # attribution for every Apache-2.0 piece (required!)
```

**The NOTICE file is mandatory.** Apache 2.0 requires you to attribute. It's
one file, it costs you nothing, and skipping it is the kind of sloppiness
that shows up in diligence. Generate it from day one.

---

## 🧠 WHY THIS WINS WITH NO MONEY

We get, for free and legally:
- A reference rightsizing engine used by the Fortune 500 (OptScale)
- A battle-tested multi-cloud remediation engine (Cloud Custodian)
- The CNCF standard for K8s cost (OpenCost)
- IaC pre-spend estimation (Infracost)
- Every statistical primitive we need (numpy/scipy/statsmodels/Prophet)

What's left for us to build is exactly the part that's defensible:
1. The **orchestration pipeline** that makes these pieces one product
2. The **commitment newsvendor math** (our proprietary money-maker)
3. The **Claude reasoning layer** (truth → human language)
4. The **command-center UX** that engineers actually love
5. The **cross-account benchmark data** that compounds into a moat

A solo founder can't out-engineer a funded team on primitives. But a solo
founder who *assembles the best primitives* and writes the smartest glue can
ship something a funded team would take a year to match. That's the whole
play. Thinking big from above the clouds — but standing on a mountain other
people already built.

---

## 🚀 FIRST MOVES FOR CLAUDE CODE

1. Run the license check on Steampipe + Komiser. Decide GREEN or shell-out.
2. Clone OptScale. Read `optscale/.../rightsizing` — extract the edge-case
   logic our ENGINE.md §3 doesn't handle yet. Rebuild leaner in `engine/`.
3. Clone Cloud Custodian. Build the `integrations/custodian/` wrapper +
   the `to_custodian_policy` translator from above.
4. Vendor numpy/scipy/statsmodels/Prophet into the Python engine.
5. Generate the NOTICE file with attribution for every Apache-2.0 dependency.
6. THEN build the pipeline that chains: ingest → engine → reason → render.

> Command: "Read CLAUDE.md, ENGINE.md, FOUNDATIONS.md. Execute the First
> Moves in order. Start with the license check and the OptShape rightsizing
> extraction. Build the supply chain before the product."
