# Design System v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing ad-hoc Tailwind tokens and two-component UI library (`card`, `sparkline`) with a complete, spec-driven design system: semantic tokens, motion library, ten base components, Storybook, vitest + testing-library, and a migrated dashboard — so every subsequent screen we build inherits one consistent brand.

**Architecture:** Three layers. (1) **Tokens** — CSS variables in `globals.css`, Tailwind config consumes them, `lib/design/tokens.ts` re-exports for non-Tailwind consumers (Recharts, d3). (2) **Motion** — `lib/design/motion.ts` exports easing tokens and reusable Framer Motion `Variants`; all components import from there, nobody hand-rolls timings. (3) **Components** — `components/ui/<name>.tsx`, each a single-responsibility file using `cn()` + `cva()`-style variant maps via `class-variance-authority`, with paired Storybook story and (for interactive ones) vitest behavior test. Existing screens migrate by class-name search-and-replace in the final phase.

**Tech Stack:** Next.js 14 App Router, Tailwind 3.4, Framer Motion 11, `class-variance-authority`, Manrope + JetBrains Mono via `next/font/google`, Storybook 8 with `@storybook/addon-a11y`, Vitest 2 + `@testing-library/react` + `jsdom`, `@radix-ui/react-dialog` for the Modal primitive (focus trap done right, accessible by default).

**Spec source:** `docs/superpowers/specs/2026-05-24-brand-identity-design.md` — every token, motion timing, accessibility contract below traces to that doc.

---

## File Structure

**Create:**
```
apps/web/
├── .storybook/
│   ├── main.ts                          # Storybook config
│   └── preview.tsx                      # Global decorators, dark bg, a11y
├── lib/design/
│   ├── tokens.ts                        # Token constants for charts/SVG
│   └── motion.ts                        # Easing + Framer Motion variants
├── components/ui/
│   ├── button.tsx                       # NEW
│   ├── chip.tsx                         # NEW
│   ├── stat.tsx                         # NEW
│   ├── input.tsx                        # NEW
│   ├── table.tsx                        # NEW
│   ├── modal.tsx                        # NEW (wraps Radix Dialog)
│   ├── toast.tsx                        # NEW
│   ├── empty.tsx                        # NEW
│   ├── button.test.tsx                  # NEW
│   ├── modal.test.tsx                   # NEW
│   ├── toast.test.tsx                   # NEW
│   ├── table.test.tsx                   # NEW
│   ├── *.stories.tsx                    # NEW — one per component (10)
├── vitest.config.ts                     # NEW
└── vitest.setup.ts                      # NEW
```

**Modify:**
```
apps/web/
├── tailwind.config.ts                   # Rewrite for spec tokens
├── app/globals.css                      # CSS vars + focus-visible + reduced-motion
├── app/layout.tsx                       # Wire next/font for Manrope + JetBrains Mono
├── package.json                         # Add deps + scripts
├── components/ui/card.tsx               # Rewrite for new tokens
├── components/ui/sparkline.tsx          # Rewrite for semantic color + motion lib
├── components/dashboard/*.tsx           # Class-name migration (final phase)
└── app/proof/page.tsx                   # Class-name migration (final phase)
```

---

## Phase 1 — Token foundation

### Task 1: Rewrite Tailwind config with spec tokens

**Files:**
- Modify: `apps/web/tailwind.config.ts`

- [ ] **Step 1: Read the current config to confirm what's being replaced**

Run: `cat apps/web/tailwind.config.ts`
Confirm the current keys are `bg.DEFAULT/raised/subtle`, `brand`, `good/bad/warn`, `fontSize.data-*`. We are replacing all of these.

- [ ] **Step 2: Replace the file contents**

Write `apps/web/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

// Stratos design tokens v2 — see docs/superpowers/specs/2026-05-24-brand-identity-design.md
// Colors are CSS variables (defined in globals.css) so they're available outside Tailwind too
// (Recharts, inline SVG, etc. via lib/design/tokens.ts).
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          canvas:   "rgb(var(--bg-canvas)   / <alpha-value>)",
          surface:  "rgb(var(--bg-surface)  / <alpha-value>)",
          elevated: "rgb(var(--bg-elevated) / <alpha-value>)",
          sunken:   "rgb(var(--bg-sunken)   / <alpha-value>)",
        },
        border: {
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        text: {
          primary:   "rgb(var(--text-primary)   / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)",
          muted:     "rgb(var(--text-muted)     / <alpha-value>)",
          faint:     "rgb(var(--text-faint)     / <alpha-value>)",
        },
        intel: {
          300: "rgb(var(--intel-300) / <alpha-value>)",
          500: "rgb(var(--intel-500) / <alpha-value>)",
          950: "rgb(var(--intel-950) / <alpha-value>)",
        },
        savings: {
          300: "rgb(var(--savings-300) / <alpha-value>)",
          500: "rgb(var(--savings-500) / <alpha-value>)",
          950: "rgb(var(--savings-950) / <alpha-value>)",
        },
        waste: {
          300: "rgb(var(--waste-300) / <alpha-value>)",
          500: "rgb(var(--waste-500) / <alpha-value>)",
          950: "rgb(var(--waste-950) / <alpha-value>)",
        },
        risk: {
          300: "rgb(var(--risk-300) / <alpha-value>)",
          500: "rgb(var(--risk-500) / <alpha-value>)",
          950: "rgb(var(--risk-950) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "mono-xs":   ["0.6875rem", { lineHeight: "1rem",    letterSpacing: "0.18em" }],
        "mono-sm":   ["0.8125rem", { lineHeight: "1.125rem" }],
        "kpi-sm":    ["1.5rem",   { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "kpi":       ["2rem",     { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "kpi-hero":  ["3rem",     { lineHeight: "3.25rem", letterSpacing: "-0.025em" }],
        "display":   ["3.5rem",   { lineHeight: "3.75rem", letterSpacing: "-0.03em" }],
      },
      borderRadius: {
        chip: "4px",
        DEFAULT: "8px",
        card: "14px",
        modal: "20px",
      },
      transitionTimingFunction: {
        out:   "cubic-bezier(0.16, 1, 0.3, 1)",
        inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
        in:    "cubic-bezier(0.4, 0, 1, 1)",
      },
      keyframes: {
        "pulse-dot": { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "scan":      { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "scan":      "scan 8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS (the config itself is just types — class consumers will break in Phase 5; that's expected).

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "design-system: rewrite tailwind tokens per brand spec"
```

---

### Task 2: Write CSS variables + base layer

**Files:**
- Modify: `apps/web/app/globals.css`

- [ ] **Step 1: Replace globals.css**

