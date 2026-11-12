"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useEditor } from "@/components/Editors";
import { TaskList } from "@/components/TaskList";
import { Timeline } from "@/components/Timeline";
import { Card, Empty, PageHeader, SectionTitle } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { addDays, addMonths, fmtLongDate, fmtShortDate, fromKey, monthGrid, relativeDay, toKey } from "@/lib/date";
import { EASE } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { sortTasks } from "@/lib/tasks";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthOf = (key: string) => key.slice(0, 7);
const firstOf = (key: string) => `${monthOf(key)}-01`;

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir * -36 }),
};

export default function CalendarPage() {
  const { data, today } = useStore();
  const { openEvent, openTask } = useEditor();
  const [month, setMonth] = useState(() => firstOf(today));
  const [selected, setSelected] = useState(today);
  const [dir, setDir] = useState(1);
  const grid = useRef<HTMLDivElement>(null);

  const days = useMemo(() => monthGrid(month), [month]);
  const marks = useMemo(() => {
    const map = new Map<string, { events: number; open: number }>();
    const at = (d: string) => map.get(d) ?? map.set(d, { events: 0, open: 0 }).get(d)!;
    for (const e of data.events) at(e.date).events++;
    for (const t of data.tasks) if (!t.done) at(t.date).open++;
    return map;
  }, [data.events, data.tasks]);

  const shiftMonth = (delta: number) => {
    const next = addMonths(month, delta);
    setDir(delta);
    setMonth(next);
    // Keep a day selected inside the visible month.
    const day = Math.min(
      fromKey(selected).getDate(),
      new Date(fromKey(next).getFullYear(), fromKey(next).getMonth() + 1, 0).getDate(),
    );
    const d = fromKey(next);
    d.setDate(day);
    setSelected(toKey(d));
  };

  const select = (date: string, focus = false) => {
    if (monthOf(date) !== monthOf(month)) {
      setDir(date > month ? 1 : -1);
      setMonth(firstOf(date));
    }
    setSelected(date);
    if (focus) {
      // After the month re-renders, move keyboard focus to the new day.
      setTimeout(() => grid.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus(), 60);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (delta) {
      e.preventDefault();
      select(addDays(selected, delta), true);
    } else if (e.key === "PageUp" || e.key === "PageDown") {
      e.preventDefault();
      shiftMonth(e.key === "PageUp" ? -1 : 1);
    }
  };

  const dayTasks = data.tasks.filter((t) => t.date === selected);
  const dayEvents = data.events.filter((e) => e.date === selected);
  const hasTimeline = dayEvents.length > 0 || dayTasks.some((t) => t.start !== null);
  const anytime = sortTasks(dayTasks.filter((t) => t.start === null));
  const monthLabel = fromKey(month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader
        title="Calendar"
        action={
          <Button
            size="sm"
            onClick={() => select(today)}
            disabled={selected === today && monthOf(month) === monthOf(today)}
          >
            Today
          </Button>
        }
      />

      <Card className="overflow-hidden p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between">
          <Button size="icon" variant="ghost" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </Button>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={month}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: EASE }}
              className="text-[17px] font-medium tracking-tight"
              aria-live="polite"
            >
              {monthLabel}
            </motion.h2>
          </AnimatePresence>
          <Button size="icon" variant="ghost" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </Button>
        </div>

        <div className="grid grid-cols-7 pb-1 text-center text-xs text-muted" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={month}
            ref={grid}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: EASE }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) shiftMonth(1);
              else if (info.offset.x > 60) shiftMonth(-1);
            }}
            role="grid"
            aria-label={monthLabel}
            onKeyDown={onKeyDown}
            className="grid touch-pan-y grid-cols-7 gap-y-1"
          >
            {days.map((d) => {
              const inMonth = monthOf(d) === monthOf(month);
              const isSelected = d === selected;
              const isToday = d === today;
              const m = marks.get(d);
              const summary = [
                m?.events ? `${m.events} ${m.events === 1 ? "event" : "events"}` : "",
                m?.open ? `${m.open} open ${m.open === 1 ? "task" : "tasks"}` : "",
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  data-date={d}
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${fmtLongDate(d)}${summary ? `, ${summary}` : ""}`}
                  onClick={() => select(d)}
                  className="relative mx-auto flex h-11 w-full max-w-12 flex-col items-center justify-center rounded-xl"
                >
                  {isSelected && (
                    <motion.span
                      layoutId="cal-selected"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                      className="absolute inset-0.5 rounded-xl bg-accent"
                    />
                  )}
                  <span
                    className={`tabular relative text-[15px] leading-none ${
                      isSelected
                        ? "font-medium text-accent-ink"
                        : isToday
                          ? "font-medium text-accent"
                          : inMonth
                            ? "text-ink"
                            : "text-muted/45"
                    }`}
                  >
                    {fromKey(d).getDate()}
                  </span>
                  <span className="relative mt-1 flex h-1 gap-0.5" aria-hidden>
                    {m?.events ? (
                      <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-accent-ink/70" : "bg-muted"}`} />
                    ) : null}
                    {m?.open ? (
                      <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-accent-ink" : "bg-accent"}`} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </Card>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={selected}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          transition={{ duration: 0.24, ease: EASE }}
          className="mt-7"
          aria-label={fmtLongDate(selected)}
        >
          <SectionTitle
            action={
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => openEvent({ date: selected })}>
                  <Plus size={15} aria-hidden /> Event
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openTask({ date: selected })}>
                  <Plus size={15} aria-hidden /> Task
                </Button>
              </div>
            }
          >
            {relativeDay(selected, today)}
            {relativeDay(selected, today) !== fmtShortDate(selected) && (
              <span className="ml-2 hidden font-normal text-muted sm:inline">{fmtLongDate(selected)}</span>
            )}
          </SectionTitle>

          {!hasTimeline && anytime.length === 0 ? (
            <Empty
              title="Nothing scheduled."
              body="A free day. Keep it that way, or add something."
              action={
                <Button variant="primary" onClick={() => openEvent({ date: selected })}>
                  Add event
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {hasTimeline && (
                <Card className="py-2 pl-1 pr-3">
                  <Timeline date={selected} />
                </Card>
              )}
              {anytime.length > 0 && <TaskList tasks={anytime} />}
            </div>
          )}
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
