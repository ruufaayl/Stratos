import type { Config } from "tailwindcss";

// Stratos design tokens — dark-first command center.
// Palette from CLAUDE.md: indigo (intelligence), emerald (savings),
// red (waste), amber (risk). Engineers work at night. #0A0A0F background.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0A0A0F",       // app background — pure night
          raised: "#10101A",        // cards, surfaces
          subtle: "#16161F",        // hover, secondary surfaces
        },
        border: {
          DEFAULT: "#1F1F2B",
          strong: "#2A2A38",
        },
        fg: {
          DEFAULT: "#E8E8F0",
          muted: "#9090A8",
          subtle: "#5E5E78",
        },
        brand: {
          DEFAULT: "#6366F1",       // indigo — intelligence, trust
          hover: "#7479F4",
        },
        good: "#10B981",            // emerald — savings, efficiency
        bad: "#EF4444",              // red — waste, money burning
        warn: "#F59E0B",             // amber — risk, attention
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        // data-dense: tight tracking, slightly larger numerals
        "data-sm": ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "-0.005em" }],
        "data-lg": ["1.5rem", { lineHeight: "1.75rem", letterSpacing: "-0.02em" }],
        "data-xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
