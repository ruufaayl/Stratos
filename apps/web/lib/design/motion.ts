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