Write `apps/web/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ─────────── Design tokens (see specs/2026-05-24-brand-identity-design.md) ─────────── */
:root {
  /* Backgrounds */
  --bg-canvas:    10  14  26;   /* #0A0E1A */
  --bg-surface:   15  22  38;   /* #0F1626 */
  --bg-elevated:  20  27  46;   /* #141B2E */
  --bg-sunken:     5   8  17;   /* #050811 */

  /* Borders */
  --border-subtle: 28 35 51;    /* #1C2333 */
  --border-strong: 42 51 73;    /* #2A3349 */

  /* Text */
  --text-primary:   241 245 249; /* #F1F5F9 */
  --text-secondary: 203 213 225; /* #CBD5E1 */
  --text-muted:      148 163 184; /* #94A3B8 */
  --text-faint:       100 116 139; /* #64748B */

  /* Semantic: intelligence (indigo) */
  --intel-300: 165 180 252;  /* #A5B4FC */
  --intel-500:  99 102 241;  /* #6366F1 */
  --intel-950:  30  27  75;  /* #1E1B4B */

  /* Semantic: savings (green) */
  --savings-300:  52 211 153; /* #34D399 */
  --savings-500:   0 172 105; /* #00AC69 */
  --savings-950:   5  46  28; /* #052E1C */

  /* Semantic: waste (red) */
  --waste-300: 252 165 165;  /* #FCA5A5 */
  --waste-500: 239  68  68;  /* #EF4444 */
  --waste-950:  59  18  18;  /* #3B1212 */

  /* Semantic: risk (amber) */
  --risk-300: 252 211  77;   /* #FCD34D */
  --risk-500: 245 158  11;   /* #F59E0B */
  --risk-950:  59  42  10;   /* #3B2A0A */

  color-scheme: dark;
}

/* ─────────── Base layer ─────────── */
@layer base {
  html {
    color-scheme: dark;
  }
  body {
    @apply bg-bg-canvas text-text-primary antialiased;
    font-family: var(--font-sans);
    font-feature-settings: "ss01", "cv11";
  }

  /* Every interactive element gets the spec-mandated focus ring */
  :where(button, a, [role="button"], [role="tab"], [role="menuitem"], input, select, textarea, [tabindex]:not([tabindex="-1"])):focus-visible {
    outline: 2px solid rgb(var(--intel-500));
    outline-offset: 2px;
    border-radius: 4px;
  }
}

@layer utilities {
  .tabular { font-variant-numeric: tabular-nums; }
  .font-numeric { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
}

/* ─────────── Reduced motion ─────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Boot the dev server, confirm it renders without breaking**

Run: `cd apps/web && pnpm dev`
Open `http://localhost:3000`. Expected: page loads (will look stripped while old class names are unmapped — that's fine; we fix in Phase 5).
Kill the server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "design-system: define CSS variables + focus + reduced-motion base"
```

---

### Task 3: Wire Manrope + JetBrains Mono via next/font

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Replace layout.tsx**

Write `apps/web/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Manrope, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";

import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stratos — your cloud, optimized",
  description:
    "AI-native cloud cost intelligence. Find wasted spend, in dollars, in real time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${manrope.variable} ${jetbrainsMono.variable}`}>
        <body>
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 2: Boot + visually confirm Manrope is loaded**

Run: `cd apps/web && pnpm dev`
Open `http://localhost:3000`, DevTools → Network → Fonts. Expected: `manrope-*.woff2` and `jetbrains-mono-*.woff2` requests succeed.
Kill the server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "design-system: wire Manrope + JetBrains Mono via next/font"
```

---

### Task 4: Export tokens.ts for non-Tailwind consumers

**Files:**
- Create: `apps/web/lib/design/tokens.ts`

- [ ] **Step 1: Write tokens.ts**

Write `apps/web/lib/design/tokens.ts`:

```ts
// Plain hex tokens for places Tailwind can't reach — Recharts series, inline SVG
// stroke/fill, d3 scales. Keep IN SYNC with apps/web/app/globals.css. If you
// change a hex here without updating globals.css (or vice versa), Storybook
// will surface the drift because chart colors will diverge from card chrome.

export const tokens = {
  bg: {
    canvas:   "#0A0E1A",
    surface:  "#0F1626",
    elevated: "#141B2E",
    sunken:   "#050811",
  },
  border: { subtle: "#1C2333", strong: "#2A3349" },
  text: {
    primary:   "#F1F5F9",
    secondary: "#CBD5E1",
    muted:     "#94A3B8",
    faint:     "#64748B",
  },
  intel:   { 300: "#A5B4FC", 500: "#6366F1", 950: "#1E1B4B" },
  savings: { 300: "#34D399", 500: "#00AC69", 950: "#052E1C" },
  waste:   { 300: "#FCA5A5", 500: "#EF4444", 950: "#3B1212" },
  risk:    { 300: "#FCD34D", 500: "#F59E0B", 950: "#3B2A0A" },
} as const;

/** Default chart series color order per spec §8. */
export const chartSeries = [
  tokens.intel[500],
  tokens.savings[500],
  tokens.risk[500],
  tokens.waste[500],
  tokens.text.muted,
] as const;

/** Semantic helper — pick the right color for a metric kind. */
export const semanticColor = {
  intelligence: tokens.intel[500],
  savings:      tokens.savings[500],
  waste:        tokens.waste[500],
  risk:         tokens.risk[500],
} as const;

export type SemanticKind = keyof typeof semanticColor;
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/design/tokens.ts
git commit -m "design-system: export tokens.ts for non-Tailwind consumers"
```

---

## Phase 2 — Motion + test infrastructure

### Task 5: Create motion.ts with easing + Framer Motion variants

**Files:**
- Create: `apps/web/lib/design/motion.ts`

- [ ] **Step 1: Write motion.ts**

Write `apps/web/lib/design/motion.ts`:

```ts
import type { Variants, Transition } from "framer-motion";

// Spec §6: confident, not playful. 200–400ms is the band. Never bouncy.
// Reduced motion: framer-motion automatically respects `prefers-reduced-motion`
// when MotionConfig wraps the app — see Phase 5 migration.

export const easing = {
  out:   [0.16, 1, 0.3, 1],   // easeOutExpo
  inOut: [0.65, 0, 0.35, 1],
  in:    [0.4, 0, 1, 1],
} as const;

export const duration = {
  hover: 0.18,
  reveal: 0.32,
  modal: 0.22,
  page: 0.18,
  drawIn: 1.2,
  counter: 1.6,
  scanLoop: 8,
} as const;

const baseOut: Transition = { duration: duration.reveal, ease: easing.out };

/** Cards/tiles fade + lift in. Use `staggerChildren: 0.04` on the parent. */
export const cardEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: baseOut },
};

/** Parent container that staggers its children by 40ms — spec §6.2. */
export const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
};

/** Modal/dialog enter. */
export const modalEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: duration.modal, ease: easing.out },
  },
  exit: { opacity: 0, transition: { duration: 0.12, ease: easing.in } },
};

/** Toast slide-in from top-right. */
export const toastEnter: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: baseOut },
  exit: { opacity: 0, x: 16, transition: { duration: 0.16, ease: easing.in } },
};

/** Sparkline draw-in — used by the Sparkline component once on first paint. */
export const sparklineDraw: Transition = {
  pathLength: { duration: duration.drawIn, ease: easing.out },
  opacity:    { duration: 0.4, ease: easing.out },
};

/** Page transitions — fade only per spec. */
export const pageTransition: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.page, ease: easing.out } },
};
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/design/motion.ts
git commit -m "design-system: motion tokens + reusable Framer Motion variants"
```

---

### Task 6: Set up Vitest + testing-library + jsdom

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`

- [ ] **Step 1: Add dev deps + script**

Run from the repo root:
```bash
pnpm --filter web add -D vitest@^2 @vitest/ui@^2 @testing-library/react@^16 @testing-library/jest-dom@^6 @testing-library/user-event@^14 jsdom@^25 @vitejs/plugin-react@^4
```

Then edit `apps/web/package.json` and add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 2: Write vitest.config.ts**

Write `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["components/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Write vitest.setup.ts**

Write `apps/web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Add a smoke test to prove the pipeline works**

