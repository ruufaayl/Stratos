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
