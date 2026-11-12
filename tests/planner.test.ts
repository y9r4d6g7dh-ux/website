import { describe, expect, it } from "vitest";
import { detectConflicts, freeWindows, planDay, slotsForDay, validatePlan } from "@/lib/planner";
import { answerLocally, parseQuickTask } from "@/lib/assistant";
import { event, task } from "./helpers";

const DAY = { dayStart: 8 * 60, dayEnd: 18 * 60 };

describe("planDay (local planning engine)", () => {
  it("schedules priority tasks first", () => {
    const normal = task({ title: "Normal" });
    const pri = task({ title: "Priority", priority: true });
    const plan = planDay({ tasks: [normal, pri], events: [], ...DAY });
    expect(plan.blocks.map((b) => b.taskId)).toEqual([pri.id, normal.id]);
    expect(plan.blocks[0].start).toBe(8 * 60);
  });

  it("never overlaps events or other tasks", () => {
    const events = [event({ start: 9 * 60, end: 10 * 60 }), event({ start: 11 * 60, end: 12 * 60 })];
    const tasks = [
      task({ durationMin: 60, priority: true }),
      task({ durationMin: 45 }),
      task({ durationMin: 90 }),
      task({ durationMin: 30 }),
    ];
    const plan = planDay({ tasks, events, ...DAY });
    expect(plan.unscheduled).toEqual([]);
    expect(validatePlan(plan.blocks, tasks, events, DAY.dayStart, DAY.dayEnd)).toEqual([]);
  });

  it("uses a gap only when the task fits in it", () => {
    const events = [event({ start: 8 * 60 + 30, end: 12 * 60 })];
    const long = task({ durationMin: 60 });
    const plan = planDay({ tasks: [long], events, ...DAY });
    expect(plan.blocks[0].start).toBe(12 * 60);
  });

  it("does not schedule in the past when planning today", () => {
    const plan = planDay({ tasks: [task()], events: [], ...DAY, now: 13 * 60 + 7 });
    expect(plan.blocks[0].start).toBe(13 * 60 + 15);
  });

  it("reports tasks that do not fit instead of overbooking", () => {
    const tasks = [task({ durationMin: 120, priority: true }), task({ durationMin: 120 })];
    const plan = planDay({ tasks, events: [], dayStart: 8 * 60, dayEnd: 11 * 60 });
    expect(plan.blocks).toHaveLength(1);
    expect(plan.unscheduled).toEqual([tasks[1].id]);
  });

  it("skips completed tasks and keeps a buffer between blocks", () => {
    const done = task({ done: true });
    const a = task();
    const b = task();
    const plan = planDay({ tasks: [done, a, b], events: [], ...DAY, bufferMin: 5 });
    expect(plan.blocks.map((x) => x.taskId)).toEqual([a.id, b.id]);
    expect(plan.blocks[1].start).toBeGreaterThanOrEqual(plan.blocks[0].end + 5);
  });

  it("is deterministic", () => {
    const tasks = [task({ priority: true }), task(), task({ durationMin: 50 })];
    const events = [event()];
    expect(planDay({ tasks, events, ...DAY })).toEqual(planDay({ tasks: [...tasks].reverse(), events, ...DAY }));
  });
});

describe("scheduling conflict detection", () => {
  const slot = (id: string, start: number, end: number, kind: "task" | "event" = "event") => ({
    id,
    kind,
    title: id,
    start,
    end,
  });

  it("finds overlapping slots and measures the overlap", () => {
    const conflicts = detectConflicts([slot("a", 600, 660), slot("b", 630, 700)]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMin).toBe(30);
  });

  it("treats back-to-back slots as fine", () => {
    expect(detectConflicts([slot("a", 600, 660), slot("b", 660, 700)])).toEqual([]);
  });

  it("finds every pair when three slots overlap", () => {
    expect(detectConflicts([slot("a", 600, 720), slot("b", 610, 640), slot("c", 630, 700)])).toHaveLength(3);
  });

  it("detects a contained slot regardless of input order", () => {
    const conflicts = detectConflicts([slot("inner", 620, 630), slot("outer", 600, 700)]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMin).toBe(10);
  });

  it("builds day slots from events and open time-blocked tasks only", () => {
    const t1 = task({ start: 600, durationMin: 30 });
    const tDone = task({ start: 600, done: true });
    const tLoose = task();
    const tOther = task({ start: 600, date: "2026-11-13" });
    const e = event({ start: 615, end: 645 });
    const slots = slotsForDay([t1, tDone, tLoose, tOther], [e], "2026-11-12");
    expect(slots.map((s) => s.id).sort()).toEqual([e.id, t1.id].sort());
    expect(detectConflicts(slots)).toHaveLength(1);
  });

  it("rejects an invalid proposed plan", () => {
    const t = task({ durationMin: 60 });
    const e = event({ start: 600, end: 660 });
    const problems = validatePlan(
      [
        { taskId: t.id, start: 630, end: 690 },
        { taskId: "ghost", start: 700, end: 730 },
      ],
      [t],
      [e],
      480,
      1080,
    );
    expect(problems.some((p) => p.includes("overlaps"))).toBe(true);
    expect(problems.some((p) => p.includes("Unknown task"))).toBe(true);
    expect(validatePlan([{ taskId: t.id, start: 400, end: 460 }], [t], [], 480, 1080)).toHaveLength(1);
  });

  it("computes free windows around busy time", () => {
    expect(
      freeWindows(
        [
          { start: 540, end: 600 },
          { start: 580, end: 630 },
        ],
        480,
        720,
      ),
    ).toEqual([
      { start: 480, end: 540 },
      { start: 630, end: 720 },
    ]);
  });
});

describe("local demo assistant", () => {
  const ctx = (tasks = [task()], events = [event()]) => ({
    tasks,
    events,
    settings: DAY,
    today: "2026-11-12",
    now: 9 * 60,
  });

  it("parses quick tasks", () => {
    expect(parseQuickTask("Call the bank 30m !")).toEqual({ title: "Call the bank", durationMin: 30, priority: true });
    expect(parseQuickTask("Deep work 1.5h")).toEqual({ title: "Deep work", durationMin: 90, priority: false });
  });

  it("maps phrases to actions", () => {
    expect(answerLocally("add Buy milk 10m", ctx()).action).toEqual({
      type: "addTask",
      title: "Buy milk",
      durationMin: 10,
      priority: false,
    });
    expect(answerLocally("plan my day", ctx()).action).toEqual({ type: "plan" });
    expect(answerLocally("move overdue tasks", ctx([task({ date: "2026-11-10" })])).action).toEqual({ type: "carryOver" });
    expect(answerLocally("tell me a joke", ctx()).text).toContain("not an AI model");
  });
});