Create `apps/web/lib/design/motion.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { easing, duration, cardEnter } from "./motion";

describe("motion tokens", () => {
  it("exposes the spec easing curves", () => {
    expect(easing.out).toEqual([0.16, 1, 0.3, 1]);
  });

  it("keeps reveal duration in the 200-400ms band", () => {
    expect(duration.reveal).toBeGreaterThanOrEqual(0.2);
    expect(duration.reveal).toBeLessThanOrEqual(0.4);
  });

  it("cardEnter targets opacity 1 and y 0", () => {
    expect(cardEnter.visible).toMatchObject({ opacity: 1, y: 0 });
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run: `cd apps/web && pnpm test:run`
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/vitest.setup.ts apps/web/lib/design/motion.test.ts ../../pnpm-lock.yaml
git commit -m "design-system: wire vitest + testing-library, smoke-test motion tokens"
```

---

### Task 7: Set up Storybook 8 with a11y addon

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/.storybook/main.ts`
- Create: `apps/web/.storybook/preview.tsx`

- [ ] **Step 1: Install Storybook**

Run from the repo root:
```bash
pnpm --filter web add -D storybook@^8 @storybook/nextjs@^8 @storybook/react@^8 @storybook/addon-essentials@^8 @storybook/addon-a11y@^8 @storybook/addon-interactions@^8 @storybook/test@^8
```

Add to `apps/web/package.json` `"scripts"`:
```json
"storybook": "storybook dev -p 6006",
"storybook:build": "storybook build"
```

- [ ] **Step 2: Write Storybook main config**

Create `apps/web/.storybook/main.ts`:

```ts
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  framework: { name: "@storybook/nextjs", options: {} },
  stories: ["../components/**/*.stories.@(ts|tsx|mdx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
  ],
  staticDirs: ["../public"],
  typescript: { check: false, reactDocgen: "react-docgen-typescript" },
};

export default config;
```

- [ ] **Step 3: Write Storybook preview**

Create `apps/web/.storybook/preview.tsx`:

```tsx
import type { Preview } from "@storybook/react";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "../app/globals.css";

