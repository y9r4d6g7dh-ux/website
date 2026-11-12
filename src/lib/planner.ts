/**
 * EasyLife local planning engine.
 *
 * Deterministic and rule-based: the same tasks and events always produce the
 * same plan. This is what powers Local Demo Mode — it is NOT an AI model.
 * It is also used to validate (and fall back from) real AI output.
 */
import type { CalEvent, Task } from "./types";

export interface Interval {
  start: number;
  end: number;
}

export interface Slot extends Interval {
  id: string;
  kind: "task" | "event";
  title: string;
}

export interface Conflict {
  a: Slot;
  b: Slot;
  overlapMin: number;
}

export interface PlanBlock extends Interval {
  taskId: string;
}

export interface Plan {
  blocks: PlanBlock[];
  /** Tasks that did not fit in the remaining working hours. */
  unscheduled: string[];
}

export interface PlanInput {
  tasks: Task[];
  events: CalEvent[];
  dayStart: number;
  dayEnd: number;
  /** Minutes from midnight; pass when planning today so nothing lands in the past. */
  now?: number | null;
  /** Breathing room after each task block. */
  bufferMin?: number;
}

export const GRID_MIN = 15;

const roundUp = (min: number, grid = GRID_MIN) => Math.ceil(min / grid) * grid;

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Every pair of overlapping slots, ordered by time. Back-to-back is not a conflict. */
export function detectConflicts(slots: Slot[]): Conflict[] {
  const sorted = [...slots].sort((x, y) => x.start - y.start || x.end - y.end);
  const conflicts: Conflict[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j].start >= sorted[i].end) break;
      conflicts.push({
        a: sorted[i],
        b: sorted[j],
        overlapMin: Math.min(sorted[i].end, sorted[j].end) - sorted[j].start,
      });
    }
  }
  return conflicts;
}

/** Open windows between `from` and `to` once `busy` intervals are removed. */
export function freeWindows(busy: Interval[], from: number, to: number): Interval[] {
  const sorted = busy
    .filter((b) => b.end > from && b.start < to)
    .sort((a, b) => a.start - b.start);
  const windows: Interval[] = [];
  let cursor = from;
  for (const b of sorted) {
    if (b.start > cursor) windows.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) windows.push({ start: cursor, end: to });
  return windows;
}

/** Priority first, then tasks that already had a time, then oldest first. */
export function planOrder(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(b.priority) - Number(a.priority) ||
      (a.start ?? Infinity) - (b.start ?? Infinity) ||
      a.createdAt - b.createdAt ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Greedy first-fit: walk tasks in plan order and give each the earliest free
 * window that holds it. Events are fixed; tasks never overlap events or each other.
 */
export function planDay(input: PlanInput): Plan {
  const { tasks, events, dayStart, dayEnd, now = null, bufferMin = 5 } = input;
  const from = roundUp(Math.max(dayStart, now ?? dayStart));
  const busy: Interval[] = events.map((e) => ({ start: e.start, end: e.end }));
  const blocks: PlanBlock[] = [];
  const unscheduled: string[] = [];

  for (const task of planOrder(tasks.filter((t) => !t.done))) {
    const duration = Math.max(5, task.durationMin);
    let placed = false;
    for (const w of freeWindows(busy, from, dayEnd)) {
      const start = roundUp(w.start);
      if (start + duration <= w.end) {
        blocks.push({ taskId: task.id, start, end: start + duration });
        busy.push({ start, end: start + duration + bufferMin });
        placed = true;
        break;
      }
    }
    if (!placed) unscheduled.push(task.id);
  }

  blocks.sort((a, b) => a.start - b.start);
  return { blocks, unscheduled };
}

/** Events plus open, time-blocked tasks for one day, as comparable slots. */
export function slotsForDay(tasks: Task[], events: CalEvent[], date: string): Slot[] {
  const slots: Slot[] = events
    .filter((e) => e.date === date)
    .map((e) => ({ id: e.id, kind: "event", title: e.title, start: e.start, end: e.end }));
  for (const t of tasks) {
    if (t.date === date && !t.done && t.start !== null) {
      slots.push({
        id: t.id,
        kind: "task",
        title: t.title,
        start: t.start,
        end: t.start + t.durationMin,
      });
    }
  }
  return slots.sort((a, b) => a.start - b.start);
}

/**
 * Check a proposed plan (e.g. one returned by an AI model) before trusting it.
 * Returns human-readable problems; an empty list means the plan is safe to apply.
 */
export function validatePlan(
  blocks: PlanBlock[],
  tasks: Task[],
  events: CalEvent[],
  dayStart: number,
  dayEnd: number,
): string[] {
  const problems: string[] = [];
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const slots: Slot[] = events.map((e) => ({
    id: e.id,
    kind: "event",
    title: e.title,
    start: e.start,
    end: e.end,
  }));

  for (const b of blocks) {
    const task = byId.get(b.taskId);
    if (!task) {
      problems.push(`Unknown task "${b.taskId}"`);
      continue;
    }
    if (seen.has(b.taskId)) problems.push(`"${task.title}" is scheduled twice`);
    seen.add(b.taskId);
    if (!Number.isFinite(b.start) || !Number.isFinite(b.end) || b.end <= b.start) {
      problems.push(`"${task.title}" has an invalid time`);
      continue;
    }
    if (b.start < dayStart || b.end > dayEnd) {
      problems.push(`"${task.title}" falls outside working hours`);
    }
    slots.push({ id: task.id, kind: "task", title: task.title, start: b.start, end: b.end });
  }

  for (const c of detectConflicts(slots)) {
    if (c.a.kind === "event" && c.b.kind === "event") continue;
    problems.push(`"${c.a.title}" overlaps "${c.b.title}"`);
  }
  return problems;
}

/** Open tasks left behind on earlier days. */
export function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => !t.done && t.date < today);
}
