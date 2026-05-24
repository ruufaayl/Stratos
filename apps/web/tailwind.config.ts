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