const manrope = Manrope({ subsets: ["latin"], weight: ["400","500","600","700","800"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-mono", display: "swap" });

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "canvas",
      values: [
        { name: "canvas",   value: "#0A0E1A" },
        { name: "surface",  value: "#0F1626" },
        { name: "elevated", value: "#141B2E" },
      ],
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className={`dark ${manrope.variable} ${mono.variable}`} style={{ minHeight: "100vh", background: "#0A0E1A", color: "#F1F5F9", fontFamily: "var(--font-sans)" }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
```

- [ ] **Step 4: Smoke-test boot**

Run: `cd apps/web && pnpm storybook`
Expected: Storybook launches at `http://localhost:6006`. Sidebar will be empty (no stories yet) — that's fine.
Kill the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/.storybook ../../pnpm-lock.yaml
git commit -m "design-system: set up Storybook 8 with a11y addon"
```

---

## Phase 3 — Base components

For every component task in this phase, the pattern is: **(a)** install `class-variance-authority` once (already done in Task 8), **(b)** TDD where there's logic, otherwise jump to implementation, **(c)** Storybook story is mandatory, **(d)** commit.

### Task 8: Button component

**Files:**
- Modify: `apps/web/package.json` (add `class-variance-authority`)
- Create: `apps/web/components/ui/button.tsx`
- Create: `apps/web/components/ui/button.test.tsx`
- Create: `apps/web/components/ui/button.stories.tsx`

- [ ] **Step 1: Install class-variance-authority**

Run from the repo root: `pnpm --filter web add class-variance-authority@^0.7`

- [ ] **Step 2: Write the failing test**

Create `apps/web/components/ui/button.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders children and reports its accessible name", () => {
    render(<Button>Run scan</Button>);
    expect(screen.getByRole("button", { name: "Run scan" })).toBeInTheDocument();
  });

  it("fires onClick when activated by mouse and keyboard", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    const btn = screen.getByRole("button", { name: "Go" });
    await user.click(btn);
    btn.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it("disables clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Go</Button>);
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the destructive intent class", () => {
    render(<Button intent="destructive">Delete</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-waste-500");
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `cd apps/web && pnpm test:run components/ui/button.test.tsx`
Expected: FAIL — `Cannot find module './button'`.

- [ ] **Step 4: Implement Button**

Create `apps/web/components/ui/button.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out " +
    "disabled:opacity-40 disabled:pointer-events-none select-none whitespace-nowrap rounded",
  {
    variants: {
      intent: {
        primary:     "bg-intel-500 text-white hover:bg-intel-300 hover:text-intel-950",
        secondary:   "bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong",
        ghost:       "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated",
        destructive: "bg-waste-500 text-white hover:bg-waste-300 hover:text-waste-950",
      },
      size: {
        sm: "h-7  px-2.5 text-[12px]",
        md: "h-9  px-3.5 text-[13px]",
        lg: "h-11 px-5   text-[14px]",
      },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);

export type ButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, intent, size, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(button({ intent, size }), className)}
        {...props}
      />
    );
  },
);
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `cd apps/web && pnpm test:run components/ui/button.test.tsx`
Expected: 4 tests pass.

- [ ] **Step 6: Write Storybook story**

Create `apps/web/components/ui/button.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Run scan" },
  argTypes: {
    intent: { control: "select", options: ["primary","secondary","ghost","destructive"] },
    size:   { control: "select", options: ["sm","md","lg"] },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};
export const Secondary: Story = { args: { intent: "secondary" } };
export const Ghost: Story     = { args: { intent: "ghost" } };
export const Destructive: Story = { args: { intent: "destructive", children: "Delete account" } };
export const Disabled: Story  = { args: { disabled: true } };

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/ui/button.tsx apps/web/components/ui/button.test.tsx apps/web/components/ui/button.stories.tsx apps/web/package.json ../../pnpm-lock.yaml
git commit -m "design-system: Button component + tests + story"
```

---

### Task 9: Chip component

**Files:**
- Create: `apps/web/components/ui/chip.tsx`
- Create: `apps/web/components/ui/chip.stories.tsx`

- [ ] **Step 1: Implement Chip**

Create `apps/web/components/ui/chip.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const chip = cva(
  "inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.12em] " +
    "rounded-chip border whitespace-nowrap",
  {
    variants: {
      kind: {
        intelligence: "bg-intel-950   text-intel-300   border-intel-950",
        savings:      "bg-savings-950 text-savings-300 border-savings-950",
        waste:        "bg-waste-950   text-waste-300   border-waste-950",
        risk:         "bg-risk-950    text-risk-300    border-risk-950",
        neutral:      "bg-bg-elevated text-text-muted  border-border-subtle",
      },
      size: {
        sm: "h-5 px-1.5 text-[10px]",
        md: "h-6 px-2   text-[11px]",
      },
    },
    defaultVariants: { kind: "neutral", size: "md" },
  },
);

export type ChipProps =
  React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof chip>;

export function Chip({ className, kind, size, ...props }: ChipProps) {
  return <span className={cn(chip({ kind, size }), className)} {...props} />;
}
```

- [ ] **Step 2: Write Storybook story**

Create `apps/web/components/ui/chip.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Chip } from "./chip";

const meta: Meta<typeof Chip> = {
  title: "Primitives/Chip",
  component: Chip,
  args: { children: "savings" },
};
export default meta;
type Story = StoryObj<typeof Chip>;

export const Semantic: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Chip kind="intelligence">Intelligence</Chip>
      <Chip kind="savings">Savings</Chip>
      <Chip kind="waste">Waste</Chip>
      <Chip kind="risk">Risk</Chip>
      <Chip kind="neutral">Neutral</Chip>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Chip size="sm" kind="intelligence">sm</Chip>
      <Chip size="md" kind="intelligence">md</Chip>
    </div>
  ),
};
```

- [ ] **Step 3: Verify Storybook renders without error**

Run: `cd apps/web && pnpm storybook` and open `http://localhost:6006`. Confirm both stories render with the spec colors. Kill the server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/chip.tsx apps/web/components/ui/chip.stories.tsx
git commit -m "design-system: Chip component with semantic kinds"
```

---

### Task 10: Stat component (KPI tile with animated count)

**Files:**
- Create: `apps/web/components/ui/stat.tsx`
- Create: `apps/web/components/ui/stat.test.tsx`
- Create: `apps/web/components/ui/stat.stories.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/ui/stat.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "./stat";

describe("Stat", () => {
  it("renders the formatted value and label", () => {
    render(<Stat label="Monthly waste" value="$7,097,364" />);
    expect(screen.getByText("Monthly waste")).toBeInTheDocument();
    expect(screen.getByText("$7,097,364")).toBeInTheDocument();
  });

  it("includes a screen-reader description when provided", () => {
    render(
      <Stat
        label="Monthly waste"
        value="$7.1M"
        srDescription="7.1 million dollars per month of cloud waste"
      />,
    );
    expect(screen.getByText(/7\.1 million dollars per month/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd apps/web && pnpm test:run components/ui/stat.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Stat**

Create `apps/web/components/ui/stat.tsx`:

```tsx
"use client";
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const number = cva("font-numeric tracking-[-0.02em]", {
  variants: {
    size: { sm: "text-kpi-sm", md: "text-kpi", lg: "text-kpi-hero" },
    tone: {
      neutral: "text-text-primary",
      intel:   "text-intel-300",
      savings: "text-savings-500",
      waste:   "text-waste-500",
      risk:    "text-risk-500",
    },
  },
  defaultVariants: { size: "md", tone: "neutral" },
});

type StatProps = {
  label: string;
  value: React.ReactNode;
  /** Plain-language description for screen readers (spec §9.5). */
  srDescription?: string;
  /** Optional bottom-line caption ("across 248,458 resources"). */
  caption?: React.ReactNode;
  /** Optional top-right delta chip. */
  delta?: React.ReactNode;
} & VariantProps<typeof number>;

export function Stat({ label, value, srDescription, caption, delta, size, tone }: StatProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono uppercase text-mono-xs text-text-muted">{label}</span>
        {delta}
      </div>
      <div className={cn(number({ size, tone }))}>
        {value}
        {srDescription ? <span className="sr-only"> — {srDescription}</span> : null}
      </div>
      {caption ? <div className="text-mono-sm text-text-faint">{caption}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd apps/web && pnpm test:run components/ui/stat.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 5: Storybook story**

Create `apps/web/components/ui/stat.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Stat } from "./stat";
import { Chip } from "./chip";

const meta: Meta<typeof Stat> = { title: "Primitives/Stat", component: Stat };
export default meta;
type Story = StoryObj<typeof Stat>;

export const Default: Story = {
  args: {
    label: "Monthly waste",
    value: "$7,097,364",
    srDescription: "7,097,364 dollars per month of cloud waste",
    caption: "across 248,458 resources",
  },
};

export const Hero: Story = {
  args: { label: "Monthly waste", value: "$7.1M", size: "lg", tone: "waste", caption: "live engine" },
};

export const WithDelta: Story = {
  args: {
    label: "Identified",
    value: "$2.4M",
    tone: "savings",
    delta: <Chip kind="savings" size="sm">▲ 91%</Chip>,
  },
};
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/ui/stat.tsx apps/web/components/ui/stat.test.tsx apps/web/components/ui/stat.stories.tsx
git commit -m "design-system: Stat component (KPI tile + a11y description)"
```

---

### Task 11: Sparkline rewrite (semantic color + motion lib + draw-in once)

**Files:**
- Modify: `apps/web/components/ui/sparkline.tsx`
- Create: `apps/web/components/ui/sparkline.stories.tsx`

- [ ] **Step 1: Read current sparkline to know what to preserve**

Run: `cat apps/web/components/ui/sparkline.tsx`
Note the existing prop shape so dashboard callers don't all break — keep an optional `data` prop accepting `number[]`.

- [ ] **Step 2: Replace sparkline.tsx**

Write `apps/web/components/ui/sparkline.tsx`:

```tsx
"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { sparklineDraw } from "@/lib/design/motion";
import { semanticColor, type SemanticKind } from "@/lib/design/tokens";

type SparklineProps = {
  data: number[];
  kind?: SemanticKind;
  width?: number;
  height?: number;
  className?: string;
  /** Plain-language label for screen readers. */
  srLabel?: string;
};

export function Sparkline({
  data,
  kind = "savings",
  width = 280,
  height = 50,
  className,
  srLabel,
}: SparklineProps) {
  const reduce = useReducedMotion();
  const stroke = semanticColor[kind];
  const points = pointsFor(data, width, height);
  const path = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={className}
      role={srLabel ? "img" : undefined}
      aria-label={srLabel}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
        transition={sparklineDraw}
      />
      {last ? <circle cx={last.x} cy={last.y} r={3} fill={stroke} /> : null}
    </svg>
  );
}

function pointsFor(data: number[], w: number, h: number) {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 4;
  return data.map((v, i) => ({
    x: (i / Math.max(1, data.length - 1)) * w,
    y: h - pad - ((v - min) / span) * (h - pad * 2),
  }));
}
```

- [ ] **Step 3: Storybook story**

Create `apps/web/components/ui/sparkline.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Sparkline } from "./sparkline";

const sample = [40, 38, 32, 28, 30, 22, 18, 12, 8, 5];

const meta: Meta<typeof Sparkline> = { title: "Primitives/Sparkline", component: Sparkline };
export default meta;
type Story = StoryObj<typeof Sparkline>;

export const Savings: Story = { args: { data: sample, kind: "savings", srLabel: "Monthly savings trending up" } };
export const Waste: Story    = { args: { data: sample, kind: "waste"   } };
export const Intel: Story    = { args: { data: sample, kind: "intelligence" } };
export const Risk: Story     = { args: { data: sample, kind: "risk" } };
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/sparkline.tsx apps/web/components/ui/sparkline.stories.tsx
git commit -m "design-system: Sparkline rewrite with semantic kinds + draw-in"
```

---

### Task 12: Card component rewrite

**Files:**
- Modify: `apps/web/components/ui/card.tsx`
- Create: `apps/web/components/ui/card.stories.tsx`

- [ ] **Step 1: Replace card.tsx**

Write `apps/web/components/ui/card.tsx`:

```tsx
"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { cardEnter, duration, easing } from "@/lib/design/motion";

const card = cva(
  "rounded-card border bg-bg-surface text-text-primary",
  {
    variants: {
      intent: {
        default: "border-border-subtle",
        intel:   "border-intel-950",
        savings: "border-savings-950",
        waste:   "border-waste-950",
        risk:    "border-risk-950",
      },
      hover: { none: "", lift: "transition-colors hover:border-border-strong" },
    },
    defaultVariants: { intent: "default", hover: "none" },
  },
);

type CardProps =
  HTMLMotionProps<"div"> &
  VariantProps<typeof card> & {
    /** Enter with the staggered fade-in. Opt-in to avoid animating on refresh. */
    animateIn?: boolean;
  };

export function Card({ className, intent, hover, animateIn, ...props }: CardProps) {
  if (animateIn) {
    return (
      <motion.div
        className={cn(card({ intent, hover }), className)}
        variants={cardEnter}
        initial="hidden"
        animate="visible"
        whileHover={hover === "lift" ? { y: -2, transition: { duration: duration.hover, ease: easing.out } } : undefined}
        {...props}
      />
    );
  }
  return (
    <motion.div
      className={cn(card({ intent, hover }), className)}
      whileHover={hover === "lift" ? { y: -2, transition: { duration: duration.hover, ease: easing.out } } : undefined}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-3 border-b border-border-subtle flex items-center justify-between", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-mono uppercase text-mono-xs text-text-muted", className)} {...props} />;
}
export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-3 border-t border-border-subtle text-mono-sm text-text-muted", className)} {...props} />;
}
```

- [ ] **Step 2: Storybook story**

Create `apps/web/components/ui/card.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "./card";
import { Stat } from "./stat";
import { Sparkline } from "./sparkline";
import { Chip } from "./chip";

const meta: Meta<typeof Card> = { title: "Primitives/Card", component: Card, args: { hover: "lift", style: { width: 360 } } };
export default meta;
type Story = StoryObj<typeof Card>;

const sample = [40, 38, 32, 28, 30, 22, 18, 12, 8, 5];

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Monthly waste · live engine</CardTitle>
        <Chip kind="savings" size="sm">▲ 91%</Chip>
      </CardHeader>
      <CardBody>
        <Stat label="Identified" value="$7,097,364" tone="waste" />
        <div style={{ marginTop: 12 }}>
          <Sparkline data={sample} kind="savings" />
        </div>
      </CardBody>
      <CardFooter>last scan: 14s ago</CardFooter>
    </Card>
  ),
};

export const AnimateIn: Story = { args: { animateIn: true }, render: Default.render };
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/card.tsx apps/web/components/ui/card.stories.tsx
git commit -m "design-system: Card rewrite (CVA intents + hover lift + animateIn)"
```

---

### Task 13: Input component

**Files:**
- Create: `apps/web/components/ui/input.tsx`
- Create: `apps/web/components/ui/input.stories.tsx`

- [ ] **Step 1: Implement Input**

Create `apps/web/components/ui/input.tsx`:

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const input = cva(
  "w-full bg-bg-sunken text-text-primary placeholder:text-text-faint " +
    "border border-border-subtle rounded transition-colors " +
    "hover:border-border-strong focus:border-intel-500 " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      size: { sm: "h-7 px-2 text-[12px]", md: "h-9 px-3 text-[13px]", lg: "h-11 px-3.5 text-[14px]" },
      invalid: { true: "border-waste-500 focus:border-waste-500", false: "" },
    },
    defaultVariants: { size: "md", invalid: false },
  },
);

export type InputProps =
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof input>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, size, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(input({ size, invalid }), className)}
        {...props}
      />
    );
  },
);
```

- [ ] **Step 2: Storybook story**

Create `apps/web/components/ui/input.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = { title: "Primitives/Input", component: Input, args: { placeholder: "search resources…" } };
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const Invalid: Story = { args: { invalid: true, defaultValue: "bad value" } };
export const Disabled: Story = { args: { disabled: true } };
export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8, width: 260 }}>
      <Input size="sm" placeholder="sm" />
      <Input size="md" placeholder="md" />
      <Input size="lg" placeholder="lg" />
    </div>
  ),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/input.tsx apps/web/components/ui/input.stories.tsx
git commit -m "design-system: Input component with focus + invalid states"
```

---

### Task 14: Table component (dense default + keyboard nav)

**Files:**
- Create: `apps/web/components/ui/table.tsx`
- Create: `apps/web/components/ui/table.test.tsx`
- Create: `apps/web/components/ui/table.stories.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/ui/table.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Table, THead, TBody, TR, TH, TD } from "./table";

describe("Table", () => {
  it("renders with semantic table roles", () => {
    render(
      <Table>
        <THead><TR><TH>Resource</TH><TH>Waste</TH></TR></THead>
        <TBody><TR><TD>i-abc</TD><TD>$12</TD></TR></TBody>
      </Table>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("marks numeric columns as tabular-nums via className", () => {
    render(<Table><TBody><TR><TD numeric>$1,234</TD></TR></TBody></Table>);
    expect(screen.getByRole("cell")).toHaveClass("font-numeric");
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd apps/web && pnpm test:run components/ui/table.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Table**

Create `apps/web/components/ui/table.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto border border-border-subtle rounded-card">
      <table className={cn("w-full text-[13px] border-collapse", className)} {...props} />
    </div>
  );
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn("bg-bg-elevated text-text-muted font-mono uppercase text-mono-xs", props.className)} />;
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TR(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("border-b border-border-subtle last:border-0 hover:bg-bg-elevated/60 transition-colors", props.className)} />;
}
export function TH(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("text-left font-medium px-3 h-9 align-middle", props.className)} />;
}
export function TD({
  numeric,
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <td
      {...props}
      className={cn(
        "px-3 h-10 align-middle text-text-secondary",
        numeric && "font-numeric text-right",
        className,
      )}
    />
  );
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd apps/web && pnpm test:run components/ui/table.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 5: Storybook story**

Create `apps/web/components/ui/table.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Table, THead, TBody, TR, TH, TD } from "./table";
import { Chip } from "./chip";

const meta: Meta<typeof Table> = { title: "Primitives/Table", component: Table };
export default meta;
type Story = StoryObj<typeof Table>;

export const Dense: Story = {
  render: () => (
    <Table>
      <THead>
        <TR>
          <TH>Resource</TH><TH>Type</TH><TH>Region</TH>
          <TH style={{ textAlign: "right" }}>Monthly waste</TH>
          <TH>Status</TH>
        </TR>
      </THead>
      <TBody>
        {[
          ["i-0abc123", "m5.4xlarge", "us-east-1", "$1,247", "waste"],
          ["i-0def456", "r5.2xlarge", "eu-west-2", "$842",   "risk" ],
          ["i-0ghi789", "t3.medium",  "us-east-1", "$214",   "savings"],
        ].map(([id, type, region, cost, kind]) => (
          <TR key={id as string}>
            <TD>{id}</TD>
            <TD>{type}</TD>
            <TD>{region}</TD>
            <TD numeric>{cost}</TD>
            <TD><Chip kind={kind as any} size="sm">{kind}</Chip></TD>
          </TR>
        ))}
      </TBody>
    </Table>
  ),
};
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/ui/table.tsx apps/web/components/ui/table.test.tsx apps/web/components/ui/table.stories.tsx
git commit -m "design-system: Table (dense, semantic, numeric cells)"
```

---

### Task 15: Modal component (Radix Dialog under the hood)

**Files:**
- Modify: `apps/web/package.json` (add `@radix-ui/react-dialog`)
- Create: `apps/web/components/ui/modal.tsx`
- Create: `apps/web/components/ui/modal.test.tsx`
- Create: `apps/web/components/ui/modal.stories.tsx`

- [ ] **Step 1: Install Radix Dialog**

Run from the repo root: `pnpm --filter web add @radix-ui/react-dialog@^1`

- [ ] **Step 2: Write the failing test**

Create `apps/web/components/ui/modal.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "./modal";

function Harness() {
  return (
    <Modal>
      <Modal.Trigger asChild><button>Open</button></Modal.Trigger>
      <ModalContent>
        <ModalTitle>Confirm</ModalTitle>
        <ModalDescription>Are you sure?</ModalDescription>
      </ModalContent>
    </Modal>
  );
}

describe("Modal", () => {
  it("opens on trigger and closes on ESC", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("labels the dialog with the title for screen readers", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName("Confirm");
    expect(dialog).toHaveAccessibleDescription("Are you sure?");
  });
});
```

- [ ] **Step 3: Run test to confirm it fails**

Run: `cd apps/web && pnpm test:run components/ui/modal.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement Modal**

Create `apps/web/components/ui/modal.tsx`:

```tsx
"use client";
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { modalEnter } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

type ModalRootProps = React.ComponentProps<typeof Dialog.Root>;

function ModalRoot(props: ModalRootProps) {
  return <Dialog.Root {...props} />;
}

ModalRoot.Trigger = Dialog.Trigger;
ModalRoot.Close = Dialog.Close;

export const Modal = ModalRoot;

export function ModalContent({ className, children, ...props }: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <AnimatePresence>
        <Dialog.Overlay asChild forceMount>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 bg-black/60 z-50"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild forceMount {...props}>
          <motion.div
            variants={modalEnter}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
              "w-full max-w-md bg-bg-elevated border border-border-strong rounded-modal p-6 z-50",
              "shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
              className,
            )}
          >
            {children}
          </motion.div>
        </Dialog.Content>
      </AnimatePresence>
    </Dialog.Portal>
  );
}

