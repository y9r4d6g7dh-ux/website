"use client";

import { AnimatePresence, motion } from "motion/react";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { clock } from "@/components/FocusOverlay";
import { Card, PageHeader, ProgressRing, SectionTitle } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Chips, Label } from "@/components/ui/Field";
import { fmtDuration, fmtTime, minutesNow } from "@/lib/date";
import { useFocus } from "@/lib/focus";
import { EASE } from "@/lib/motion";
import { useStore } from "@/lib/store";
import { sortTasks } from "@/lib/tasks";

export default function FocusPage() {
  const focus = useFocus();
  const { data, today, toggleTask, updateSettings } = useStore();
  const [taskId, setTaskId] = useState<string>("");

  const minutes = data.settings.focusMinutes;
  const lengths = [...new Set([15, 25, 50, minutes])].sort((a, b) => a - b);
  const candidates = sortTasks(data.tasks.filter((t) => t.date === today && !t.done));
  const selectedId = candidates.some((t) => t.id === taskId) ? taskId : "";
  const sessions = data.sessions
    .filter((s) => s.date === today)
    .sort((a, b) => b.completedAt - a.completedAt);
  const totalToday = sessions.reduce((sum, s) => sum + s.minutes, 0);
  const taskTitle = (id: string | null) => data.tasks.find((t) => t.id === id)?.title;

  const live = focus.status === "running" || focus.status === "paused";
  const activeTask = data.tasks.find((t) => t.id === focus.taskId);
  const ringValue = live && focus.totalSec ? 1 - focus.secondsLeft / focus.totalSec : focus.status === "done" ? 1 : 0;

  return (
    <div>
      <PageHeader title="Focus" subtitle="One thing. Full attention." />

      <Card className="flex flex-col items-center px-5 py-9">
        <ProgressRing value={ringValue} size={224} stroke={5} label="Session progress">
          <div className="text-center">
            <AnimatePresence mode="wait" initial={false}>
              {focus.status === "done" ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <p className="text-xl font-medium tracking-tight">Session complete</p>
                  <p className="mt-1 text-sm text-muted">{fmtDuration(Math.round(focus.totalSec / 60))} focused</p>
                </motion.div>
              ) : (
                <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="tabular text-[52px] font-medium leading-none tracking-tight" role="timer">
                    {clock(live ? focus.secondsLeft : minutes * 60)}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {focus.status === "paused" ? "Paused" : live ? "In session" : "Ready"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ProgressRing>

        {live && (
          <p className="mt-6 max-w-xs truncate text-center text-[15px] text-muted">
            {activeTask ? activeTask.title : "Focus session"}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          {focus.status === "idle" && (
            <Button variant="primary" className="min-w-36" onClick={() => focus.start(minutes, selectedId || null)}>
              Start focus
            </Button>
          )}
          {focus.status === "running" && <Button onClick={focus.pause}>Pause</Button>}
          {focus.status === "paused" && (
            <Button variant="primary" onClick={focus.resume}>
              Resume
            </Button>
          )}
          {live && (
            <>
              <Button onClick={() => focus.setImmersive(true)}>
                <Maximize2 size={15} aria-hidden /> Focus mode
              </Button>
              <Button variant="ghost" onClick={focus.stop}>
                End
              </Button>
            </>
          )}
          {focus.status === "done" && (
            <>
              {activeTask && !activeTask.done && (
                <Button
                  variant="primary"
                  onClick={() => {
                    toggleTask(activeTask.id);
                    focus.reset();
                  }}
                >
                  Mark task done
                </Button>
              )}
              <Button variant={activeTask && !activeTask.done ? "secondary" : "primary"} onClick={focus.reset}>
                New session
              </Button>
            </>
          )}
        </div>
      </Card>

      <AnimatePresence initial={false}>
        {focus.status === "idle" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[13px] text-muted">Length</p>
                <Chips<number>
                  label="Session length"
                  options={lengths.map((m) => ({ value: m, label: `${m} min` }))}
                  value={minutes}
                  onChange={(m) => updateSettings({ focusMinutes: m })}
                />
              </div>
              <div>
                <Label htmlFor="focus-task">Working on</Label>
                <select
                  id="focus-task"
                  value={selectedId}
                  onChange={(e) => setTaskId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-ink focus:border-accent focus-visible:outline-none"
                >
                  <option value="">No specific task</option>
                  {candidates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.priority ? "● " : ""}
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="mt-9" aria-label="Today's sessions">
        <SectionTitle>
          Today
          <span className="ml-2 font-normal text-muted">
            {sessions.length
              ? `${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} · ${fmtDuration(totalToday)}`
              : "No sessions yet"}
          </span>
        </SectionTitle>
        {sessions.length > 0 && (
          <Card className="divide-y divide-line/70 px-4">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3 text-[15px]">
                <span className="min-w-0 truncate">{taskTitle(s.taskId) ?? "Focus session"}</span>
                <span className="tabular shrink-0 text-sm text-muted">
                  {fmtTime(minutesNow(new Date(s.completedAt)))} · {s.minutes} min
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
