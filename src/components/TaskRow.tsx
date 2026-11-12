"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useEditor } from "./Editors";
import { Check } from "./ui/Bits";
import { Button } from "./ui/Button";
import { addDays, fmtDuration, fmtTime, relativeDay } from "@/lib/date";
import { useFocus } from "@/lib/focus";
import { collapse, EASE } from "@/lib/motion";
import { GRID_MIN } from "@/lib/planner";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";

interface Props {
  task: Task;
  /** Show the task's day (used in cross-day lists). */
  showDate?: boolean;
  /** Hide the start time when a parent timeline already shows it. */
  hideTime?: boolean;
  conflict?: boolean;
}

export function TaskRow({ task, showDate, hideTime, conflict }: Props) {
  const { toggleTask, updateTask, deleteTask, today, data } = useStore();
  const { openTask } = useEditor();
  const focus = useFocus();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const meta: string[] = [];
  if (showDate) meta.push(relativeDay(task.date, today));
  if (!hideTime && task.start !== null) meta.push(fmtTime(task.start));
  meta.push(fmtDuration(task.durationMin));

  const nudge = (delta: number) => {
    if (task.start === null) return;
    const next = Math.min(24 * 60 - task.durationMin, Math.max(0, task.start + delta));
    updateTask(task.id, { start: next });
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Check
          checked={task.done}
          onChange={() => toggleTask(task.id)}
          label={`${task.done ? "Mark not done" : "Mark done"}: ${task.title}`}
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-lg py-1.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <motion.span
              className="block truncate text-[15px]"
              animate={{ opacity: task.done ? 0.45 : 1 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <span className="relative">
                {task.title}
                <motion.span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-px w-full origin-left bg-current"
                  initial={false}
                  animate={{ scaleX: task.done ? 1 : 0 }}
                  transition={{ duration: 0.28, ease: EASE }}
                />
              </span>
            </motion.span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted">
              {task.priority && !task.done && (
                <span className="inline-flex items-center gap-1 text-accent">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  Priority
                  <span className="text-muted" aria-hidden>
                    ·
                  </span>
                </span>
              )}
              <span className="tabular truncate">{meta.join(" · ")}</span>
              {conflict && !task.done && <span className="text-danger">· Overlaps</span>}
            </span>
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="shrink-0 text-muted"
            aria-hidden
          >
            <ChevronDown size={16} strokeWidth={1.75} />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panelId} {...collapse} className="overflow-hidden">
            <div className="pb-3 pl-[42px] pr-1">
              {task.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{task.notes}</p>
              ) : (
                <p className="text-sm text-muted/70">No notes.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!task.done && (
                  <Button
                    size="sm"
                    onClick={() => {
                      focus.start(data.settings.focusMinutes, task.id);
                      router.push("/focus");
                    }}
                  >
                    Focus
                  </Button>
                )}
                <Button size="sm" onClick={() => openTask(task)}>
                  Edit
                </Button>
                {!task.done && task.start !== null && (
                  <>
                    <Button size="sm" onClick={() => nudge(-GRID_MIN)} aria-label="Move 15 minutes earlier">
                      −15 min
                    </Button>
                    <Button size="sm" onClick={() => nudge(GRID_MIN)} aria-label="Move 15 minutes later">
                      +15 min
                    </Button>
                    <Button size="sm" onClick={() => updateTask(task.id, { start: null })}>
                      Unschedule
                    </Button>
                  </>
                )}
                {!task.done && (
                  <Button
                    size="sm"
                    onClick={() =>
                      updateTask(task.id, {
                        date: addDays(task.date < today ? today : task.date, task.date < today ? 0 : 1),
                        start: null,
                      })
                    }
                  >
                    {task.date < today ? "Move to today" : "Tomorrow"}
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => deleteTask(task.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