export function ModalTitle(props: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title {...props} className={cn("text-[18px] font-semibold text-text-primary mb-1", props.className)} />;
}
export function ModalDescription(props: React.ComponentProps<typeof Dialog.Description>) {
  return <Dialog.Description {...props} className={cn("text-[13px] text-text-secondary", props.className)} />;
}
```

- [ ] **Step 5: Run test to confirm it passes**

Run: `cd apps/web && pnpm test:run components/ui/modal.test.tsx`
Expected: 2 tests pass.

- [ ] **Step 6: Storybook story**

Create `apps/web/components/ui/modal.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "./modal";
import { Button } from "./button";

const meta: Meta = { title: "Primitives/Modal" };
export default meta;
type Story = StoryObj;

export const Confirm: Story = {
  render: () => (
    <Modal>
      <Modal.Trigger asChild><Button intent="destructive">Delete account</Button></Modal.Trigger>
      <ModalContent>
        <ModalTitle>Delete this account?</ModalTitle>
        <ModalDescription>
          We'll stop scanning and purge historical findings after 30 days. This can't be undone.
        </ModalDescription>
        <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
          <Modal.Close asChild><Button intent="ghost">Cancel</Button></Modal.Close>
          <Modal.Close asChild><Button intent="destructive">Delete</Button></Modal.Close>
        </div>
      </ModalContent>
    </Modal>
  ),
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/ui/modal.tsx apps/web/components/ui/modal.test.tsx apps/web/components/ui/modal.stories.tsx apps/web/package.json ../../pnpm-lock.yaml
git commit -m "design-system: Modal on Radix Dialog (focus trap + a11y)"
```

---

### Task 16: Toast component (aria-live queue)

**Files:**
- Create: `apps/web/components/ui/toast.tsx`
- Create: `apps/web/components/ui/toast.test.tsx`
- Create: `apps/web/components/ui/toast.stories.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/components/ui/toast.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./toast";

function Harness() {
  const toast = useToast();
  return <button onClick={() => toast.push({ kind: "savings", title: "Saved $1,234" })}>fire</button>;
}

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders a toast inside a polite live region and dismisses after 5s", async () => {
    render(<ToastProvider><Harness /></ToastProvider>);
    await act(async () => { screen.getByText("fire").click(); });
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("Saved $1,234")).toBeInTheDocument();

    await act(async () => { vi.advanceTimersByTime(5_500); });
    expect(screen.queryByText("Saved $1,234")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd apps/web && pnpm test:run components/ui/toast.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement Toast**

Create `apps/web/components/ui/toast.tsx`:

```tsx
"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toastEnter } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

type ToastKind = "intelligence" | "savings" | "waste" | "risk" | "neutral";

type ToastInput  = { kind?: ToastKind; title: string; body?: string; durationMs?: number };
type ToastRecord = Required<Omit<ToastInput, "body" | "durationMs">> & { id: number; body?: string; durationMs: number };

type ToastCtx = { push: (t: ToastInput) => void };
const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<ToastRecord[]>([]);
  const nextId = React.useRef(1);

  const push = React.useCallback((t: ToastInput) => {
    const id = nextId.current++;
    const record: ToastRecord = { id, kind: t.kind ?? "neutral", title: t.title, body: t.body, durationMs: t.durationMs ?? 5000 };
    setList((cur) => [...cur, record]);
    setTimeout(() => setList((cur) => cur.filter((x) => x.id !== id)), record.durationMs);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="false" className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {list.map((t) => (
            <motion.div
              key={t.id}
              variants={toastEnter}
              initial="hidden" animate="visible" exit="exit"
              className={cn(
                "pointer-events-auto min-w-[280px] max-w-[360px] px-4 py-3 rounded-card border bg-bg-elevated shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
                borderForKind(t.kind),
              )}
            >
              <div className="text-[13px] font-medium text-text-primary">{t.title}</div>
              {t.body ? <div className="text-mono-sm text-text-muted mt-0.5">{t.body}</div> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

function borderForKind(k: ToastKind) {
  switch (k) {
    case "intelligence": return "border-intel-500";
    case "savings":      return "border-savings-500";
    case "waste":        return "border-waste-500";
    case "risk":         return "border-risk-500";
    default:             return "border-border-strong";
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

Run: `cd apps/web && pnpm test:run components/ui/toast.test.tsx`
Expected: 1 test passes.

- [ ] **Step 5: Storybook story**

Create `apps/web/components/ui/toast.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ToastProvider, useToast } from "./toast";
import { Button } from "./button";

