"use client";

import { createContext, useContext, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./ui/Button";
import { Chips, Field, Input, Switch, Textarea } from "./ui/Field";
import { Sheet } from "./ui/Sheet";
import { fmtTime, parseHHMM, toHHMM } from "@/lib/date";
import { detectConflicts, slotsForDay } from "@/lib/planner";
import { useStore } from "@/lib/store";
import type { CalEvent, Task } from "@/lib/types";

interface EditorApi {
  /** Pass a task to edit it, or a date to create a new one. */
  openTask(target: Task | { date: string; priority?: boolean }): void;
  openEvent(target: CalEvent | { date: string }): void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useEditor(): EditorApi {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <EditorProvider>");
  return ctx;
}

type TaskTarget = Task | { date: string; priority?: boolean };
type EventTarget = CalEvent | { date: string };

export function EditorProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<{ target: TaskTarget; key: number } | null>(null);
  const [event, setEvent] = useState<{ target: EventTarget; key: number } | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);

  const api = useMemo<EditorApi>(
    () => ({
      openTask(target) {
        setTask((prev) => ({ target, key: (prev?.key ?? 0) + 1 }));
        setTaskOpen(true);
      },
      openEvent(target) {
        setEvent((prev) => ({ target, key: (prev?.key ?? 0) + 1 }));
        setEventOpen(true);
      },
    }),
    [],
  );

  const editingTask = task && "id" in task.target;
  const editingEvent = event && "id" in event.target;

  return (
    <EditorContext.Provider value={api}>
      {children}
      <Sheet open={taskOpen} onClose={() => setTaskOpen(false)} title={editingTask ? "Edit task" : "New task"}>
        {task && <TaskForm key={task.key} target={task.target} onDone={() => setTaskOpen(false)} />}
      </Sheet>
      <Sheet
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title={editingEvent ? "Edit event" : "New event"}
      >
        {event && <EventForm key={event.key} target={event.target} onDone={() => setEventOpen(false)} />}
      </Sheet>
    </EditorContext.Provider>
  );
}

const DURATIONS = [15, 30, 45, 60, 90, 120].map((m) => ({
  value: m,
  label: m < 60 ? `${m} min` : `${m / 60} h`,
}));

function TaskForm({ target, onDone }: { target: TaskTarget; onDone(): void }) {
  const { addTask, updateTask, deleteTask } = useStore();
  const existing = "id" in target ? target : null;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(target.date);
  const [priority, setPriority] = useState(target.priority ?? false);
  const [duration, setDuration] = useState(existing?.durationMin ?? 30);
  const [time, setTime] = useState(
    existing && existing.start !== null ? toHHMM(existing.start) : "",
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");

  const durationOptions = DURATIONS.some((d) => d.value === duration)
    ? DURATIONS
    : [...DURATIONS, { value: duration, label: `${duration} min` }].sort((a, b) => a.value - b.value);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give the task a name.");
    if (!date) return setError("Pick a date.");
    const patch = {
      title: title.trim(),
      date,
      priority,
      durationMin: duration,
      start: time ? parseHHMM(time) : null,
      notes: notes.trim(),
    };
    if (existing) updateTask(existing.id, patch);
    else addTask(patch);
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Task">
        {(id) => (
          <Input
            id={id}
            data-autofocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="What needs to get done?"
            maxLength={140}
            autoComplete="off"
            enterKeyHint="done"
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Start time (optional)">
          {(id) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
        </Field>
      </div>
      <div>
        <p className="mb-1.5 text-[13px] text-muted">Duration</p>
        <Chips<number> label="Duration" options={durationOptions} value={duration} onChange={setDuration} />
      </div>
      <Switch label="Priority for the day" checked={priority} onChange={setPriority} />
      <Field label="Notes">
        {(id) => (
          <Textarea
            id={id}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Details, links, next step…"
            maxLength={2000}
          />
        )}
      </Field>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        {existing && (
          <Button
            variant="danger"
            onClick={() => {
              deleteTask(existing.id);
              onDone();
            }}
          >
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {existing ? "Save" : "Add task"}
        </Button>
      </div>
    </form>
  );
}

function EventForm({ target, onDone }: { target: EventTarget; onDone(): void }) {
  const { data, saveEvent, deleteEvent, now, today } = useStore();
  const existing = "id" in target ? target : null;
  const defaultStart = (() => {
    if (existing) return existing.start;
    const next = target.date === today ? Math.ceil((now + 1) / 30) * 30 : 9 * 60;
    return Math.min(next, 22 * 60);
  })();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(target.date);
  const [start, setStart] = useState(toHHMM(defaultStart));
  const [end, setEnd] = useState(toHHMM(existing?.end ?? defaultStart + 60));
  const [location, setLocation] = useState(existing?.location ?? "");
  const [error, setError] = useState("");

  const s = parseHHMM(start);
  const en = parseHHMM(end);
  const valid = s !== null && en !== null && en > s;

  // Live conflict check against everything else on that day.
  const clashes = useMemo(() => {
    if (!valid || !date) return [];
    const others = slotsForDay(data.tasks, data.events, date).filter((x) => x.id !== existing?.id);
    const draft = { id: "__draft__", kind: "event" as const, title: "", start: s, end: en };
    return detectConflicts([...others, draft])
      .filter((c) => c.a.id === draft.id || c.b.id === draft.id)
      .map((c) => (c.a.id === draft.id ? c.b : c.a));
  }, [valid, date, s, en, data.tasks, data.events, existing?.id]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Give the event a name.");
    if (!date) return setError("Pick a date.");
    if (s === null || en === null) return setError("Enter a start and end time.");
    if (en <= s) return setError("The end time must be after the start time.");
    saveEvent({ id: existing?.id, title, date, start: s, end: en, location: location.trim() });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Event">
        {(id) => (
          <Input
            id={id}
            data-autofocus
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="Meeting, appointment, call…"
            maxLength={140}
            autoComplete="off"
          />
        )}
      </Field>
      <Field label="Date">
        {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts">
          {(id) => (
            <Input
              id={id}
              type="time"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setError("");
              }}
            />
          )}
        </Field>
        <Field label="Ends">
          {(id) => (
            <Input
              id={id}
              type="time"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setError("");
              }}
            />
          )}
        </Field>
      </div>
      <Field label="Location (optional)">
        {(id) => (
          <Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
        )}
      </Field>
      {clashes.length > 0 && (
        <div className="flex gap-2.5 rounded-xl border border-danger/40 bg-danger/8 px-3.5 py-3 text-sm">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-danger" aria-hidden />
          <p>
            Overlaps{" "}
            {clashes
              .slice(0, 3)
              .map((c) => `“${c.title}” (${fmtTime(c.start)}–${fmtTime(c.end)})`)
              .join(", ")}
            . You can still save it.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 pt-1">
        {existing && (
          <Button
            variant="danger"
            onClick={() => {
              deleteEvent(existing.id);
              onDone();
            }}
          >
            Delete
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="primary" type="submit">
          {existing ? "Save" : "Add event"}
        </Button>
      </div>
    </form>
  );
}
