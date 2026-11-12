"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { page } from "@/lib/motion";

/** Re-mounts on every navigation, giving each page a short, calm entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={page}>
      {children}
    </motion.div>
  );
}
