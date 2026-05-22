# 🚀 STRATOS — START HERE
## Master Orchestrator for Claude Code

> You are Claude Code. You've just been handed this brief. This file tells you
> exactly where we're going, in what order, and how to execute. Read all four
> companion docs, then begin Phase 0. Build smart, build clean, build now.

---

## 📚 READING ORDER (do this first, 5 minutes)

1. **CLAUDE.md** — WHAT we build, the strategy, the stack, the bar.
2. **ENGINE.md** — the MATH. The five algorithms. The robot brain. The
   single most important rule: Python owns truth, Claude owns language.
3. **FOUNDATIONS.md** — the open-source supply chain + the license filter.
4. **HARVEST.md** — how to harvest dozens of repos and PROVE on real data.

Then update **PROJECT_STATE.md** after every work session.

---

## 🧭 THE ONE-PARAGRAPH MISSION

Build a real, working, AI-native cloud-cost-intelligence product — solo, in
the open, with no funding. Harvest the best ideas from open-source FinOps
repos (reimplemented clean, license-logged), fuse them into one pipeline no
single repo achieves, and PROVE it works by streaming real-dollar waste from
real public cloud datasets in real time. Get recognized. Then approach AWS,
real accounts, and seed — arriving with a finished product, not a pitch.

---

## 🗓️ THE 12-WEEK PLAN (3 phases of work → a public product)

### ─────────────────────────────────────────────
### PHASE 0 — FOUNDATION & HARVEST  (Week 1)
### ─────────────────────────────────────────────
**Goal:** Workspace stood up, repos harvested, skeletons running.

- [ ] Init `stratos/` monorepo: Next.js 14 web app + Python `engine/`.
- [ ] Wire Neon (Postgres) + Drizzle + Clerk + base config.
- [ ] Create empty `NOTICE` + `PROVENANCE.md` (auto-maintained from here on).
- [ ] You fill `_harvest/` with cloned repos (OptScale, Cloud Custodian,
      OpenCost, Infracost, Prophet, + others).
- [ ] Run the **Harvest Protocol** (HARVEST.md) on each repo:
      license-gate → recon → extract ideas → log provenance → test.
- [ ] FastAPI engine skeleton with a `/health` route deployed to Modal.
**Milestone:** `git push` → CI green → web skeleton + engine skeleton live.

### ─────────────────────────────────────────────
### PHASE 1 — THE BRAIN  (Weeks 2–4)
### ─────────────────────────────────────────────
**Goal:** The engine finds real waste in real public data.

**Week 2 — Core detection**
- [ ] `engine/idle.py` — geometric-mean idle scoring (ENGINE §2) + tests.
- [ ] `engine/rightsizing.py` — p95-headroom sizing + risk score (§3) + tests.
- [ ] Synthetic telemetry generator for testing (known-answer fixtures).

**Week 3 — Anomalies + proof harness**
- [ ] `engine/anomaly.py` — EWMA adaptive-band detection (§4) + tests.
- [ ] `proof/run_proof.py` — exactly as specced in HARVEST.md.
- [ ] Loader for the **Azure Public Dataset** sample.
- [ ] First real run: print the real waste headline number.

**Week 4 — Harden**
- [ ] Validate engine output against OptScale's behavior on same inputs.
- [ ] Edge cases: spiky workloads, short series, missing metrics.
- [ ] `engine/main.py` FastAPI: `/analyze` endpoint serving the fleet run.
**Milestone:** `python proof/run_proof.py` →
`>>> MONTHLY WASTE IDENTIFIED: $XXX,XXX <<<` on REAL VMs.

### ─────────────────────────────────────────────
### PHASE 2 — THE MONEY MATH & PIPELINE  (Weeks 5–7)
### ─────────────────────────────────────────────
**Goal:** Full pipeline + the proprietary commitment engine + reasoning.

**Week 5 — The crown jewel**
- [ ] `engine/commitment.py` — the **newsvendor** optimizer (ENGINE §5).
      `F(C*) = (r_od − r_c)/r_od`. Validate vs OptScale RI/SP module.
- [ ] `engine/forecast.py` — Holt-Winters spend cone with √t band (§6).

**Week 6 — Orchestration**
- [ ] The pipeline: ingest → engine → rank → store. One clean flow.
- [ ] BullMQ jobs for scheduled analysis runs.
- [ ] Persist opportunities to Postgres (raw math, never LLM-altered).

**Week 7 — Reasoning layer**
- [ ] `lib/ai/explain.ts` — Claude Sonnet turns engine numbers into human
      language. System prompt FORBIDS changing any figure (ENGINE §7).
- [ ] Confidence + risk narratives per opportunity.
**Milestone:** Raw trace in → ranked, dollar-quantified, human-explained
opportunities out. End to end. On real data.

### ─────────────────────────────────────────────
### PHASE 3 — THE COMMAND CENTER UI  (Weeks 8–10)
### ─────────────────────────────────────────────
**Goal:** It looks and feels like a funded company built it.

**Week 8 — Design system + shell**
- [ ] Tailwind theme tokens (CLAUDE.md palette). Dark-first.
- [ ] Dashboard shell: nav, layout, responsive (mobile = Pulse + Feed).
- [ ] shadcn/ui base components themed.

**Week 9 — The four zones (ENGINE §8)**
- [ ] **Zone A — The Pulse:** 4 live tiles (run-rate, waste, realized
      savings, forecast) each with sparkline + delta arrow.
