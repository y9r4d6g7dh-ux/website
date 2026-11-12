import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { openRepo } from "@/lib/db";
import { buildSeed } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { dayProgress, prioritiesComplete, streak, weekStats, consistency } from "@/lib/stats";
import { task } from "./helpers";

let dbCount = 0;
const freshName = () => `easylife-test-${++dbCount}`;

describe("task persistence (IndexedDB)", () => {
  it("returns null before anything is saved", async () => {
    const repo = await openRepo(freshName());
    expect(await repo.load()).toBeNull();
    repo.close();
  });

  it("persists tasks across reopening the database", async () => {
    const name = freshName();
    const repo = await openRepo(name);
    await repo.saveSettings(DEFAULT_SETTINGS);
    const t = task({ title: "Write tests", priority: true });
    await repo.put("tasks", t);
    repo.close();

    const again = await openRepo(name);
    const data = await again.load();
    expect(data?.tasks).toEqual([t]);
    again.close();
  });

  it("updates and deletes tasks", async () => {
    const repo = await openRepo(freshName());
    await repo.saveSettings(DEFAULT_SETTINGS);
    const a = task();
    const b = task();
    await repo.putMany("tasks", [a, b]);
    await repo.put("tasks", { ...a, done: true, completedAt: 123 });
    await repo.remove("tasks", b.id);
    const data = await repo.load();
    expect(data?.tasks).toEqual([{ ...a, done: true, completedAt: 123 }]);
    repo.close();
  });

  it("seeds and resets every store atomically", async () => {
    const repo = await openRepo(freshName());
    const seed = buildSeed("2026-11-12");
    await repo.replaceAll(seed);
    await repo.put("tasks", task({ title: "Extra" }));
    await repo.put("notes", { id: "n-x", title: "Scratch", body: "", createdAt: 1, updatedAt: 1 });
    await repo.replaceAll(seed);
    const data = await repo.load();
    expect(data?.tasks).toHaveLength(seed.tasks.length);
    expect(data?.notes).toHaveLength(seed.notes.length);
    expect(data?.events).toHaveLength(seed.events.length);
    expect(data?.settings.dayStart).toBe(DEFAULT_SETTINGS.dayStart);
    repo.close();
  });
});

describe("seed data and progress tracking", () => {
  const today = "2026-11-12";
  const seed = buildSeed(today);

  it("gives today three priority tasks and two events", () => {
    expect(seed.tasks.filter((t) => t.date === today && t.priority)).toHaveLength(3);
    expect(seed.events.filter((e) => e.date === today)).toHaveLength(2);
    expect(new Set(seed.tasks.map((t) => t.id)).size).toBe(seed.tasks.length);
  });

  it("computes daily progress and priority completion", () => {
    expect(dayProgress(seed.tasks, today)).toEqual({ total: 5, done: 1, pct: 20 });
    expect(prioritiesComplete(seed.tasks, today)).toBe(false);
    const allDone = seed.tasks.map((t) => (t.priority ? { ...t, done: true } : t));
    expect(prioritiesComplete(allDone, today)).toBe(true);
    expect(dayProgress([], today).pct).toBe(0);
  });

  it("counts a streak without breaking on an unfinished today", () => {
    const at = (d: number) => new Date(2026, 10, d, 12).getTime();
    const done = (d: number) => task({ done: true, completedAt: at(d) });
    expect(streak([done(11), done(10), done(8)], today)).toBe(2);
    expect(streak([done(12), done(11)], today)).toBe(2);
    expect(streak([done(9)], today)).toBe(0);
  });

  it("summarises the last seven days", () => {
    const week = weekStats(seed.tasks, seed.sessions, today);
    expect(week).toHaveLength(7);
    expect(week[6].date).toBe(today);
    expect(week[5].focusMin).toBe(50);
    expect(consistency(week)).toBeGreaterThan(50);
  });
});
