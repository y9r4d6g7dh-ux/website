/** Dates are local-day keys ("2026-11-12"); times are minutes from midnight. */

export interface Task {
  id: string;
  title: string;
  notes: string;
  date: string;
  priority: boolean;
  durationMin: number;
  /** Time-block start, or null when the task is not on the day plan yet. */
  start: number | null;
  done: boolean;
  completedAt: number | null;
  createdAt: number;
}

export interface CalEvent {
  id: string;
  title: string;
  date: string;
  start: number;
  end: number;
  location: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
}

export interface Goal {
  id: string;
  title: string;
  milestones: Milestone[];
  createdAt: number;
}

export interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  taskId: string | null;
  completedAt: number;
}

export interface Review {
  /** Same as `date` — one review per day. */
  id: string;
  date: string;
  wentWell: string;
  improve: string;
}

export interface Settings {
  id: "settings";
  name: string;
  theme: "dark" | "light";
  dayStart: number;
  dayEnd: number;
  focusMinutes: number;
  /** Day key of the last "Day complete" message, so it shows once per day. */
  celebratedOn: string | null;
}

export interface AppData {
  tasks: Task[];
  events: CalEvent[];
  notes: Note[];
  goals: Goal[];
  sessions: FocusSession[];
  reviews: Review[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  id: "settings",
  name: "",
  theme: "dark",
  dayStart: 8 * 60,
  dayEnd: 19 * 60,
  focusMinutes: 25,
  celebratedOn: null,
};
