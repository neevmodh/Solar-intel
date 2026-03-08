/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Framer Motion Variants
 * ─────────────────────────────────────────────────────────
 * Centralized animation presets. Spring physics for snappy
 * micro-interactions; ease curves for entrance choreography.
 */

import { type Variants } from "framer-motion";

/** Staggered container — orchestrates children */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Fade-up entrance for cards/items */
export const fadeUp: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

/** Subtle scale-up for hover states */
export const hoverLift: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
  hover: {
    scale: 1.015,
    y: -2,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

/** Page transition (AnimatePresence) */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 8,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(4px)",
    transition: {
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

/** Slide-in from left (sidebar) */
export const slideInLeft: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

/** Scale-in for modals/panels */
export const scaleIn: Variants = {
  hidden: { scale: 0.95, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};
