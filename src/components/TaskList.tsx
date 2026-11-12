"use client";

import { AnimatePresence, motion } from "motion/react";
import { TaskRow } from "./TaskRow";
import { Card } from "./ui/Bits";
import { EASE, spring } from "@/lib/motion";
import type { Task } from "@/lib/types";

/** Card of task rows that animate as they are added, completed and reordered. */
export function TaskList({ tasks, showDate }: { tasks: Task[]; showDate?: boolean }) {
  if (!tasks.length) return null;
  return (
    <Card className="px-2.5 py-1">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
          <motion.div
            key={t.id}
            layout="position"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE } }}
            transition={{ layout: spring, duration: 0.24, ease: EASE }}
            className="overflow-hidden border-b border-line/70 last:border-b-0"
          >
            <TaskRow task={t} showDate={showDate} />
          </motion.div>
        ))}
      </AnimatePresence>
    </Card>
  );
}
