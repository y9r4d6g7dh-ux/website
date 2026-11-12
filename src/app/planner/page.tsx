"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useEditor } from "@/components/Editors";
import { PlanSheet, usePlanFlow } from "@/components/PlanFlow";
import { TaskList } from "@/components/TaskList";
import { Timeline } from "@/components/Timeline";
import { Card, Empty, PageHeader, SectionTitle } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Field, Input, Segmented, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { parseQuickTask } from "@/lib/assistant";
import { addDays, fmtLongDate, fmtTime, relativeDay } from "@/lib/date";
import { EASE, page } from "@/lib/motion";
import { detectConflicts, overdueTasks, slotsForDay } from "@/lib/planner";
import { dayProgress } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { sortTasks } from "@/lib/tasks";
import type { Note } from "@/lib/types";

type Tab = "day" | "tasks" | "notes";
const TABS = [
  { value: "day" as const, label: "Day" },
  { value: "tasks" as const, label: "Tasks" },
  { value: "notes" as const, label: "Notes" },
];

export default function PlannerPage() {
  const [tab, setTab] = useState<Tab>("day");
  return (
    <div>
      <PageHeader title="Planner" subtitle="Decide once. Then follow the plan." />
      <Segmented<Tab> label="Planner view" options={TABS} value={tab} onChange={setTab} className="mb-6 w-full sm:w-auto" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={page}
        >
          {tab === "day" ? <DayTab /> : tab === "tasks" ? <TasksTab /> : <NotesTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Day: time-block plan ─────────────────────────────────────────────── */

function DayTab() {
  const { data, today, carryOver, clearPlan } = useStore();
  const { openTask, openEvent } = useEditor();
  const [date, setDate] = useState(today);
  const [dir, setDir] = useState(1);
  const [message, setMessage] = useState("");
  const flow = usePlanFlow(date);
  const proposeRef = useRef(flow.propose);
  useEffect(() => {
    proposeRef.current = flow.propose;
  });

  const tasks = data.tasks.filter((t) => t.date === date);
  const events = data.events.filter((e) => e.date === date);
  const unscheduled = sortTasks(tasks.filter((t) => t.start === null));
  const scheduledOpen = tasks.filter((t) => t.start !== null && !t.done).length;
  const hasTimeline = events.length > 0 || tasks.some((t) => t.start !== null);
  const progress = dayProgress(data.tasks, date);
  const conflicts = useMemo(
    () => detectConflicts(slotsForDay(data.tasks, data.events, date)),
    [data.tasks, data.events, date],
  );
  const overdueCount = date >= today ? overdueTasks(data.tasks, date).length : 0;

  const go = (delta: number) => {
    setDir(delta);
    setDate((d) => addDays(d, delta));
    setMessage("");
  };

  function reschedule() {
    const moved = date >= today ? carryOver(date) : 0;
    setMessage(
      moved
        ? `Moved ${moved} unfinished ${moved === 1 ? "task" : "tasks"} here and re-planned the time that’s left.`
        : "Re-planned the time that’s left.",
    );
    // Let the carried-over tasks land before planning around them.
    setTimeout(() => void proposeRef.current(), 0);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button size="icon" variant="ghost" onClick={() => go(-1)} aria-label="Previous day">
          <ChevronLeft size={18} />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-[17px] font-medium tracking-tight">{relativeDay(date, today)}</p>
          <p className="truncate text-[13px] text-muted">
            {fmtLongDate(date)}
            {progress.total > 0 && ` · ${progress.done} of ${progress.total} done`}
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={() => go(1)} aria-label="Next day">
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void flow.propose()} disabled={flow.loading}>
          Plan my day
        </Button>
        <Button onClick={reschedule} disabled={flow.loading}>
          Smart reschedule
          {overdueCount > 0 && (
            <span className="tabular rounded-md bg-accent/15 px-1.5 text-xs text-accent">{overdueCount}</span>
          )}
        </Button>
        {scheduledOpen > 0 && (
          <Button
            variant="ghost"
            onClick={() => {
              clearPlan(date);
              setMessage("Plan cleared. Tasks are back under Unscheduled.");
            }}
          >
            Clear plan
          </Button>
        )}
        {date !== today && (
          <Button
            variant="ghost"
            onClick={() => {
              setDir(date > today ? -1 : 1);
              setDate(today);
            }}
          >
            Today
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            key={message}
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden text-sm text-muted"
          >
            <span className="block pb-4">{message}</span>
          </motion.p>
        )}
        {conflicts.length > 0 && (
          <motion.div
            key="conflicts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mb-5 rounded-2xl border border-danger/40 bg-danger/8 p-4" role="alert">
              <p className="flex items-center gap-2 text-[15px] font-medium">
                <TriangleAlert size={16} className="text-danger" aria-hidden />
                {conflicts.length} scheduling {conflicts.length === 1 ? "conflict" : "conflicts"}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {conflicts.slice(0, 4).map((c) => (
                  <li key={`${c.a.id}-${c.b.id}`}>
                    “{c.a.title}” overlaps “{c.b.title}” by {c.overlapMin} min ({fmtTime(c.b.start)})
                  </li>
                ))}
              </ul>
              <Button size="sm" className="mt-3" onClick={() => void flow.propose()}>
                Resolve with a new plan
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={date}
          custom={dir}
          initial={{ opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -24, transition: { duration: 0.12 } }}
          transition={{ duration: 0.26, ease: EASE }}
          className="space-y-6"
        >
          {!hasTimeline && unscheduled.length === 0 ? (
            <Empty
              title="Nothing planned."
              body="Add a task or an event, then let EasyLife fit it into your day."
              action={
                <Button variant="primary" onClick={() => openTask({ date })}>
                  Add task
                </Button>
              }
            />
          ) : (
            <>
              <section aria-label="Schedule">
                <SectionTitle>Schedule</SectionTitle>
                {hasTimeline ? (
                  <Card className="py-2 pl-1 pr-3">
                    <Timeline date={date} />
                  </Card>
                ) : (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
                    No time blocks yet. Tap “Plan my day” to schedule the tasks below.
                  </p>
                )}
              </section>
              {unscheduled.length > 0 && (
                <section aria-label="Unscheduled tasks">
                  <SectionTitle>Unscheduled</SectionTitle>
                  <TaskList tasks={unscheduled} />
                </section>
              )}
            </>
          )}
          <div className="flex gap-2">
            <Button onClick={() => openTask({ date })}>
              <Plus size={16} aria-hidden /> Task
            </Button>
            <Button onClick={() => openEvent({ date })}>
              <Plus size={16} aria-hidden /> Event
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      <PlanSheet flow={flow} />
    </div>
  );
}

/* ── Tasks: everything, grouped ───────────────────────────────────────── */

function TasksTab() {
  const { data, today, addTask } = useStore();
  const [text, setText] = useState("");

  const open = data.tasks.filter((t) => !t.done);
  const overdue = sortTasks(open.filter((t) => t.date < today)).sort((a, b) => a.date.localeCompare(b.date));
  const todays = sortTasks(open.filter((t) => t.date === today));
  const upcoming = sortTasks(open.filter((t) => t.date > today)).sort((a, b) => a.date.localeCompare(b.date));
  const done = data.tasks
    .filter((t) => t.done)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 15);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseQuickTask(text);
    if (!parsed.title) return;
    addTask({ ...parsed, date: today });
    setText("");
  }

  const groups = [
    { title: "Overdue", tasks: overdue, showDate: true },
    { title: "Today", tasks: todays, showDate: false },
    { title: "Upcoming", tasks: upcoming, showDate: true },
    { title: "Recently completed", tasks: done, showDate: true },
  ].filter((g) => g.tasks.length > 0);

  return (
    <div className="space-y-6">
      <form onSubmit={submit}>
        <div className="flex gap-2">
          <label htmlFor="quick-add" className="sr-only">
            Add a task for today
          </label>
          <Input
            id="quick-add"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a task for today…"
            maxLength={140}
            autoComplete="off"
            enterKeyHint="done"
          />
          <Button variant="primary" type="submit" disabled={!text.trim()}>
            Add
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted">Tip: “Call the bank 20m !” sets a duration and marks it priority.</p>
      </form>

      {groups.length === 0 ? (
        <Empty title="No tasks yet." body="Type one above and press Enter." />
      ) : (
        groups.map((g) => (
          <section key={g.title} aria-label={g.title}>
            <SectionTitle>
              {g.title} <span className="tabular ml-1 text-muted">{g.tasks.length}</span>
            </SectionTitle>
            <TaskList tasks={g.tasks} showDate={g.showDate} />
          </section>
        ))
      )}
    </div>
  );
}

/* ── Notes ────────────────────────────────────────────────────────────── */

function NotesTab() {
  const { data, saveNote, deleteNote } = useStore();
  const [editing, setEditing] = useState<{ note: Note | null; key: number } | null>(null);
  const [open, setOpen] = useState(false);
  const notes = [...data.notes].sort((a, b) => b.updatedAt - a.updatedAt);

  const edit = (note: Note | null) => {
    setEditing((prev) => ({ note, key: (prev?.key ?? 0) + 1 }));
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="primary" onClick={() => edit(null)}>
          <Plus size={16} aria-hidden /> New note
        </Button>
      </div>
      {notes.length === 0 ? (
        <Empty title="No notes yet." body="Capture a thought so it stops taking up space in your head." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {notes.map((n) => (
              <motion.li
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: EASE }}
              >
                <button
                  type="button"
                  onClick={() => edit(n)}
                  className="block h-full w-full rounded-2xl border border-line bg-card p-4 text-left transition-colors hover:border-muted/60"
                >
                  <span className="block truncate text-[15px] font-medium">{n.title || "Untitled"}</span>
                  <span className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                    {n.body || "Empty note"}
                  </span>
                  <span className="mt-3 block text-xs text-muted/80">
                    {new Date(n.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title={editing?.note ? "Edit note" : "New note"}>
        {editing && (
          <NoteForm
            key={editing.key}
            note={editing.note}
            onSave={(title, body) => {
              saveNote({ id: editing.note?.id, title, body });
              setOpen(false);
            }}
            onDelete={() => {
              if (editing.note) deleteNote(editing.note.id);
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        )}
      </Sheet>
    </div>
  );
}

function NoteForm({
  note,
  onSave,
  onDelete,
  onCancel,
}: {
  note: Note | null;
  onSave(title: string, body: string): void;
  onDelete(): void;
  onCancel(): void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return setError("Write something first.");
    onSave(title.trim() || body.trim().split("\n")[0].slice(0, 60), body);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Title">
        {(id) => (
          <Input id={id} data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        )}
      </Field>
      <Field label="Note">
        {(id) => (
          <Textarea
            id={id}
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError("");
            }}
            className="min-h-44"
            maxLength={10000}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        {note && (
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}
