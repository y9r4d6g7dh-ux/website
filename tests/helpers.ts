import type { CalEvent, Task } from "@/lib/types";

let n = 0;
export function task(o: Partial<Task> = {}): Task {
  n++;
  return {
    id: `t${n}`,
    title: `Task ${n}`,
    notes: "",
    date: "2026-11-12",
    priority: false,
    durationMin: 30,
    start: null,
    done: false,
    completedAt: null,
    createdAt: n,
    ...o,
  };
}

export function event(o: Partial<CalEvent> = {}): CalEvent {
  n++;
  return { id: `e${n}`, title: `Event ${n}`, date: "2026-11-12", start: 600, end: 660, location: "", ...o };
}
