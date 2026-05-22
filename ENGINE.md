# STRATOS — ENGINE.md
## The Robot Brain: Algorithms, Math, and AI Integration

> This is the technical core. CLAUDE.md describes *what* we build.
> This describes *how the intelligence actually works* — the math, the
> models, and the code that turns raw cloud telemetry into dollars saved.
>
> Positioning: A global product. No HQ. No country. No waitlist.
> Someone is building real infrastructure right now, in public, and it works.

---

## 0. THE CORE INSIGHT

Cloud cost tools fail because they do one of two dumb things:
1. Show you a bill (dashboards that don't decide anything), or
2. Spit out generic "you might save money" with no math behind it.

Stratos is different because it has a **three-brain architecture**:

```
   ┌─────────────────────────────────────────────────────────┐
   │  BRAIN 1: INGESTION (JavaScript / Node)                   │
   │  Pulls raw telemetry from the cloud. Normalizes to        │
   │  time series. Stores in Postgres. Orchestrates jobs.      │
   └───────────────────────────┬───────────────────────────────┘
                               │  structured time series
   ┌───────────────────────────▼───────────────────────────────┐
   │  BRAIN 2: THE ANALYTICAL ENGINE (Python) ← THE REAL BRAIN  │
   │  Statistics. Optimization. Forecasting. This is where the  │
   │  math lives. numpy / scipy / statsmodels / PuLP / Prophet. │
   │  Produces ranked, quantified, risk-scored opportunities.   │
   └───────────────────────────┬───────────────────────────────┘
                               │  scored opportunities (JSON)
   ┌───────────────────────────▼───────────────────────────────┐
   │  BRAIN 3: REASONING LAYER (Claude)                         │
   │  Does NOT do math. Takes the engine's numbers and turns    │
   │  them into human language, risk narratives, and priority   │
   │  ordering a CTO can act on in 10 seconds.                  │
   └───────────────────────────────────────────────────────────┘
```

**The key architectural decision: the LLM never computes savings.**
Python computes the truth. Claude explains the truth. If you let an LLM
do the arithmetic, it will hallucinate a number and you will lose trust
the first time a customer checks your math against their AWS bill.

---

## 1. THE DATA MODEL (what we actually pull)

For every connected account, we pull and normalize four streams:

| Stream | Source | Granularity | Used for |
|---|---|---|---|
| Spend | Cost & Usage Report (CUR) | Hourly, per resource | Attribution, anomalies |
| Utilization | CloudWatch metrics | 5-min datapoints | Right-sizing, idle |
| Inventory | EC2/RDS/S3/EBS describe APIs | Snapshot | Zombie detection |
| Pricing | AWS Price List API | Static | Savings math |

Each resource becomes a **time series object**:

```python
@dataclass
class ResourceTelemetry:
    resource_id: str
    service: str              # "EC2", "RDS", "S3", ...
    resource_type: str        # "m5.xlarge", "db.r5.large", ...
    region: str
    cpu: np.ndarray           # 5-min datapoints, ~4032 over 14 days
    mem: np.ndarray | None    # only if CloudWatch agent installed
    net_in: np.ndarray
    net_out: np.ndarray
    iops: np.ndarray
    hourly_cost: float        # current on-demand rate
    launch_time: datetime
    tags: dict[str, str]
```

This is the atomic unit the entire engine operates on.

---

## 2. ALGORITHM ONE — IDLE DETECTION

**The question:** is this resource doing nothing while costing money?

A resource is idle if its *peak* utilization over the window is below a
threshold. We don't use averages — averages hide spiky workloads. We use
high percentiles so we never recommend killing something that bursts.

```python
def idle_score(t: ResourceTelemetry, idle_ceiling=0.05) -> dict:
    """
    Returns an idle confidence score in [0, 1].
    A score near 1 means 'almost certainly idle, safe to kill.'
    """
    p99 = np.percentile(t.cpu, 99) / 100.0      # peak demand
    net_peak = np.percentile(t.net_in + t.net_out, 99)

    # Even a "busy" CPU resource might just be doing background noise.
    # Require BOTH compute and network to be near-zero.
    cpu_idle = max(0.0, 1 - p99 / idle_ceiling)
    net_idle = 1.0 if net_peak < 1_000 else 0.0   # < 1KB/s peak = no traffic

    # Confidence = geometric mean (both must be low, not just one)
    score = (cpu_idle * net_idle) ** 0.5
    return {
        "resource_id": t.resource_id,
        "idle_score": round(score, 3),
        "peak_cpu_pct": round(p99 * 100, 2),
        "monthly_cost": round(t.hourly_cost * 730, 2),
        "monthly_savings_if_killed": round(t.hourly_cost * 730 * score, 2),
    }
```

**The math that matters:** geometric mean, not arithmetic. If CPU is idle
(score 0.9) but network is active (score 0.0), the arithmetic mean says
"45% idle" — dangerous. The geometric mean says 0.0 — correctly refuses
to recommend killing something that's still serving traffic.

---

## 3. ALGORITHM TWO — RIGHT-SIZING

**The question:** this resource is used, but is it the wrong size?

We size to the **95th percentile of demand plus a headroom buffer**, then
find the cheapest instance type that still keeps p95 under a target
utilization. p95 (not max) so a single freak spike doesn't force you to
overpay forever; headroom so you never run hot.

```python
# Simplified instance catalog (real version pulls from Price List API)
CATALOG = {
    "t3.medium": {"vcpu": 2, "mem": 4,  "price": 0.0416},
    "t3.large":  {"vcpu": 2, "mem": 8,  "price": 0.0832},
    "m5.large":  {"vcpu": 2, "mem": 8,  "price": 0.096},
    "m5.xlarge": {"vcpu": 4, "mem": 16, "price": 0.192},
    "m5.2xlarge":{"vcpu": 8, "mem": 32, "price": 0.384},
}

def recommend_rightsizing(t, target_util=0.65, headroom=1.0):
    cur = CATALOG[t.resource_type]
    p95_cpu = np.percentile(t.cpu, 95) / 100.0

    # Convert % utilization to absolute vCPU-equivalent demand
    demand_vcpu = p95_cpu * cur["vcpu"] * headroom

    # Find the cheapest type where demand sits at/below target_util
    options = [
        (spec["price"], itype)
        for itype, spec in CATALOG.items()
        if spec["vcpu"] * target_util >= demand_vcpu
        and spec["mem"] >= cur["mem"] * 0.5   # don't starve memory
    ]
    if not options:
        return None

    best_price, best_type = min(options)
    if best_price >= cur["price"]:
        return None  # already optimally sized

    monthly_savings = (cur["price"] - best_price) * 730
    return {
        "resource_id": t.resource_id,
        "from_type": t.resource_type,
        "to_type": best_type,
        "p95_cpu_pct": round(p95_cpu * 100, 2),
        "monthly_savings": round(monthly_savings, 2),
        # risk score: how close we'd run to the ceiling after resizing
        "risk": round(demand_vcpu / (CATALOG[best_type]["vcpu"]), 3),
    }
```

**Risk scoring** is the trust feature. Every recommendation ships with how
close the resized instance would run to its limit. risk = 0.4 means after
downsizing it peaks at 40% — safe. risk = 0.85 means it'd run hot — we flag
it amber and let the human decide.

---

## 4. ALGORITHM THREE — ANOMALY DETECTION (cost spikes)

**The question:** did spend jump in a way that isn't normal?

We use **EWMA (exponentially weighted moving average) with an adaptive
standard deviation band.** It learns the normal rhythm of your spend and
flags days that break out of the band — without needing to be retrained,
without seasonality assumptions baked wrong.

```python
def detect_cost_anomalies(daily_cost: np.ndarray, alpha=0.3, k=3.0):
    """
    EWMA forecast + EW standard deviation band.
    Flags any day where actual spend deviates > k sigma from forecast.
    """
    forecast = daily_cost[0]
    ew_var = 0.0
    anomalies = []

    for day in range(1, len(daily_cost)):
        actual = daily_cost[day]
        resid = actual - forecast
        std = np.sqrt(ew_var)

        if std > 0 and abs(resid) > k * std:
            anomalies.append({
                "day_index": day,
                "actual": round(actual, 2),
                "expected": round(forecast, 2),
                "overspend": round(resid, 2),
                "sigma": round(resid / std, 2),
            })

        # update the model AFTER scoring (no lookahead leakage)
        forecast = alpha * actual + (1 - alpha) * forecast
        ew_var   = alpha * resid**2 + (1 - alpha) * ew_var

    return anomalies
```

**Why this and not Prophet for spikes:** Prophet is for *forecasting the
future*. EWMA is for *catching the present*. We use both — different jobs.
The "no lookahead leakage" comment matters: we score the day using only
the model state from *before* that day, so we never cheat by peeking.

---

## 5. ALGORITHM FOUR — COMMITMENT OPTIMIZATION (the crown jewel)

This is where the real money is, and where most tools wave their hands.

**The question:** how much should you commit to a Savings Plan / Reserved
capacity? Commit too little → you overpay on-demand. Commit too much →
you pay for capacity you don't use. There's a mathematically optimal point.

**This is the Newsvendor Problem.** Same math that decides how many
newspapers a vendor should stock. Here's the derivation:

You commit to a constant capacity level `C`. For each hour with usage `U`:

```
cost(hour) = C · r_committed  +  max(0, U − C) · r_ondemand
             └── you pay this ──┘   └── overflow at full price ──┘
```

Expected cost over the window:

```
E[cost] = C · r_c  +  r_od · E[max(0, U − C)]
```

Minimize over C. Take the derivative and set to zero:

```
d/dC E[cost] = r_c − r_od · P(U > C) = 0
```

Solving gives the **optimal commitment quantile**:

```
P(U > C*) = r_c / r_od
F(C*)     = (r_od − r_c) / r_od        ← the critical quantile
C*        = F⁻¹( (r_od − r_c) / r_od )
```

In plain English: **commit to the usage percentile equal to your savings
ratio.** If on-demand is $1.00/hr and the committed rate is $0.60/hr, your
savings ratio is 40%, so you commit to the 40th percentile of your hourly
usage. Bigger discount → commit more aggressively. This is provably optimal.

```python
def optimal_commitment(hourly_usage: np.ndarray,
                       r_ondemand: float,
                       r_committed: float):
    """
    Newsvendor-optimal commitment level for a Savings Plan.
    Returns the exact commit level and the guaranteed savings.
    """
    q_star = (r_ondemand - r_committed) / r_ondemand
    c_star = np.quantile(hourly_usage, q_star)

    # Cost under pure on-demand
    cost_od = hourly_usage.sum() * r_ondemand

    # Cost under optimal commitment
    n = len(hourly_usage)
    overflow = np.maximum(0, hourly_usage - c_star)
    cost_commit = (n * c_star * r_committed) + (overflow.sum() * r_ondemand)

    monthly_factor = 730 / (n / 1)  # normalize window to a month
    return {
        "commit_level": round(float(c_star), 4),
        "critical_quantile": round(q_star, 3),
        "current_monthly": round(cost_od * monthly_factor, 2),
        "optimized_monthly": round(cost_commit * monthly_factor, 2),
        "monthly_savings": round((cost_od - cost_commit) * monthly_factor, 2),
        "savings_pct": round((1 - cost_commit / cost_od) * 100, 1),
    }
```

When a customer sees "commit to exactly 142 compute units, save $4,180/mo,
here's the math" — and it matches their bill — you have won. This single
function is more valuable than the entire dashboard.

---

## 6. ALGORITHM FIVE — FORECASTING (the spend cone)

**The question:** where is this bill going next quarter?

We decompose the cost series into trend + weekly seasonality + residual and
project forward with a confidence interval. Lightweight statsmodels Holt-
Winters is enough at MVP; swap for Prophet when seasonality gets complex.

```python
from statsmodels.tsa.holtwinters import ExponentialSmoothing

def forecast_spend(daily_cost: np.ndarray, horizon=90):
    model = ExponentialSmoothing(
        daily_cost,
        trend="add",
        seasonal="add",
        seasonal_periods=7,   # weekly rhythm
    ).fit()

    forecast = model.forecast(horizon)
    resid_std = np.std(model.resid)

    # 80% confidence cone widens with the square root of time
    z = 1.28  # 80% CI
    band = z * resid_std * np.sqrt(np.arange(1, horizon + 1))

    return {
        "forecast": forecast.round(2).tolist(),
        "upper": (forecast + band).round(2).tolist(),
        "lower": np.maximum(0, forecast - band).round(2).tolist(),
        "projected_quarter_total": round(float(forecast.sum()), 2),
    }
```

**The √t band** is the detail that signals real engineering: uncertainty
compounds over time, so the forecast cone *fans out* the further you look.
A flat band would be a lie. Customers feel the difference even if they
can't name it.

---

## 7. HOW THE THREE BRAINS TALK

### Brain 1 → Brain 2 (Node calls Python)

Python engine runs as a stateless FastAPI service (deploy free on Modal,
Railway, or Render). Next.js hits it over HTTP.

```python
# engine/main.py — the Python service
from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np

app = FastAPI()

class AnalyzeRequest(BaseModel):
    resources: list[dict]      # serialized telemetry
    pricing: dict

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    opportunities = []
    for r in req.resources:
        t = deserialize(r)
        if (idle := idle_score(t))["idle_score"] > 0.7:
            opportunities.append({"kind": "idle", **idle})
        if (rs := recommend_rightsizing(t)):
            opportunities.append({"kind": "rightsize", **rs})

    # commitment + anomalies operate on aggregated series
    opportunities.append({"kind": "commitment",
                          **optimal_commitment(...)})

    # rank by dollar impact, descending
    opportunities.sort(key=lambda o: o.get("monthly_savings", 0),
                       reverse=True)
    return {"opportunities": opportunities}
```

```typescript
// lib/engine/client.ts — Next.js side
export async function runAnalysis(accountId: string) {
  const telemetry = await loadTelemetry(accountId); // from Postgres

  const res = await fetch(`${process.env.ENGINE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resources: telemetry, pricing: await getPricing() }),
  });

  const { opportunities } = await res.json();
  await persistOpportunities(accountId, opportunities); // store raw math
  return opportunities;
}
```

### Brain 2 → Brain 3 (Engine output → Claude reasoning)

Claude receives the **already-computed numbers** and writes the human layer.
It is explicitly told NOT to change any figure.

```typescript
// lib/ai/explain.ts
import Anthropic from "@anthropic-ai/sdk";
const claude = new Anthropic();

