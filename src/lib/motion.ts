/** One motion language for the whole app. */
import type { Transition, Variants } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

export const quick: Transition = { duration: 0.2, ease: EASE };
export const page: Transition = { duration: 0.32, ease: EASE };
export const spring: Transition = { type: "spring", stiffness: 420, damping: 36, mass: 0.9 };
export const softSpring: Transition = { type: "spring", stiffness: 180, damping: 26 };

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

export const collapse = {
  initial: { height: 0, opacity: 0 },
  animate: { height: "auto", opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: { duration: 0.24, ease: EASE },
} as const;
