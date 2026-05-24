# Stratos — Brand Identity Design Spec

**Status:** Locked — ready for design system implementation
**Owner:** Stratos (solo)
**Date:** 2026-05-24
**Supersedes:** the dark-indigo defaults in `apps/web` and the lightweight notes in `CLAUDE.md` § Design Language

---

## 1. Why this exists

Stratos is moving from "a proof page that works" to "the dashboard a CTO leaves open all day."
That requires a brand identity strong enough to:

1. Make a CTO trust the numbers within five seconds of landing.
2. Hold up next to New Relic, Datadog, Vercel, Linear in a side-by-side screenshot.
3. Scale across ~200 screens (marketing site + dashboard + settings + docs + email) without
   drifting into inconsistency.

Everything below is the *contract* the design system and every subsequent screen must honour.

---

## 2. Primary audience (locked)

**The CTO / VP Engineering of a mid-to-late-stage company spending $50K–$5M/month on cloud.**

Secondary, in priority order: Platform / SRE lead → FinOps practitioner → curious staff engineer.

We are explicitly **not** designing for:

- Finance / accounting (they read PDFs, not dashboards).
- Solo developers on a $20/mo Hobby plan (we are not a Vercel-tier consumer product).
- C-suite who never log in (they get the weekly digest email, not a dashboard).

**Consequences for design:**

- Dense, scannable, terminal-adjacent. The CTO opens 12 tabs — ours must be the one they can read at a glance.
- "Show me the number, then show me the reasoning." Never bury the dollar figure.
- No marketing-tutorial overlays. No empty-state hand-holding for power users.
- Dark-first is non-negotiable. Engineers work at night.

---

## 3. Emotional position (locked)

**A — Calm authority.** New Relic, Datadog, Splunk territory.