export async function explainOpportunities(opps: Opportunity[]) {
  const msg = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    system: `You are a FinOps advisor. You are given pre-computed cost
optimization opportunities with exact dollar figures and risk scores.

ABSOLUTE RULES:
- NEVER alter, recompute, or estimate any number. Use the figures verbatim.
- For each opportunity, write: (1) one-line plain-English summary,
  (2) the concrete action, (3) the risk in human terms.
- Order by impact, but down-rank anything with risk > 0.8.
- Be terse. A CTO reads this in 10 seconds. No fluff.`,
    messages: [{
      role: "user",
      content: `Opportunities (JSON):\n${JSON.stringify(opps, null, 2)}`,
    }],
  });
  return msg.content;
}
```

This is the whole trick: **Python owns truth, Claude owns language.** Wire
it the other way and you ship a hallucination machine.

---

## 8. THE UI / UX — DEPTH, NOT DECORATION

The interface is a **command center**, not a report. Dark-first, data-dense,
every pixel earns its place. Three zones:

### Zone A — The Pulse (top strip)
Four live tiles, each a number + sparkline + delta-vs-last-period:
- **Monthly run-rate** — extrapolated from current burn
- **Waste identified** — sum of all open opportunities, in $
- **Realized savings** — cumulative, the dopamine number
- **Forecast quarter** — from the spend cone

Each sparkline is a 30-point mini line chart. The delta arrow is green/red.
This strip is the first thing seen and the reason people come back daily.

### Zone B — The Opportunity Feed (left, scrollable)
Ranked cards. Each card:

```
┌────────────────────────────────────────────────┐
│  💰 Save $4,180/mo   ●●●●○ 92% confidence        │
│  Right-size 3 m5.2xlarge → m5.large              │
│  Peaks at 38% CPU. Safe. One command.            │
│  [ Why? ]  [ How to apply ]  [ Dismiss ]         │
└────────────────────────────────────────────────┘
```

- Dollar impact is the headline — always lead with money.
- Confidence dots come from the engine's risk score, inverted.
- "Why?" expands the Claude narrative + the raw p95/percentile chart.
- Cards animate in with Framer Motion stagger (40ms each) — feels alive.

### Zone C — The Cost Map (right, the hero visual)
A **treemap** of spend: every rectangle is a service/resource, area ∝ cost,
color = waste intensity (green = efficient, amber → red = wasteful). One
glance shows where the money *and* the waste live.

**The visualization math (squarified treemap):** rectangles are laid out to
minimize aspect ratio (closest to squares) so the eye can compare areas
accurately. Library: `d3-hierarchy`'s `treemapSquarify`. The waste color is
a continuous scale:

```typescript
// waste 0.0 → emerald, 0.5 → amber, 1.0 → red
const wasteColor = d3.scaleLinear<string>()
  .domain([0, 0.5, 1])
  .range(["#10B981", "#F59E0B", "#EF4444"]);