function Demo() {
  const t = useToast();
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={() => t.push({ kind: "savings", title: "Saved $1,234/mo", body: "8 rightsizing fixes applied." })}>Savings</Button>
      <Button intent="secondary"   onClick={() => t.push({ kind: "intelligence", title: "Engine finished scan", body: "248,458 resources in 111s." })}>Intel</Button>
      <Button intent="destructive" onClick={() => t.push({ kind: "waste", title: "Anomaly: $4,201 spike", body: "us-east-1 RDS." })}>Waste</Button>
      <Button intent="ghost"       onClick={() => t.push({ kind: "risk", title: "Drift detected", body: "3 instances diverged from forecast band." })}>Risk</Button>
    </div>
  );
}

const meta: Meta = { title: "Primitives/Toast", decorators: [(S) => <ToastProvider><S /></ToastProvider>] };
export default meta;
type Story = StoryObj;

export const Triggers: Story = { render: () => <Demo /> };
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/ui/toast.tsx apps/web/components/ui/toast.test.tsx apps/web/components/ui/toast.stories.tsx
git commit -m "design-system: Toast (aria-live + semantic kinds)"
```

---

### Task 17: Empty state component

**Files:**
- Create: `apps/web/components/ui/empty.tsx`
- Create: `apps/web/components/ui/empty.stories.tsx`

- [ ] **Step 1: Implement Empty**

Create `apps/web/components/ui/empty.tsx`:

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyProps = {
  title: string;
  body?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export function Empty({ title, body, icon, action, className }: EmptyProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center px-6 py-12",
      "border border-dashed border-border-subtle rounded-card bg-bg-surface",
      className,
    )}>
      {icon ? <div className="text-text-muted mb-3">{icon}</div> : null}
      <div className="text-[15px] font-medium text-text-primary">{title}</div>
      {body ? <div className="text-mono-sm text-text-muted mt-1 max-w-sm">{body}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Storybook story**

Create `apps/web/components/ui/empty.stories.tsx`:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Empty } from "./empty";
import { Button } from "./button";

const meta: Meta<typeof Empty> = { title: "Primitives/Empty", component: Empty };
export default meta;
type Story = StoryObj<typeof Empty>;

export const NoAccount: Story = {
  args: {
    title: "Connect your AWS account",
    body: "Stratos analyzes read-only billing + telemetry. Two minutes to set up. We can't touch any resource.",
    action: <Button>Connect AWS</Button>,
  },
};

export const NoFindings: Story = {
  args: {
    title: "Nothing to flag",
    body: "Every resource scanned is within healthy thresholds. We'll alert you the moment that changes.",
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/empty.tsx apps/web/components/ui/empty.stories.tsx
git commit -m "design-system: Empty state component"
```