Not "decisive action" (PagerDuty's alert-fatigue palette), not "premium clarity" (Stripe's
boardroom whitespace), not "intelligence layer" (Palantir's deliberately-opaque density).

**What this means in practice:**

| Quality | Yes | No |
|---|---|---|
| Voice | "Found 226,121 opportunities." | "🚨 URGENT — Click now!" |
| Motion | Confident, ~200–400ms eased | Bouncy, springy, playful |
| Density | High but breathing | Cramped or oversimplified |
| Color | Semantic, restrained | Decorative, gradient-heavy |
| Type | One sans + one mono, tight | Mixed display fonts |

The product should feel like the monitoring-room screen a senior on-call would have up at 2am
— legible, never panicked, never trying to entertain.

---

## 4. Palette (locked: B — Stratos × New Relic)

Semantic, not decorative. Every colour means one thing and only that thing.

### 4.1 Brand & UI

| Token | Hex | Use |
|---|---|---|
| `bg.canvas` | `#0A0E1A` | Page background |
| `bg.surface` | `#0F1626` | Cards, panels |
| `bg.elevated` | `#141B2E` | Modals, popovers, hover state on cards |
| `bg.sunken` | `#050811` | Code blocks, inset wells |
| `border.subtle` | `#1C2333` | Default card border |
| `border.strong` | `#2A3349` | Active / focused border |
| `text.primary` | `#F1F5F9` | Headings, KPI numbers |
| `text.secondary` | `#CBD5E1` | Body |
| `text.muted` | `#94A3B8` | Labels, metadata |
| `text.faint` | `#64748B` | Disabled, captions |

### 4.2 Semantic (the meaning carriers)

| Token | Hex | Means | Never used for |
|---|---|---|---|
| `intel.500` | `#6366F1` | Indigo — Stratos intelligence, AI, analysis | Money, alerts, success |
| `intel.300` | `#A5B4FC` | Light indigo — intelligence tags, secondary | — |
| `intel.950` | `#1E1B4B` | Indigo well — intelligence chip background | — |
| `savings.500` | `#00AC69` | Green — money saved, healthy, "good signal" | Anything that isn't $ saved |
| `savings.300` | `#34D399` | Light green — sparklines, deltas | — |
| `savings.950` | `#052E1C` | Green well — savings chip background | — |
| `waste.500` | `#EF4444` | Red — money burning, severity, "bad signal" | Anything that isn't $ wasted |
| `waste.300` | `#FCA5A5` | Light red — text on red wells | — |
| `waste.950` | `#3B1212` | Red well — waste chip background | — |
| `risk.500` | `#F59E0B` | Amber — needs attention, uncertainty | Status "ok", success |
| `risk.300` | `#FCD34D` | Light amber — forecast band edges | — |
| `risk.950` | `#3B2A0A` | Amber well — risk chip background | — |

**The rule a junior could enforce in code review:**
> Indigo = intelligence. Green = $ saved. Red = $ burning. Amber = risk / attention.
> If you used a colour for anything else, you used the wrong colour.

### 4.3 Why this beats pure New Relic green

Pure NR (option A from brainstorm) collapses two ideas into one signal: "this is our brand"
*and* "this is the data". When everything is electric green you lose the ability to colour
"saved" differently from "wasted" — the most important semantic split in the entire product.

Our palette keeps NR's confident dark canvas, adopts their green for the meaning we use it
for (savings), but reserves indigo for brand/intelligence and red/amber for the other
business-critical signals. It looks at home next to New Relic and is unambiguously *us*.

---

## 5. Typography

| Role | Family | Weight | Why |
|---|---|---|---|
| UI / body | **Manrope** | 400 / 500 / 600 | Geometric sans, distinctive but quiet, free (Google Fonts / Fontsource) |
| Numbers, code, telemetry | **JetBrains Mono** | 400 / 500 | Tabular figures, terminal honesty |
| Display (marketing only) | Manrope (tight `-0.03em` tracking, 700/800) | — | One family, two voices via weight + tracking |

Manrope (over Inter) is chosen for a slightly warmer, more distinctive sans — close enough to
Inter for legibility, far enough to not look like every other dev-tool. Use `font-feature-settings:
"ss01", "cv11"` for the cleaner numerals in chrome.

**Scale (rem at 16px base):**

| Token | px | Use |
|---|---|---|
| `text-display` | 56 (3.5rem) | Marketing hero only |
| `text-h1` | 32 (2rem) | Page titles |
| `text-h2` | 24 (1.5rem) | Section headers |
| `text-h3` | 18 (1.125rem) | Card titles |
| `text-body` | 14 (0.875rem) | Default UI body |
| `text-sm` | 13 (0.8125rem) | Secondary |
| `text-xs` | 12 (0.75rem) | Metadata |
| `text-mono-xs` | 11 (0.6875rem) | Labels (uppercased, `0.18em` tracking) |
| `text-mono-sm` | 13 | Inline code, IDs |
| `text-kpi-sm` | 24 | Stat tiles |
| `text-kpi` | 32 | Primary KPI numbers |
| `text-kpi-hero` | 48 | The $7.1M headline |

KPI numbers always use `font-variant-numeric: tabular-nums` and `letter-spacing: -0.02em`.

---

## 6. Motion language (locked)

**Intensity:** Confident, not playful. ~200–400ms is the band; anything longer needs a reason.

### 6.1 Easing tokens

| Token | Curve | Use |
|---|---|---|
| `ease.out` | `cubic-bezier(0.16, 1, 0.3, 1)` (easeOutExpo) | Entries, reveals |
| `ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Position changes |
| `ease.in` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |

### 6.2 Standard motions

| Motion | Duration | Easing | Notes |
|---|---|---|---|
| Stagger card entry | 320ms, **40ms stagger** | `ease.out` | Used on dashboard mount, never on every interaction |
| Card hover lift | 180ms | `ease.out` | translateY(-2px), border → `border.strong` |
| Sparkline draw-in | 1200ms | `ease.out` | `stroke-dasharray` reveal, once on first paint |
| KPI counter tick-up | 1600ms | `ease.out` | Numerical interpolation, **only on first reveal of a value**, never on refresh |
| Cost-map cell hover zoom | 140ms | `ease.out` | scale(1.04), tooltip fade 120ms |
| Forecast cone reveal | 800ms | `ease.out` | Width grows from origin |
| Live scan ticker | continuous | linear | The "engine is running" affordance, paused on hover |
| Modal in | 220ms | `ease.out` | Fade + 8px translateY |
| Page transition | 180ms | `ease.out` | Fade only — no slide |

### 6.3 What we never do

- **Bounce.** No `spring(damping: 0.4)`. We are not a consumer app.
- **Decorative motion.** If it doesn't help the user understand what changed, cut it.
- **Animate on every refresh.** The $7.1M number ticks up *once* the first time you see it.
- **Layout shift > 4px** during entry. Things appear in their final position with opacity, not by jumping in from off-screen.
- **Parallax / scroll-jacking.** A CTO needs to skim. Hijacking scroll loses trust instantly.

### 6.4 Reduced motion

`prefers-reduced-motion: reduce` collapses every duration to ≤80ms, drops staggers entirely,
and replaces counter tick-ups with the final value. The product must remain fully legible and
brand-correct with all motion off.

---

## 7. Space, radius, elevation, density

- **Spacing scale (px):** 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
- **Radius:** `4` (chips), `8` (inputs/cards-internal), `14` (top-level cards), `20` (modals), `999` (pills).
- **Borders:** 1px default, never 2px+ on dark surfaces.
- **Elevation:** Borders > shadows. Use a brighter border + `bg.elevated` for "above the page". Reserve shadows for modals/tooltips only.
- **Density:** Dashboard rows = 36–40px tall (table) / 56px (KPI tiles). Compact mode (32px rows) lives behind a settings toggle. Default is dense; we are not a consumer app.

---

## 8. Iconography & charts

- **Icons:** Lucide, 1.5px stroke, 16/20/24 sizes. No filled icons in chrome (only inside semantic chips).
- **Charts:** Recharts + d3-hierarchy. Series colour order: `intel.500 → savings.500 → risk.500 → waste.500 → text.muted`. Grid lines = `border.subtle`. Axis labels = `text.muted` at `text-mono-xs`.
- **Sparklines:** 1.5px stroke, no fill, single trailing dot at `r=3`. Use the *semantic* colour of the metric (savings green for "$ saved over time", waste red for "$ wasted over time").
- **Cost map (treemap):** Cell stroke `border.subtle`, hover stroke `border.strong`, fill = waste intensity (`waste.950` → `waste.500`).

---

## 9. Voice & tone

A senior on-call engineer writing for another senior on-call engineer. Confident, specific,
never marketing-speak. Numbers do the persuading.

| Do | Don't |
|---|---|
| "Found $7,097,364 / mo of waste across 248,458 VMs." | "🎉 Amazing insights await!" |
| "12 high-impact fixes — review." | "We've discovered some opportunities for you!" |
| "Last scan: 14s ago." | "Always up to date!" |
| "AWS read-only. We can't touch your resources." | "Bank-level security." |
| "p95 utilisation: 12%. Suggested: t4g.small ($14/mo, –78%)." | "This instance could probably be smaller." |

Numbers are always grounded. Either show the source (`from 7-day CloudWatch`) or don't show
the number. The Python engine owns truth; the LLM only *explains*.

---

## 9.5 Accessibility & keyboard

Non-negotiable contracts the design system must enforce:

- **Contrast:** All `text.primary/secondary/muted` on `bg.canvas/surface/elevated` ≥ WCAG AA
  (4.5:1 for body, 3:1 for ≥18px). Semantic colours on their `.950` wells ≥ 4.5:1. Validate
  in CI with a Storybook a11y check.
- **Focus:** Every interactive element gets a 2px `intel.500` ring offset 2px from the element,
  with `border.subtle` backstop so it's visible on `bg.elevated`. Never `outline: none` without
  a replacement.
- **Keyboard:** Tab order matches visual order. `cmd-k` opens command palette globally. Tables
  support arrow-key navigation. No interaction lives behind hover-only.
- **Live regions:** "Last scan: 14s ago" updates via `aria-live="polite"`. Anomaly alerts
  use `aria-live="assertive"` only when blocking action is required.
- **Screen-reader labels:** KPI numbers get a paired `sr-only` description
  (`$7,097,364 per month of cloud waste, up 91 percent`).

## 10. Light mode

**Out of scope for v1.** Dark-first is core to the brand.

We define a light theme token map in code so individual marketing/docs pages can render light
if needed, but the dashboard is dark-only at launch. We commit to a real light mode only when
a real customer asks (logged as a follow-up, not a launch blocker).

---

## 11. What this unlocks for the next sub-projects

- **Sub-project 2 (Design system v2):** Tailwind config + CSS variables + token export, base
  components (Button / Card / Stat / Sparkline / Chip / Table / Modal / Toast / Empty),
  Framer Motion variant library, Storybook page.
- **Sub-project 3 (IA / wireframes):** ~200 screens map across marketing + dashboard + settings + docs.
- **Sub-project 4 (Marketing site):** Hero, product tour, pricing, docs landing — all using
  this palette/motion language.
- **Sub-project 5 (App shell):** Sidebar, topbar, command-K, breadcrumbs, page chrome.
- **Sub-project 6 (Feature dashboards):** Cost map, rightsizing queue, anomaly stream,
  forecast, commitments, integrations, settings.

Every one of those inherits from this document. Any deviation is either a token addition
(reviewed) or a bug.

---

## 12. Open questions (non-blocking)

These do not block the design system spec, but should be answered before we ship marketing copy:

1. **Logo / wordmark.** This doc does not define the mark itself. Working assumption:
   "stratos" set in Manrope 700, `-0.03em` tracking, no decorative glyph. Revisit when we hit
   the marketing-site sub-project.
2. **OG / social cards.** Same — handled in marketing sub-project.
3. **Email template palette.** Inherits the dark palette but tested against Gmail/Outlook
   rendering — separate spec when we wire Resend digest.

---

## 13. Anti-goals (the explicit no-list)

- We are not Vercel (consumer-developer, gradient-heavy, playful motion).
- We are not Stripe (light-mode boardroom premium).
- We are not Linear (small-team-software aesthetic, pastel highlights).
- We are not a New Relic clone — we *speak the same dialect of trust* with our own accent.
- We do not use emoji in product chrome. Status indicators are colour + shape, not 🟢🔴.
- We do not use stock photography anywhere, ever.
- We do not use carousels.

---

## 14. Sign-off

Locked decisions (from the brainstorming session 2026-05-24):

- [x] Primary audience: **CTO / VP Engineering**
- [x] Emotional position: **Calm authority** (New Relic / Datadog dialect)
- [x] Palette: **B — Stratos × New Relic** (indigo intelligence + green savings + red waste + amber risk)
- [x] Motion intensity: **Confident, not playful** (200–400ms, no bounce, reduced-motion honoured)
- [x] Type system: **Inter + JetBrains Mono**, scale defined above
- [x] Dark-first, light mode deferred

Next: design system v2 spec (`2026-05-24-design-system-v2.md`) implementing every token and
component contract above.
