"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { ProgressRing } from "./ui/Bits";
import { Button } from "./ui/Button";
import { useFocus } from "@/lib/focus";
import { EASE } from "@/lib/motion";
import { useStore } from "@/lib/store";

export function clock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Focus Mode: nothing on screen but the timer and what you're working on. */
export function FocusOverlay() {
  const focus = useFocus();
  const { data } = useStore();
  const live = focus.status === "running" || focus.status === "paused";
  const show = focus.immersive && live;
  const task = data.tasks.find((t) => t.id === focus.taskId);
  const { setImmersive } = focus;

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setImmersive(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show, setImmersive]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Focus mode"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
            className="flex flex-col items-center"
          >
            <p className="mb-8 max-w-xs text-center text-[15px] text-muted">
              {task ? task.title : "Focus session"}
            </p>
            <ProgressRing
              value={focus.totalSec ? 1 - focus.secondsLeft / focus.totalSec : 0}
              size={264}
              stroke={5}
              label="Session progress"
            >
              <div className="text-center">
                <p
                  className="tabular text-[56px] font-medium leading-none tracking-tight"
                  aria-live="off"
                >
                  {clock(focus.secondsLeft)}
                </p>
                <p className="mt-2 text-sm text-muted">{focus.status === "paused" ? "Paused" : "Stay with it"}</p>
              </div>
            </ProgressRing>
            <div className="mt-10 flex gap-2">
              {focus.status === "running" ? (
                <Button variant="secondary" onClick={focus.pause} data-autofocus>
                  Pause
                </Button>
              ) : (
                <Button variant="primary" onClick={focus.resume}>
                  Resume
                </Button>
              )}
              <Button variant="ghost" onClick={focus.stop}>
                End session
              </Button>
            </div>
          </motion.div>
          <button
            type="button"
            onClick={() => setImmersive(false)}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] rounded-lg px-3 py-2 text-sm text-muted hover:text-ink"
          >
            Exit focus mode
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
