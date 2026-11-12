"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { addDays, minutesNow, toKey } from "./date";
import { openRepo, type Collection, type Repo } from "./db";
import { uid } from "./id";
import { overdueTasks, type PlanBlock } from "./planner";
import { buildSeed, emptyData } from "./seed";
import { prioritiesComplete } from "./stats";
import type { AppData, CalEvent, Goal, Note, Review, Settings, Task } from "./types";

type Theme = Settings["theme"];
const THEME_KEY = "easylife-theme";

function storedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode — the theme still applies for this visit */
  }
}

export type NewTask = Pick<Task, "title"> & Partial<Omit<Task, "id" | "title" | "createdAt">>;

interface Store {
  ready: boolean;
  data: AppData;
  /** "indexeddb" when saving works; "memory" when the browser blocked storage. */
  storage: "indexeddb" | "memory";
  storageError: string | null;
  today: string;
  now: number;
  celebrating: boolean;
  dismissCelebration(): void;

  addTask(input: NewTask): Task;
  updateTask(id: string, patch: Partial<Task>): void;
  toggleTask(id: string): void;
  deleteTask(id: string): void;
  applyPlan(date: string, blocks: PlanBlock[]): void;
  clearPlan(date: string): void;
  /** Move unfinished tasks from earlier days onto `date`. Returns how many moved. */
  carryOver(date: string): number;

  saveEvent(event: Omit<CalEvent, "id"> & { id?: string }): void;
  deleteEvent(id: string): void;
  saveNote(note: Pick<Note, "title" | "body"> & { id?: string }): void;
  deleteNote(id: string): void;
  saveGoal(goal: Pick<Goal, "title" | "milestones"> & { id?: string }): void;
  deleteGoal(id: string): void;
  addSession(minutes: number, taskId: string | null): void;
  saveReview(review: Omit<Review, "id">): void;
  updateSettings(patch: Partial<Omit<Settings, "id">>): void;

