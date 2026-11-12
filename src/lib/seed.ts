/** Demo data, generated relative to "today" so the app always looks alive. */
import { addDays, fromKey } from "./date";
import { DEFAULT_SETTINGS, type AppData, type Task } from "./types";

export function emptyData(theme: AppData["settings"]["theme"] = "dark"): AppData {
  return {
    tasks: [],
    events: [],
    notes: [],
    goals: [],
    sessions: [],
    reviews: [],
    settings: { ...DEFAULT_SETTINGS, theme },
  };
}

export function buildSeed(today: string, theme: AppData["settings"]["theme"] = "dark"): AppData {
  const at = (key: string, min: number) => fromKey(key).getTime() + min * 60_000;
  let n = 0;
  const id = (p: string) => `seed-${p}-${++n}`;

  const task = (
    offset: number,
    title: string,
    o: Partial<Pick<Task, "priority" | "durationMin" | "start" | "notes">> & { doneAt?: number } = {},
  ): Task => {
    const date = addDays(today, offset);
    return {
      id: id("t"),
      title,
      notes: o.notes ?? "",
      date,
      priority: o.priority ?? false,
      durationMin: o.durationMin ?? 30,
      start: o.start ?? null,
      done: o.doneAt !== undefined,
      completedAt: o.doneAt !== undefined ? at(date, o.doneAt) : null,
      createdAt: at(date, 7 * 60) + n,
    };
  };

  const tasks: Task[] = [
    // Today — one already done so progress is visibly in motion.
    task(0, "Review weekly goals", { durationMin: 15, start: 8 * 60, doneAt: 8 * 60 + 15 }),
    task(0, "Draft project proposal", {
      priority: true,
      durationMin: 60,
      start: 9 * 60,
      notes: "Outline first, then the budget section. Keep it to two pages.",
    }),
    task(0, "Prepare slides for design review", { priority: true, durationMin: 45, start: 13 * 60 }),
    task(0, "Reply to client email", { priority: true, durationMin: 20 }),
    task(0, "30-minute walk", { durationMin: 30 }),
    // One left behind, to show smart rescheduling.
    task(-1, "Book dentist appointment", { durationMin: 10 }),
    // History for streak and weekly consistency.
    task(-1, "Send invoice", { priority: true, doneAt: 10 * 60 }),
    task(-1, "Plan next sprint", { durationMin: 45, doneAt: 15 * 60 }),
    task(-2, "Write meeting notes", { doneAt: 11 * 60 }),
    task(-2, "Gym session", { durationMin: 60, doneAt: 18 * 60 }),
    task(-3, "Clean up inbox", { durationMin: 20, doneAt: 9 * 60 }),
    task(-3, "Call the bank", { durationMin: 15 }),
    task(-4, "Read two chapters", { durationMin: 40, doneAt: 20 * 60 }),
    task(-6, "Outline quarterly report", { priority: true, durationMin: 50, doneAt: 14 * 60 }),
    // Ahead.
    task(1, "Finalize proposal budget", { priority: true, durationMin: 45 }),
    task(1, "Grocery run", { durationMin: 40 }),
    task(2, "Prepare 1:1 agenda", { durationMin: 20 }),
  ];

  const ev = (offset: number, title: string, start: number, end: number, location = "") => ({
    id: id("e"),
    title,
    date: addDays(today, offset),
    start,
    end,
    location,
  });

  const events = [
    ev(0, "Team standup", 10 * 60 + 30, 11 * 60, "Video call"),
    ev(0, "Design review", 15 * 60, 16 * 60, "Studio room"),
    ev(1, "Lunch with Sam", 12 * 60 + 30, 13 * 60 + 30, "Café Luna"),
    ev(2, "Dentist", 9 * 60, 9 * 60 + 45),
    ev(4, "Quarterly planning", 14 * 60, 15 * 60 + 30, "Main office"),
    ev(-2, "Product demo", 16 * 60, 17 * 60),
  ];

  const now = Date.now();
  const notes = [
    {
      id: id("n"),
      title: "Proposal ideas",
      body: "Lead with the outcome, not the process.\nThree options: lean, standard, full.\nAsk Sam for last year's numbers.",
      createdAt: now - 86_400_000,
      updatedAt: now - 3_600_000,
    },
    {
      id: id("n"),
      title: "Books to read",
      body: "Deep Work\nThe Checklist Manifesto\nFour Thousand Weeks",
      createdAt: now - 4 * 86_400_000,
      updatedAt: now - 2 * 86_400_000,
    },
  ];

  const goals = [
    {
      id: id("g"),
      title: "Ship the client proposal",
      createdAt: now - 6 * 86_400_000,
      milestones: [
        { id: id("m"), title: "Outline approved", done: true },
        { id: id("m"), title: "First draft", done: false },
        { id: id("m"), title: "Budget finalized", done: false },
        { id: id("m"), title: "Sent to client", done: false },
      ],
    },
    {
      id: id("g"),
      title: "Read 12 books this year",
      createdAt: now - 30 * 86_400_000,
      milestones: [
        { id: id("m"), title: "3 books", done: true },
        { id: id("m"), title: "6 books", done: true },
        { id: id("m"), title: "9 books", done: false },
        { id: id("m"), title: "12 books", done: false },
      ],
    },
  ];

  const session = (offset: number, minutes: number, min: number) => {
    const date = addDays(today, offset);
    return { id: id("s"), date, minutes, taskId: null, completedAt: at(date, min) };
  };
  const sessions = [
    session(-1, 25, 10 * 60),
    session(-1, 25, 14 * 60),
    session(-2, 50, 11 * 60),
    session(-4, 25, 9 * 60),
    session(-6, 50, 13 * 60),
  ];

  const yesterday = addDays(today, -1);
  const reviews = [
    {
      id: yesterday,
      date: yesterday,
      wentWell: "Finished the invoice early and protected the afternoon for planning.",
      improve: "Start the hardest task before opening email.",
    },
  ];

  return {
    tasks,
    events,
    notes,
    goals,
    sessions,
    reviews,
    settings: { ...DEFAULT_SETTINGS, theme },
  };
}