```

### Zone D — The Forecast Cone (bottom)
The spend forecast as a line with a shaded confidence band that fans out
over the horizon (the √t band from §6). Anomaly days from §4 are marked
with pulsing dots. Hovering a dot shows "spent $X, expected $Y, +Zσ."

### Interaction principles
- **Optimistic UI**: dismiss a card → it animates out instantly, syncs after.
- **Zero modal overload**: "Why?" expands inline, never a popup.
- **Keyboard-first**: `j/k` to move cards, `x` to dismiss, `?` for help.
  Engineers live on the keyboard. This is a love letter to them.
- **Mobile**: the Pulse strip + Opportunity Feed only; the CTO checks the
  big savings number from their phone in a meeting and feels the dopamine.

---

## 9. THE 3-MONTH BUILD — REAL PRODUCT, NO WAITLIST

No "join the list." A working tool a stranger can connect and get value from.

### Month 1 — The Brain Works End to End
- Node ingestion: AWS read-only role, CUR + CloudWatch → Postgres
- Python engine: idle + right-sizing + anomaly, served via FastAPI
- One real AWS account (yours / a friend's) flowing through it
- Bare dashboard showing real opportunities with real dollars
- **Milestone: it finds real money in a real account.**

### Month 2 — The Money Algorithm + The Interface
- Commitment optimization (the newsvendor engine) — the headline feature
- Forecast cone
- Full command-center UI: Pulse, Feed, Cost Map, Forecast
- Claude reasoning layer wired in
- **Milestone: it looks and feels like a funded company built it.**

### Month 3 — Polish, Public, Self-Serve
- Self-serve onboarding: anyone connects in <10 min, no human in loop
- Weekly email digest (Resend) — the retention loop
- Stripe live, the Pro tier purchasable
- Build-in-public: ship the engine internals as technical posts
- Show HN: "I built an AI FinOps engine — here's the newsvendor math"
- **Milestone: a stranger connects an account and pays, with zero contact.**

---

## 10. THE PYTHON DEPENDENCY STACK

```
numpy            # all the array math
scipy            # optimization, stats
statsmodels      # Holt-Winters forecasting
pandas           # time series wrangling
prophet          # (month 2+) advanced seasonality
PuLP             # (enterprise) multi-constraint commitment LP
fastapi          # the engine service
uvicorn          # ASGI server
pydantic         # request validation
anthropic        # Claude reasoning calls
boto3            # AWS data pull (or do this in Node — pick one)
```

Deploy the engine on Modal (serverless Python, generous free tier, scales to
zero — perfect for a solo zero-budget build). Next.js stays on Vercel. They
talk over HTTPS. Total infra cost until first customer: roughly nothing.

---

## 11. WHY THIS IS DEFENSIBLE (the long game)

The algorithms above are the *product*. The **moat** is what accumulates:

Every connected account teaches the engine what "normal" looks like for a
given workload shape. After 100 accounts, you can tell a new customer:
*"SaaS companies with your traffic profile run 23% leaner on compute — here's
exactly where you're the outlier."* That benchmark intelligence is something
no single customer can compute for themselves, and it compounds with every
new account. That's the Datadog flywheel. The math gets you in the door; the
accumulated benchmarks are why nobody can catch you.

---

## FIRST COMMAND TO CLAUDE CODE

> Read CLAUDE.md and ENGINE.md. We are building Stratos.
> Start with Month 1: scaffold the Next.js app, set up the Python FastAPI
> engine service skeleton, and implement `idle_score` and
> `recommend_rightsizing` with unit tests against synthetic telemetry.
> Build the brain before the beauty.
