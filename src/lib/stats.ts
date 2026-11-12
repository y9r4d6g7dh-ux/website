import { addDays, toKey } from "./date";
import type { FocusSession, Task } from "./types";

export interface DayProgress {
  total: number;
  done: number;
  pct: number;
}

export function dayProgress(tasks: Task[], date: string): DayProgress {
  const day = tasks.filter((t) => t.date === date);
  const done = day.filter((t) => t.done).length;
  return { total: day.length, done, pct: day.length ? Math.round((done / day.length) * 100) : 0 };
}

/** True once there is at least one priority task for the day and all are done. */
export function prioritiesComplete(tasks: Task[], date: string): boolean {
  const pri = tasks.filter((t) => t.date === date && t.priority);
  return pri.length > 0 && pri.every((t) => t.done);
}

function completionDays(tasks: Task[]): Set<string> {
  const days = new Set<string>();
  for (const t of tasks) {
    if (t.done && t.completedAt) days.add(toKey(new Date(t.completedAt)));
  }
  return days;
}

/**
 * Consecutive days with at least one completed task. Today counts if you've
 * already completed something, but an unfinished today never breaks the run.
 */
export function streak(tasks: Task[], today: string): number {
  const days = completionDays(tasks);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export interface WeekDay {
  date: string;
  total: number;
  done: number;
  focusMin: number;
}

/** The last seven days, oldest first, ending today. */
export function weekStats(tasks: Task[], sessions: FocusSession[], today: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i - 6);
    const p = dayProgress(tasks, date);
    const focusMin = sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + s.minutes, 0);
    return { date, total: p.total, done: p.done, focusMin };
  });
}

/** Share of the last seven days on which at least one task was completed. */
export function consistency(week: WeekDay[]): number {
  if (!week.length) return 0;
  return Math.round((week.filter((d) => d.done > 0).length / week.length) * 100);
}
