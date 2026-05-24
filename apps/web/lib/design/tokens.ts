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
