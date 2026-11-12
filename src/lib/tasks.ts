import type { Task } from "./types";

/** Open before done, priority first, then by time, then oldest first. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      Number(b.priority) - Number(a.priority) ||
      (a.start ?? Infinity) - (b.start ?? Infinity) ||
      a.createdAt - b.createdAt,
  );
}
