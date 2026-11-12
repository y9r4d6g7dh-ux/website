"use client";

import { AnimatePresence, motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DevStatus } from "@/components/DevStatus";
import { Card, Check, Empty, PageHeader, SectionTitle } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { Chips, Field, Input, Segmented, Textarea } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";
import { addDays, fmtDuration, fromKey, parseHHMM, toHHMM } from "@/lib/date";
import { uid } from "@/lib/id";
import { EASE, softSpring } from "@/lib/motion";
import { consistency, streak, weekStats } from "@/lib/stats";
import { useStore } from "@/lib/store";
import type { Goal } from "@/lib/types";

export default function ProfilePage() {
  return (
    <div className="space-y-10">
      <PageHeader title="Profile" subtitle="Your rhythm, your settings." />
      <WeekSection />
      <GoalsSection />
      <ReviewSection />
      <SettingsSection />
      <DataSection />
    </div>
  );
}

/* ── Weekly consistency ───────────────────────────────────────────────── */

function WeekSection() {
  const { data, today } = useStore();
  const week = weekStats(data.tasks, data.sessions, today);
  const run = streak(data.tasks, today);
  const focusMin = week.reduce((sum, d) => sum + d.focusMin, 0);
  const max = Math.max(1, ...week.map((d) => d.total));
  const BAR = 72;

  const stats = [
    { label: "Consistency", value: `${consistency(week)}%`, hint: "days with a completed task" },
    { label: "Current streak", value: `${run} ${run === 1 ? "day" : "days"}`, hint: "rest days are fine" },
    { label: "Focus time", value: fmtDuration(focusMin), hint: "last 7 days" },
  ];

  return (
    <section aria-labelledby="week-title">
      <SectionTitle>
        <span id="week-title">This week</span>
      </SectionTitle>
      <Card className="p-5">
        <div className="flex items-end justify-between gap-2" role="img" aria-label="Tasks completed per day, last 7 days">
          {week.map((d, i) => {
            const totalH = d.total ? Math.max(6, (d.total / max) * BAR) : 3;
            const doneH = d.total ? (d.done / d.total) * totalH : 0;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-2" title={`${d.done} of ${d.total} done`}>
                <div className="flex w-full items-end justify-center" style={{ height: BAR }}>
                  <div
                    className="relative w-full max-w-7 overflow-hidden rounded-md bg-line"
                    style={{ height: totalH }}
                  >
                    <motion.div
                      className="absolute inset-x-0 bottom-0 rounded-md bg-accent"
                      initial={{ height: 0 }}
                      animate={{ height: doneH }}
                      transition={{ ...softSpring, delay: 0.1 + i * 0.04 }}
                    />
                  </div>
                </div>
                <span className={`text-xs ${d.date === today ? "text-accent" : "text-muted"}`}>
                  {fromKey(d.date).toLocaleDateString("en-US", { weekday: "narrow" })}
                </span>
              </div>
            );
          })}
        </div>
        <ul className="sr-only">
          {week.map((d) => (
            <li key={d.date}>
              {d.date}: {d.done} of {d.total} tasks done, {d.focusMin} focus minutes
            </li>
          ))}
        </ul>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="truncate text-[13px] text-muted">{s.label}</dt>
              <dd className="tabular mt-0.5 text-lg font-medium tracking-tight">{s.value}</dd>
              <dd className="mt-0.5 hidden text-xs text-muted/80 sm:block">{s.hint}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

/* ── Goals and milestones ─────────────────────────────────────────────── */

function GoalsSection() {
  const { data, saveGoal } = useStore();
  const [title, setTitle] = useState("");
  const goals = [...data.goals].sort((a, b) => a.createdAt - b.createdAt);

  function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    saveGoal({ title, milestones: [] });
    setTitle("");
  }

  return (
    <section aria-labelledby="goals-title">
      <SectionTitle>
        <span id="goals-title">Goals</span>
      </SectionTitle>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {goals.map((g) => (
            <motion.div
              key={g.id}
              layout="position"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <GoalCard goal={g} />
            </motion.div>
          ))}
        </AnimatePresence>
        {goals.length === 0 && (
          <Empty title="No goals yet." body="Name something worth working toward, then break it into milestones." />
        )}
        <form onSubmit={add} className="flex gap-2">
          <label htmlFor="new-goal" className="sr-only">
            New goal
          </label>
          <Input
            id="new-goal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New goal…"
            maxLength={100}
            autoComplete="off"
          />
          <Button type="submit" disabled={!title.trim()}>
            Add
          </Button>
        </form>
      </div>
    </section>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { saveGoal, deleteGoal } = useStore();
  const [text, setText] = useState("");
  const done = goal.milestones.filter((m) => m.done).length;
  const pct = goal.milestones.length ? done / goal.milestones.length : 0;

  const update = (milestones: Goal["milestones"]) => saveGoal({ ...goal, milestones });

  function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    update([...goal.milestones, { id: uid(), title: text.trim(), done: false }]);
    setText("");
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-medium">{goal.title}</h3>
          <p className="tabular mt-0.5 text-[13px] text-muted">
            {goal.milestones.length ? `${done} of ${goal.milestones.length} milestones` : "No milestones yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => deleteGoal(goal.id)}
          aria-label={`Delete goal: ${goal.title}`}
          className="-mr-1.5 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger"
        >
          <Trash2 size={16} strokeWidth={1.75} />
        </button>
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={`${goal.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct * 100)}
      >
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={softSpring}
        />
      </div>
      <ul className="mt-2">
        {goal.milestones.map((m) => (
          <li key={m.id} className="group flex items-center gap-1">
            <Check
              checked={m.done}
              size={20}
              label={`${m.done ? "Mark not reached" : "Mark reached"}: ${m.title}`}
              onChange={() => update(goal.milestones.map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)))}
            />
            <span className={`min-w-0 flex-1 truncate text-[15px] transition-opacity ${m.done ? "opacity-50" : ""}`}>
              {m.title}
            </span>
            <button
              type="button"
              onClick={() => update(goal.milestones.filter((x) => x.id !== m.id))}
              aria-label={`Remove milestone: ${m.title}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted/70 hover:text-danger"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-2 flex gap-2">
        <label htmlFor={`ms-${goal.id}`} className="sr-only">
          Add a milestone to {goal.title}
        </label>
        <Input
          id={`ms-${goal.id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add milestone…"
          maxLength={100}
          autoComplete="off"
          className="!h-10 !bg-surface"
        />
        <Button type="submit" size="sm" className="!h-10" disabled={!text.trim()}>
          Add
        </Button>
      </form>
    </Card>
  );
}

/* ── Optional daily review ────────────────────────────────────────────── */

function ReviewSection() {
  const { data, today } = useStore();
  const existing = data.reviews.find((r) => r.date === today);
  const previous = data.reviews.find((r) => r.date === addDays(today, -1));
  return (
    <section aria-labelledby="review-title">
      <SectionTitle>
        <span id="review-title">Daily review</span>
        <span className="ml-2 font-normal text-muted">Optional</span>
      </SectionTitle>
      <Card className="p-4">
        {/* Keyed so the form picks up a reset or a new day. */}
        <ReviewForm key={`${today}-${existing ? "saved" : "new"}`} />
        {previous && (previous.wentWell || previous.improve) && (
          <div className="mt-4 border-t border-line pt-4 text-sm">
            <p className="text-[13px] text-muted">Yesterday you wrote</p>
            {previous.wentWell && <p className="mt-1.5 leading-relaxed">{previous.wentWell}</p>}
            {previous.improve && <p className="mt-1.5 leading-relaxed text-muted">Next: {previous.improve}</p>}
          </div>
        )}
      </Card>
    </section>
  );
}

function ReviewForm() {
  const { data, today, saveReview } = useStore();
  const existing = data.reviews.find((r) => r.date === today);
  const [wentWell, setWentWell] = useState(existing?.wentWell ?? "");
  const [improve, setImprove] = useState(existing?.improve ?? "");
  const [saved, setSaved] = useState(false);
  const dirty = wentWell !== (existing?.wentWell ?? "") || improve !== (existing?.improve ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    saveReview({ date: today, wentWell: wentWell.trim(), improve: improve.trim() });
    setSaved(true);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="What went well today?">
        {(id) => (
          <Textarea
            id={id}
            value={wentWell}
            onChange={(e) => {
              setWentWell(e.target.value);
              setSaved(false);
            }}
            className="!min-h-20 !bg-surface"
            maxLength={1000}
          />
        )}
      </Field>
      <Field label="What would make tomorrow better?">
        {(id) => (
          <Textarea
            id={id}
            value={improve}
            onChange={(e) => {
              setImprove(e.target.value);
              setSaved(false);
            }}
            className="!min-h-20 !bg-surface"
            maxLength={1000}
          />
        )}
      </Field>
      <div className="flex items-center justify-end gap-3">
        <AnimatePresence>
          {saved && !dirty && (
            <motion.span
              role="status"
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-accent"
            >
              Saved
            </motion.span>
          )}
        </AnimatePresence>
        <Button type="submit" disabled={!dirty || (!wentWell.trim() && !improve.trim() && !existing)}>
          Save review
        </Button>
      </div>
    </form>
  );
}

/* ── Settings ─────────────────────────────────────────────────────────── */

function SettingsSection() {
  const { data, updateSettings } = useStore();
  const s = data.settings;
  const [hoursError, setHoursError] = useState("");

  function setHours(key: "dayStart" | "dayEnd", value: string) {
    const min = parseHHMM(value);
    if (min === null) return;
    const next = { dayStart: s.dayStart, dayEnd: s.dayEnd, [key]: min };
    if (next.dayEnd - next.dayStart < 60) {
      setHoursError("Working hours need to span at least one hour.");
      return;
    }
    setHoursError("");
    updateSettings(next);
  }

  return (
    <section aria-labelledby="settings-title">
      <SectionTitle>
        <span id="settings-title">Settings</span>
      </SectionTitle>
      <Card className="space-y-5 p-4">
        <Field label="Your name" hint="Used in your greeting. Stored only on this device.">
          {(id) => (
            <Input
              id={id}
              value={s.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
              placeholder="Optional"
              maxLength={40}
              autoComplete="given-name"
              className="!bg-surface"
            />
          )}
        </Field>
        <div>
          <p className="mb-1.5 text-[13px] text-muted">Appearance</p>
          <Segmented<"dark" | "light">
            label="Appearance"
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            value={s.theme}
            onChange={(theme) => updateSettings({ theme })}
            className="w-full sm:w-64"
          />
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day starts">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={toHHMM(s.dayStart)}
                  onChange={(e) => setHours("dayStart", e.target.value)}
                  className="!bg-surface"
                />
              )}
            </Field>
            <Field label="Day ends">
              {(id) => (
                <Input
                  id={id}
                  type="time"
                  value={toHHMM(s.dayEnd)}
                  onChange={(e) => setHours("dayEnd", e.target.value)}
                  className="!bg-surface"
                />
              )}
            </Field>
          </div>
          <p className={`mt-1.5 text-xs ${hoursError ? "text-danger" : "text-muted"}`} role={hoursError ? "alert" : undefined}>
            {hoursError || "Plans are built inside these hours."}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-[13px] text-muted">Default focus session</p>
          <Chips<number>
            label="Default focus session"
            options={[15, 25, 45, 50, 90].map((m) => ({ value: m, label: `${m} min` }))}
            value={s.focusMinutes}
            onChange={(focusMinutes) => updateSettings({ focusMinutes })}
          />
        </div>
      </Card>
    </section>
  );
}

/* ── Data ─────────────────────────────────────────────────────────────── */

function DataSection() {
  const { resetDemo, eraseAll, data } = useStore();
  const [confirm, setConfirm] = useState<"reset" | "erase" | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  async function run() {
    setBusy(true);
    try {
      if (confirm === "reset") {
        await resetDemo();
        setDone("Demo data restored.");
      } else {
        await eraseAll();
        setDone("All data erased. You have a clean slate.");
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const empty = !data.tasks.length && !data.events.length && !data.notes.length && !data.goals.length;

  return (
    <section id="data" aria-labelledby="data-title" className="scroll-mt-24">
      <SectionTitle action={<DevStatus />}>
        <span id="data-title">Data</span>
      </SectionTitle>
      <Card className="divide-y divide-line/70">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[15px]">Reset demo data</p>
            <p className="mt-0.5 text-sm text-muted">Replace everything with the sample day.</p>
          </div>
          <Button onClick={() => setConfirm("reset")}>Reset</Button>
        </div>
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <p className="text-[15px]">Start from scratch</p>
            <p className="mt-0.5 text-sm text-muted">Erase all tasks, events, notes and goals.</p>
          </div>
          <Button variant="danger" onClick={() => setConfirm("erase")} disabled={empty}>
            Erase
          </Button>
        </div>
      </Card>
      <AnimatePresence>
        {done && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-sm text-accent"
          >
            {done}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="mt-6 text-center text-xs text-muted">EasyLife 0.1 · Less chaos. More life.</p>

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === "erase" ? "Erase everything?" : "Reset demo data?"}
        description={
          confirm === "erase"
            ? "This permanently removes all your data from this device."
            : "Your current data will be replaced with the sample day. This can’t be undone."
        }
      >
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setConfirm(null)} data-autofocus>
            Cancel
          </Button>
          <Button variant={confirm === "erase" ? "danger" : "primary"} onClick={run} disabled={busy} className={confirm === "erase" ? "border border-danger/50" : ""}>
            {busy ? "Working…" : confirm === "erase" ? "Erase all data" : "Reset demo data"}
          </Button>
        </div>
      </Sheet>
    </section>
  );
}