  resetDemo(): Promise<void>;
  eraseAll(): Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => emptyData());
  const [ready, setReady] = useState(false);
  const [storage, setStorage] = useState<Store["storage"]>("indexeddb");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => ({ today: toKey(new Date()), now: minutesNow() }));
  const [celebrating, setCelebrating] = useState(false);

  const dataRef = useRef(data);
  const repoRef = useRef<Repo | null>(null);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const persist = useCallback((write: (repo: Repo) => Promise<void>) => {
    const repo = repoRef.current;
    if (!repo) return;
    write(repo).catch((err: unknown) => {
      console.error("[EasyLife] save failed", err);
      setStorageError("Your last change could not be saved to this device.");
    });
  }, []);

  // Load (or seed) on first mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const theme = storedTheme();
      const today = toKey(new Date());
      try {
        const repo = await openRepo();
        let loaded = await repo.load();
        if (!loaded) {
          loaded = buildSeed(today, theme);
          await repo.replaceAll(loaded);
        }
        if (cancelled) return repo.close();
        repoRef.current = repo;
        applyTheme(loaded.settings.theme);
        commit(loaded);
      } catch (err) {
        console.error("[EasyLife] IndexedDB unavailable, using memory only", err);
        if (cancelled) return;
        setStorage("memory");
        setStorageError(
          "This browser is blocking local storage (private browsing?). Changes will be lost when you close the tab.",
        );
        commit(buildSeed(today, theme));
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
      repoRef.current?.close();
      repoRef.current = null;
    };
  }, [commit]);

  // Keep "today" and "now" fresh without re-rendering every second.
  useEffect(() => {
    const tick = () =>
      setClock((c) => {
        const next = { today: toKey(new Date()), now: minutesNow() };
        return next.today === c.today && next.now === c.now ? c : next;
      });
    const timer = setInterval(tick, 20_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const dismissCelebration = useCallback(() => setCelebrating(false), []);

  const store = useMemo<Store>(() => {
    function upsert<K extends Collection>(key: K, item: AppData[K][number]) {
      const list = dataRef.current[key] as { id: string }[];
      const exists = list.some((x) => x.id === item.id);
      const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
      commit({ ...dataRef.current, [key]: next });
      persist((r) => r.put(key, item));
    }
    function remove(key: Collection, id: string) {
      const list = dataRef.current[key] as { id: string }[];
      commit({ ...dataRef.current, [key]: list.filter((x) => x.id !== id) });
      persist((r) => r.remove(key, id));
    }
    function setTasks(changed: Task[]) {
      if (!changed.length) return;
      const byId = new Map(changed.map((t) => [t.id, t]));
      commit({
        ...dataRef.current,
        tasks: dataRef.current.tasks.map((t) => byId.get(t.id) ?? t),
      });
      persist((r) => r.putMany("tasks", changed));
    }
    function saveSettings(settings: Settings) {
      commit({ ...dataRef.current, settings });
      persist((r) => r.saveSettings(settings));
    }
    async function replaceAll(next: AppData) {
      commit(next);
      setCelebrating(false);
      const repo = repoRef.current;
      if (repo) {
        try {
          await repo.replaceAll(next);
          setStorageError(null);
        } catch (err) {
          console.error("[EasyLife] reset failed", err);
          setStorageError("Could not write to local storage.");
        }
      }
    }
    const findTask = (id: string) => dataRef.current.tasks.find((t) => t.id === id);

    return {
      ready,
      data,
      storage,
      storageError,
      today: clock.today,
      now: clock.now,
      celebrating,
      dismissCelebration,

      addTask(input) {
        const task: Task = {
          notes: "",
          date: toKey(new Date()),
          priority: false,
          durationMin: 30,
          start: null,
          done: false,
          completedAt: null,
          ...input,
          title: input.title.trim(),
          id: uid(),
          createdAt: Date.now(),
        };
        upsert("tasks", task);
        return task;
      },
      updateTask(id, patch) {
        const task = findTask(id);
        if (task) upsert("tasks", { ...task, ...patch });
      },
      toggleTask(id) {
        const task = findTask(id);
        if (!task) return;
        const done = !task.done;
        upsert("tasks", { ...task, done, completedAt: done ? Date.now() : null });
        const today = toKey(new Date());
        const current = dataRef.current;
        if (
          done &&
          task.date === today &&
          current.settings.celebratedOn !== today &&
          prioritiesComplete(current.tasks, today)
        ) {
          saveSettings({ ...current.settings, celebratedOn: today });
          setCelebrating(true);
        }
      },
      deleteTask: (id) => remove("tasks", id),
      applyPlan(date, blocks) {
        const byId = new Map(blocks.map((b) => [b.taskId, b]));
        setTasks(
          dataRef.current.tasks
            .filter((t) => t.date === date && !t.done)
            .map((t) => {
              const b = byId.get(t.id);
              return b
                ? { ...t, start: b.start, durationMin: b.end - b.start }
                : { ...t, start: null };
            }),
        );
      },
      clearPlan(date) {
        setTasks(
          dataRef.current.tasks
            .filter((t) => t.date === date && !t.done && t.start !== null)
            .map((t) => ({ ...t, start: null })),
        );
      },
      carryOver(date) {
        const moved = overdueTasks(dataRef.current.tasks, date).map((t) => ({
          ...t,
          date,
          start: null,
        }));
        setTasks(moved);
        return moved.length;
      },

      saveEvent(event) {
        upsert("events", { ...event, title: event.title.trim(), id: event.id ?? uid() });
      },
      deleteEvent: (id) => remove("events", id),
      saveNote(note) {
        const existing = dataRef.current.notes.find((n) => n.id === note.id);
        const now = Date.now();
        upsert("notes", {
          id: existing?.id ?? uid(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          title: note.title.trim(),
          body: note.body,
        });
      },
      deleteNote: (id) => remove("notes", id),
      saveGoal(goal) {
        const existing = dataRef.current.goals.find((g) => g.id === goal.id);
        upsert("goals", {
          id: existing?.id ?? uid(),
          createdAt: existing?.createdAt ?? Date.now(),
          title: goal.title.trim(),
          milestones: goal.milestones,
        });
      },
      deleteGoal: (id) => remove("goals", id),
      addSession(minutes, taskId) {
        upsert("sessions", {
          id: uid(),
          date: toKey(new Date()),
          minutes,
          taskId,
          completedAt: Date.now(),
        });
      },
      saveReview(review) {
        upsert("reviews", { ...review, id: review.date });
      },
      updateSettings(patch) {
        if (patch.theme) applyTheme(patch.theme);
        saveSettings({ ...dataRef.current.settings, ...patch });
      },

      resetDemo: () => replaceAll(buildSeed(toKey(new Date()), dataRef.current.settings.theme)),
      eraseAll: () =>
        replaceAll({
          ...emptyData(dataRef.current.settings.theme),
          settings: { ...dataRef.current.settings, celebratedOn: null },
        }),
    };
  }, [ready, data, storage, storageError, clock, celebrating, dismissCelebration, commit, persist]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** Convenience: tomorrow's key relative to the store's today. */
export const tomorrowOf = (today: string) => addDays(today, 1);
