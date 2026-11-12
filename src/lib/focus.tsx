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
import { useStore } from "./store";

type Status = "idle" | "running" | "paused" | "done";

interface TimerState {
  status: Status;
  totalSec: number;
  /** Remaining seconds while paused / idle / done. */
  remainingSec: number;
  /** Wall-clock end while running — keeps time honest if the tab sleeps. */
  endsAt: number | null;
  taskId: string | null;
}

interface FocusApi extends TimerState {
  secondsLeft: number;
  /** Distraction-free full-screen view. */
  immersive: boolean;
  setImmersive(on: boolean): void;
  start(minutes: number, taskId: string | null): void;
  pause(): void;
  resume(): void;
  /** Stop early. Time already focused (≥ 1 min) is still logged. */
  stop(): void;
  reset(): void;
}

const KEY = "easylife-focus";
const IDLE: TimerState = { status: "idle", totalSec: 0, remainingSec: 0, endsAt: null, taskId: null };

const FocusContext = createContext<FocusApi | null>(null);

export function useFocus(): FocusApi {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used inside <FocusProvider>");
  return ctx;
}

const left = (s: TimerState, at: number) =>
  s.status === "running" && s.endsAt ? Math.max(0, Math.ceil((s.endsAt - at) / 1000)) : s.remainingSec;

export function FocusProvider({ children }: { children: ReactNode }) {
  const { addSession } = useStore();
  const [state, setState] = useState<TimerState>(IDLE);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const stateRef = useRef(state);

  const update = useCallback((next: TimerState) => {
    stateRef.current = next;
    setState(next);
    setSecondsLeft(left(next, Date.now()));
    try {
      if (next.status === "idle") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage blocked — timer still works for this visit */
    }
  }, []);

  const complete = useCallback(() => {
    const s = stateRef.current;
    addSession(Math.round(s.totalSec / 60), s.taskId);
    update({ ...s, status: "done", remainingSec: 0, endsAt: null });
  }, [addSession, update]);

  // Restore a timer that was running before a reload. Deferred a tick because
  // localStorage is only readable after hydration.
  useEffect(() => {
    const restore = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return;
        const saved = JSON.parse(raw) as TimerState;
        if (saved.status === "running" && saved.endsAt && saved.endsAt <= Date.now()) {
          stateRef.current = saved;
          complete();
        } else if (saved.status === "running" || saved.status === "paused") {
          update(saved);
        }
      } catch {
        /* ignore a corrupt saved timer */
      }
    };
    const timer = setTimeout(restore, 0);
    return () => clearTimeout(timer);
  }, [complete, update]);

  useEffect(() => {
    if (state.status !== "running") return;
    const tick = () => {
      const remaining = left(stateRef.current, Date.now());
      setSecondsLeft(remaining);
      if (remaining <= 0) complete();
    };
    const timer = setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.status, complete]);

  const api = useMemo<FocusApi>(
    () => ({
      ...state,
      secondsLeft,
      immersive,
      setImmersive,
      start(minutes, taskId) {
        const totalSec = Math.max(1, Math.round(minutes * 60));
        update({
          status: "running",
          totalSec,
          remainingSec: totalSec,
          endsAt: Date.now() + totalSec * 1000,
          taskId,
        });
        setImmersive(true);
      },
      pause() {
        const s = stateRef.current;
        if (s.status !== "running") return;
        update({ ...s, status: "paused", remainingSec: left(s, Date.now()), endsAt: null });
      },
      resume() {
        const s = stateRef.current;
        if (s.status !== "paused") return;
        update({ ...s, status: "running", endsAt: Date.now() + s.remainingSec * 1000 });
      },
      stop() {
        const s = stateRef.current;
        const focusedMin = Math.floor((s.totalSec - left(s, Date.now())) / 60);
        if ((s.status === "running" || s.status === "paused") && focusedMin >= 1) {
          addSession(focusedMin, s.taskId);
        }
        update(IDLE);
        setImmersive(false);
      },
      reset() {
        update(IDLE);
        setImmersive(false);
      },
    }),
    [state, secondsLeft, immersive, update, addSession],
  );

  return <FocusContext.Provider value={api}>{children}</FocusContext.Provider>;
}
