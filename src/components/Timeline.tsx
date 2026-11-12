"use client";

import { AnimatePresence, motion } from "motion/react";
import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { useEditor } from "./Editors";
import { TaskRow } from "./TaskRow";
import { fmtTime } from "@/lib/date";
import { EASE } from "@/lib/motion";
import { detectConflicts, slotsForDay } from "@/lib/planner";
import { useStore } from "@/lib/store";
import type { CalEvent, Task } from "@/lib/types";

type Item =
  | { kind: "event"; start: number; end: number; event: CalEvent }
  | { kind: "task"; start: number; end: number; task: Task };

/** A day's events and time-blocked tasks in order, with a "now" marker for today. */
export function Timeline({ date }: { date: string }) {
  const { data, today, now } = useStore();
  const { openEvent } = useEditor();

  const { items, conflicted } = useMemo(() => {
    const list: Item[] = [];
    for (const e of data.events) {
      if (e.date === date) list.push({ kind: "event", start: e.start, end: e.end, event: e });
    }
    for (const t of data.tasks) {
      if (t.date === date && t.start !== null) {
        list.push({ kind: "task", start: t.start, end: t.start + t.durationMin, task: t });
      }
    }
    list.sort((a, b) => a.start - b.start || a.end - b.end);
    const ids = new Set<string>();
    for (const c of detectConflicts(slotsForDay(data.tasks, data.events, date))) {
      ids.add(c.a.id);
      ids.add(c.b.id);
    }
    return { items: list, conflicted: ids };
  }, [data.events, data.tasks, date]);

  if (!items.length) return null;

  const isToday = date === today;
  const nowIndex = isToday ? items.findIndex((i) => i.end > now) : -1;

  return (
    <ol className="relative">
      <AnimatePresence initial={false}>
        {items.map((item, index) => {
          const id = item.kind === "event" ? item.event.id : item.task.id;
          const past = isToday && item.end <= now;
          const current = isToday && item.start <= now && item.end > now;
          return (
            <motion.li
              key={id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ duration: 0.26, ease: EASE }}
              className="flex gap-3"
            >
              <div className="flex w-[68px] shrink-0 flex-col items-end pt-[15px]">
                <span className={`tabular text-[13px] ${current ? "text-accent" : "text-muted"}`}>
                  {fmtTime(item.start)}
                </span>
              </div>
              <div className="relative flex w-3 shrink-0 justify-center">
                {index < items.length - 1 && (
                  <span className="absolute bottom-0 top-[26px] w-px bg-line" aria-hidden />
                )}
                <span
                  aria-hidden
                  className={`mt-[19px] h-2 w-2 rounded-full ${
                    current || index === nowIndex
                      ? "bg-accent"
                      : item.kind === "event"
                        ? "bg-muted/70"
                        : "border border-muted/70"
                  }`}
                />
              </div>
              <div className={`min-w-0 flex-1 pb-1 ${past ? "opacity-70" : ""}`}>
                {item.kind === "task" ? (
                  <TaskRow task={item.task} hideTime conflict={conflicted.has(item.task.id)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => openEvent(item.event)}
                    className="flex min-h-12 w-full flex-col justify-center rounded-lg py-1.5 text-left"
                    aria-label={`Edit event: ${item.event.title}`}
                  >
                    <span className="truncate text-[15px]">{item.event.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-muted">
                      <span className="tabular">until {fmtTime(item.event.end)}</span>
                      {item.event.location && (
                        <>
                          <span aria-hidden>·</span>
                          <MapPin size={12} aria-hidden />
                          <span className="truncate">{item.event.location}</span>
                        </>
                      )}
                      {conflicted.has(item.event.id) && <span className="text-danger">· Overlaps</span>}
                    </span>
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