- [ ] **Zone B — Opportunity Feed:** ranked cards, dollar headline first,
      confidence dots, "Why?" inline expand, Framer Motion stagger.
- [ ] **Zone C — Cost Map:** squarified treemap (d3-hierarchy), area ∝ cost,
      color = waste intensity (emerald→amber→red continuous scale).
- [ ] **Zone D — Forecast Cone:** line + √t confidence band, anomaly dots.

**Week 10 — Real-time + the live demo**
- [ ] `/proof/stream` SSE endpoint: engine walks trace, emits findings live.
- [ ] Wire it: waste counter climbs in real time, cards animate in.
- [ ] The public demo page: "Watch our engine analyze 12,000 real cloud VMs."
- [ ] Keyboard nav (j/k/x/?). Optimistic UI on dismiss.
**Milestone:** A stranger watches dollars of real waste climb live, with
Claude explaining each one. The "I need this" moment.

### ─────────────────────────────────────────────
### PHASE 4 — POLISH & GO PUBLIC  (Weeks 11–12)
### ─────────────────────────────────────────────
**Goal:** Self-serve, shippable, and launched in the open.

**Week 11 — Real-account readiness**
- [ ] AWS read-only IAM connection flow (for when real users arrive).
- [ ] Self-serve onboarding: connect → analyze → value in <10 min, no human.
- [ ] Weekly email digest (Resend) — the retention loop.
- [ ] Stripe live; Pro tier purchasable.

**Week 12 — Launch**
- [ ] Polish, performance, error states, empty states.
- [ ] Build-in-public posts shipping the engine internals as content.
- [ ] **Show HN:** "I built an AI FinOps engine — here's the newsvendor math
      and it just found $500K of waste in real public cloud data."
- [ ] Confirm NOTICE + PROVENANCE are complete and clean.
**Milestone:** Public, self-serve, license-clean, running our own code on
real data. A finished product — that happens to currently run on public
datasets. THEN we approach AWS, real accounts, and seed.

---

## 🎨 UI / UX — THE BUILD SPEC (deep)

**Layout (desktop):** a command center, not a report.
```
┌──────────── ZONE A: THE PULSE (live tiles) ────────────┐
│ run-rate ▲  waste ▲  realized savings ▲  forecast ▲     │
├───────────────────────────┬─────────────────────────────┤
│ ZONE B: OPPORTUNITY FEED   │ ZONE C: COST MAP (treemap)  │
│ ranked $ cards, scrollable │ area=cost, color=waste      │
│                            ├─────────────────────────────┤
│                            │ ZONE D: FORECAST CONE       │
└───────────────────────────┴─────────────────────────────┘
```

**The opportunity card (the atom of the product):**
```
┌──────────────────────────────────────────────┐
│ 💰 Save $4,180/mo    ●●●●○ 92% confidence      │
│ Right-size 3 m5.2xlarge → m5.large             │
│ Peaks at 38% CPU. Safe. One command.           │
│ [ Why? ]   [ How to apply ]   [ Dismiss ]      │
└──────────────────────────────────────────────┘
```
- Dollar impact is ALWAYS the headline. Lead with money.
- Confidence dots = inverted engine risk score.
- "Why?" expands inline (Claude narrative + the p95 chart). Never a modal.
- Cards stagger in at 40ms each (Framer Motion). The feed feels alive.

**Motion + interaction principles:**
- Optimistic UI: dismiss animates out instantly, syncs after.
- Keyboard-first: `j/k` move, `x` dismiss, `?` help. Engineers live here.
- Real-time: the waste counter ticks up as the engine streams findings.
- Mobile: Pulse strip + Feed only. The CTO checks the big number in a
  meeting and feels the dopamine.

**Visualization math that signals real engineering:**
- Treemap: `d3.treemapSquarify` (rectangles near-square for accurate area
  comparison). Waste color = `d3.scaleLinear([0,.5,1], [emerald,amber,red])`.
- Forecast band widens with √t — uncertainty compounds. A flat band is a lie.

---

## 🛠️ IMPLEMENTATION RULES FOR CLAUDE CODE

1. **Build the brain before the beauty.** Engine + proof harness first. A
   beautiful UI over a fake engine is a prototype. We don't build prototypes.
2. **Test every capability** against synthetic known-answer fixtures before
   trusting it on real data.
3. **Never let the LLM compute a number.** Python computes; Claude explains.
4. **Auto-log NOTICE + PROVENANCE** on every harvest. No exceptions.
5. **Never request AWS write permissions.** Read-only, always.
6. **Reimplement, don't copy.** Read the idea, rebuild it clean in our types.
7. **Update PROJECT_STATE.md** at the end of every session so the next
   session (or the next Claude) picks up instantly.
8. **Commit small, commit often.** Working code over perfect code.

---

## ▶️ FIRST COMMAND

> "Read START_HERE.md, CLAUDE.md, ENGINE.md, FOUNDATIONS.md, HARVEST.md.
> Begin Phase 0: scaffold the stratos/ monorepo (Next.js web + Python
> engine), wire Neon + Drizzle + Clerk, create empty NOTICE and
> PROVENANCE.md, and stand up the FastAPI engine skeleton with /health.
> Then update PROJECT_STATE.md and tell me what to put in _harvest/ first."

Let's build.