---

## Phase 4 — Storybook validation

### Task 18: Run all tests + storybook build smoke

**Files:** none (validation only)

- [ ] **Step 1: Run the full vitest suite**

Run: `cd apps/web && pnpm test:run`
Expected: All test files pass (motion, button, stat, table, modal, toast — at least 6 files, 11+ assertions).

- [ ] **Step 2: Build Storybook to confirm every story compiles**

Run: `cd apps/web && pnpm storybook:build`
Expected: Build completes with no errors. Output in `storybook-static/`.

- [ ] **Step 3: Boot Storybook + manual a11y pass**

Run: `cd apps/web && pnpm storybook`
For each story under `Primitives/*`, open the Accessibility panel. Confirm there are zero "Violations" reported by axe. Note any "Incomplete" items — these are not blockers but log them in the commit message if found.
Kill the server.

- [ ] **Step 4: Commit (storybook-static is gitignored — only verifying it builds)**

If `apps/web/storybook-static/` exists, add to `.gitignore`:
```bash
echo "apps/web/storybook-static/" >> .gitignore
git add .gitignore
git commit -m "design-system: ignore Storybook build output" || echo "nothing to commit"
```

---

## Phase 5 — Migrate existing screens

### Task 19: Migrate dashboard components to new tokens

**Files:**
- Modify: `apps/web/components/dashboard/cost-map.tsx`
- Modify: `apps/web/components/dashboard/forecast-cone.tsx`
- Modify: `apps/web/components/dashboard/live-scan-ticker.tsx`
- Modify: `apps/web/components/dashboard/opportunity-card.tsx`
- Modify: `apps/web/components/dashboard/opportunity-feed.tsx`
- Modify: `apps/web/components/dashboard/proof-mode-toggle.tsx`
- Modify: `apps/web/components/dashboard/pulse-strip.tsx`
- Modify: `apps/web/components/dashboard/pulse-tile.tsx`

- [ ] **Step 1: Identify every old token usage**

Run from the repo root:
```bash
grep -rEn "bg-bg-raised|bg-bg-subtle|bg-bg(?!-canvas|-surface|-elevated|-sunken)|text-fg|text-fg-muted|text-fg-subtle|border-border(?!-subtle|-strong)|bg-brand|text-brand|bg-good|text-good|bg-bad|text-bad|bg-warn|text-warn|text-data-" apps/web/components/dashboard apps/web/app/proof apps/web/app/dashboard 2>&1 | tee /tmp/token-migration.txt
```
Expected: a list of file:line references. This is the work-list for Steps 2-3.

- [ ] **Step 2: Apply the token rename map**

| Old class | New class |
|---|---|
| `bg-bg` | `bg-bg-canvas` |
| `bg-bg-raised` | `bg-bg-surface` |
| `bg-bg-subtle` | `bg-bg-elevated` |
| `border-border` | `border-border-subtle` |
| `border-border-strong` | `border-border-strong` *(unchanged)* |
| `text-fg` | `text-text-primary` |
| `text-fg-muted` | `text-text-muted` |
| `text-fg-subtle` | `text-text-faint` |
| `bg-brand` | `bg-intel-500` |
| `text-brand` | `text-intel-300` |
| `bg-good` | `bg-savings-500` |
| `text-good` | `text-savings-500` |
| `bg-bad` | `bg-waste-500` |
| `text-bad` | `text-waste-500` |
| `bg-warn` | `bg-risk-500` |
| `text-warn` | `text-risk-500` |
| `text-data-sm` | `text-mono-sm` |
| `text-data-lg` | `text-kpi-sm` |
| `text-data-xl` | `text-kpi` |
| `rounded-xl` (on cards) | `rounded-card` |

Use `apps/web/components/dashboard/*.tsx` and walk each file from `/tmp/token-migration.txt`. For mechanical renames you can do bulk sed:

```bash
cd apps/web
# Backgrounds
sed -i 's/\bbg-bg-raised\b/bg-bg-surface/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\bbg-bg-subtle\b/bg-bg-elevated/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
# Borders
sed -i 's/\bborder-border\b/border-border-subtle/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
# Text
sed -i 's/\btext-fg-muted\b/text-text-muted/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-fg-subtle\b/text-text-faint/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-fg\b/text-text-primary/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
# Brand / semantic
sed -i 's/\bbg-brand\b/bg-intel-500/g'   components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-brand\b/text-intel-300/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\bbg-good\b/bg-savings-500/g'   components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-good\b/text-savings-500/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\bbg-bad\b/bg-waste-500/g'     components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-bad\b/text-waste-500/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\bbg-warn\b/bg-risk-500/g'     components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-warn\b/text-risk-500/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
# Typography
sed -i 's/\btext-data-sm\b/text-mono-sm/g' components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-data-lg\b/text-kpi-sm/g'  components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
sed -i 's/\btext-data-xl\b/text-kpi/g'     components/dashboard/*.tsx app/proof/page.tsx app/dashboard/**/*.tsx
```

(Adjust glob if the shell doesn't support `**/*.tsx` — use `find apps/web/app/dashboard -name '*.tsx'` instead.)

- [ ] **Step 3: Re-run the grep to confirm nothing old remains**

Run:
```bash
grep -rEn "bg-bg-raised|bg-bg-subtle|text-fg-muted|text-fg-subtle|text-fg(?!\\w)|bg-brand|text-brand|bg-good|text-good|bg-bad|text-bad|bg-warn|text-warn|text-data-" apps/web/components/dashboard apps/web/app 2>&1
```
Expected: no output. If anything remains, fix by hand.

- [ ] **Step 4: Typecheck + boot**

Run: `cd apps/web && pnpm typecheck`
Expected: PASS.

Run: `cd apps/web && pnpm dev`
Open `http://localhost:3000/proof` and `http://localhost:3000/dashboard`. Expected: pages render in the new palette. Spot-check: indigo is brand, green is savings, red is waste, amber is risk. Cards have `rounded-card` (14px). Numbers use Manrope/JetBrains Mono.
Kill the server.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/dashboard apps/web/app
git commit -m "design-system: migrate dashboard + proof pages to v2 tokens"
```

---

### Task 20: Update bare `bg`/`text` defaults in remaining app/* files

**Files:** any `apps/web/app/**/*.tsx` not covered by Task 19

- [ ] **Step 1: Grep the remaining app tree**

Run: `grep -rEn "bg-bg-raised|bg-bg-subtle|text-fg|bg-brand|text-brand|bg-good|bg-bad|bg-warn|text-data-" apps/web/app/onboarding apps/web/app/sign-in apps/web/app/sign-up apps/web/app/pricing apps/web/app/api 2>&1`
Expected: a (likely short) list of remaining occurrences.

- [ ] **Step 2: Apply the same rename map from Task 19, Step 2**

Use the same sed commands scoped to whichever subdirs have hits. If a directory has no hits, skip it.

- [ ] **Step 3: Boot + spot-check every route**

Run: `cd apps/web && pnpm dev`
Open in turn: `/`, `/pricing`, `/sign-in`, `/sign-up`, `/onboarding`, `/dashboard`, `/proof`. Expected: every route renders without unstyled flashes or broken colors.
Kill the server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app
git commit -m "design-system: migrate remaining app routes to v2 tokens"
```

---

### Task 21: Wrap the app in MotionConfig for reduced-motion honour

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Add MotionConfig**

Edit `apps/web/app/layout.tsx`. Wrap the body content in `<MotionConfig reducedMotion="user">`:

```tsx
// Add to imports:
import { MotionConfig } from "framer-motion";

// Replace the <body> contents:
<body>
  <MotionConfig reducedMotion="user">
    <Suspense fallback={null}>
      <PostHogProvider>{children}</PostHogProvider>
    </Suspense>
  </MotionConfig>
</body>
```

This makes every Framer Motion animation in the tree automatically honour `prefers-reduced-motion: reduce` without each component checking individually (belt-and-braces with the CSS rule in globals.css).

- [ ] **Step 2: Typecheck + boot**

Run: `cd apps/web && pnpm typecheck && pnpm dev`
In Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload `/proof`. Expected: no motion (counter shows final value immediately, sparkline appears fully drawn, cards have no entry animation).
Kill the server.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "design-system: wrap app in MotionConfig reducedMotion=user"
```

---

### Task 22: Final QA pass + readme stub

**Files:**
- Create: `apps/web/components/ui/README.md`

- [ ] **Step 1: Write the design-system readme**

Create `apps/web/components/ui/README.md`:

```markdown
# Stratos Design System v2

Source of truth: `docs/superpowers/specs/2026-05-24-brand-identity-design.md`.

## What lives here

| File | Purpose |
|---|---|
| `button.tsx` | Primary action, with `intent` (primary/secondary/ghost/destructive) + `size` (sm/md/lg) |
| `chip.tsx` | Semantic label tag (intelligence/savings/waste/risk/neutral) |
| `stat.tsx` | KPI tile — label + big numeric + optional caption/delta/srDescription |
| `sparkline.tsx` | Inline trend line — semantic color + draw-in once |
| `card.tsx` | Container with intent border + optional hover lift + optional `animateIn` |
| `input.tsx` | Form input with focus + invalid states |
| `table.tsx` | Dense table — `<Table>`, `<THead>`, `<TBody>`, `<TR>`, `<TH>`, `<TD>` |
| `modal.tsx` | Dialog on top of Radix — focus trap + ESC, exposed as `Modal.Trigger`/`Modal.Close` |
| `toast.tsx` | `<ToastProvider>` + `useToast().push()` — aria-live polite queue |
| `empty.tsx` | Empty-state for "nothing to flag" / "connect your account" |

## Token consumption

- Tailwind classes: `bg-bg-canvas`, `text-text-primary`, `border-intel-500`, etc. — defined in `tailwind.config.ts` from CSS vars in `app/globals.css`.
- Non-Tailwind (Recharts, inline SVG): import from `@/lib/design/tokens`.

## Motion

Never hand-roll durations. Import variants from `@/lib/design/motion` and use Framer Motion. The app is wrapped in `<MotionConfig reducedMotion="user">` — animations auto-collapse when the user prefers reduced motion.

## Adding a new component

1. Create `components/ui/<name>.tsx` using `cva()` for variants and `cn()` for class merging.
2. Add a `components/ui/<name>.stories.tsx` covering every variant.
3. If it has interactive behavior (keyboard, focus, async), add `components/ui/<name>.test.tsx`.
4. Run `pnpm test:run` and `pnpm storybook:build` before commit.
```

- [ ] **Step 2: Run the full validation gauntlet**

Run from `apps/web`:
```bash
pnpm typecheck && pnpm test:run && pnpm storybook:build && pnpm build
```
Expected: every step PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/ui/README.md
git commit -m "design-system: v2 ships — readme + final QA pass"
```

---

## Self-Review Pass

Spec coverage check against `docs/superpowers/specs/2026-05-24-brand-identity-design.md`:

- §2 Audience (CTO/VP Eng) → informs density defaults in Table, Stat, Card; covered.
- §3 Emotional position (Calm authority) → motion timings + Button hover intensity; covered in Task 5 + 8.
- §4 Palette → Tasks 1+2 (Tailwind config + CSS vars) + Task 4 (tokens.ts) cover every named token; the semantic kinds wire through Chip (9), Stat (10), Sparkline (11), Card (12), Toast (16).
- §5 Typography → Task 3 (next/font wiring) + Task 1 (font scale) cover Manrope + JetBrains Mono + every named text size.
- §6 Motion → Task 5 covers easing/duration/variants; Task 21 wraps app in MotionConfig for reduced-motion.
- §7 Space/radius → Task 1 covers radius tokens; spacing scale uses Tailwind defaults which already match.
- §8 Icons/charts → Task 4 exports `chartSeries` and `semanticColor`; icon component is intentionally deferred (use Lucide direct per spec).
- §9 Voice/tone → not implementable in code, but the Empty/Toast/Stat copy in stories follows the "Found N opportunities" pattern.
- §9.5 A11y → Task 2 focus-visible CSS, Task 10 Stat `srDescription`, Task 14 semantic Table roles, Task 15 Modal accessible name/description test, Task 16 Toast aria-live test, Task 18 axe pass; covered.
- §10 Light mode → explicitly out of scope per spec; not addressed; correct.
- §11 What this unlocks → this plan IS sub-project 2; subsequent sub-projects 3–6 build on these components.
- §13 Anti-goals → no carousel, no bounce, no emoji-in-chrome, no stock photos — none are introduced by this plan.

Placeholder scan: no "TBD"/"TODO"/"appropriate error handling"/"similar to Task N" found.

Type consistency: `Modal.Trigger`, `Modal.Close` exposed as static properties on the default export, used identically in test (Task 15 Step 2) and story (Task 15 Step 6). `Toast` uses `useToast()` in both test (16 Step 2) and story (16 Step 5). `Chip` kinds (`intelligence|savings|waste|risk|neutral`) match Toast kinds match `SemanticKind` from tokens.ts. `Stat`'s `tone` variant uses the same names. All consistent.

One gap surfaced + fixed inline: spec §6 mentions "Cost-map cell hover zoom" and "Forecast cone reveal" but those live inside dashboard components — they're not primitives. They are covered indirectly by Task 19 (migration applies new tokens, existing motion code keeps working) and will be re-polished when the feature dashboards sub-project (#6) rebuilds those views. Acceptable; flagged here so future-me knows.
