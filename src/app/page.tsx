"use client";

import { AnimatePresence, motion } from "motion/react";
import { Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useEditor } from "@/components/Editors";
import { LOCAL_ENGINE_LABEL, PlanSheet, usePlanFlow } from "@/components/PlanFlow";
import { TaskList } from "@/components/TaskList";
import { Timeline } from "@/components/Timeline";
import { Card, Dots, Empty, ProgressRing, SectionTitle } from "@/components/ui/Bits";
import { Button } from "@/components/ui/Button";
import { aiAsk, useAiStatus } from "@/lib/ai-client";
import { answerLocally } from "@/lib/assistant";
import { fmtLongDate, greeting } from "@/lib/date";
import { EASE, rise, stagger } from "@/lib/motion";
import { overdueTasks } from "@/lib/planner";
import { dayProgress } from "@/lib/stats";
import { useStore } from "@/lib/store";
import { sortTasks } from "@/lib/tasks";

interface Reply {
  id: number;
  text: string;
  source: "local" | "ai";
  model?: string;
  notice?: string;
}

const SUGGESTIONS = ["What’s next?", "When am I free?", "How am I doing?"];

export default function HomePage() {
  const { data, today, now, addTask, carryOver } = useStore();
  const { openTask } = useEditor();
  const status = useAiStatus();
  const flow = usePlanFlow(today);
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Reply | null>(null);
  const [asking, setAsking] = useState(false);

  const todays = data.tasks.filter((t) => t.date === today);
  const todaysEvents = data.events.filter((e) => e.date === today);
  const progress = dayProgress(data.tasks, today);
  const openPriorities = todays.filter((t) => t.priority && !t.done).length;
  const totalPriorities = todays.filter((t) => t.priority).length;
  const upcoming = todaysEvents.filter((e) => e.end > now).length;
  const anytime = sortTasks(todays.filter((t) => t.start === null));
  const overdue = overdueTasks(data.tasks, today);
  const hasTimeline = todaysEvents.length > 0 || todays.some((t) => t.start !== null);
  const name = data.settings.name.trim();
  const hello = greeting(now);

  function answerOffline(question: string, notice?: string) {
    const result = answerLocally(question, {
      tasks: data.tasks,
      events: data.events,
      settings: data.settings,
      today,
      now,
    });
    if (result.action?.type === "addTask") {
      const { title, durationMin, priority } = result.action;
      addTask({ title, durationMin, priority, date: today });
    } else if (result.action?.type === "carryOver") {
      carryOver(today);
    } else if (result.action?.type === "plan") {
      void flow.propose();
    }
    setReply({ id: Date.now(), text: result.text, source: "local", notice });
  }

  async function ask(question: string) {
    const q = question.trim();
    if (!q) {
      input.current?.focus();
      answerOffline("");
      return;
    }
    setText("");
    if (status?.mode !== "ai") return answerOffline(q);

    setAsking(true);
    setReply(null);
    try {
      const res = await aiAsk(
        {
          date: today,
          now,
          settings: data.settings,
          tasks: todays.filter((t) => !t.done),
          events: todaysEvents,
        },
        q,
      );
      setReply({ id: Date.now(), text: res.text, source: "ai", model: res.model });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "The AI service is unavailable.";
      answerOffline(q, `${reason} Answered by the local engine instead.`);
    } finally {
      setAsking(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(text);
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
      <motion.header variants={rise}>
        <p className="text-sm text-muted">{fmtLongDate(today)}</p>
        <h1 className="mt-2 text-[32px] font-semibold leading-[1.15] tracking-tight md:text-[38px]">
          {name ? `${hello.slice(0, -1)}, ${name}.` : hello}
        </h1>
        <p className="mt-1 text-[19px] text-muted md:text-xl">Let’s make today count.</p>
      </motion.header>

      <motion.section variants={rise} aria-labelledby="focus-title">
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={progress.pct / 100} size={92} label="Daily progress">
            <span className="tabular text-xl font-semibold tracking-tight">
              {progress.pct}
              <span className="text-sm font-normal text-muted">%</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <h2 id="focus-title" className="text-[15px] font-medium">
              Today’s focus
            </h2>
            <ul className="mt-2 space-y-1 text-[15px] text-muted">
              <li>
                <span className="tabular text-ink">{openPriorities}</span>{" "}
                {totalPriorities > 0 && openPriorities === 0
                  ? "priorities left — all done"
                  : openPriorities === 1
                    ? "priority task"
                    : "priority tasks"}
              </li>
              <li>
                <span className="tabular text-ink">{upcoming}</span> upcoming{" "}
                {upcoming === 1 ? "event" : "events"}
              </li>
              <li>
                <span className="tabular text-ink">
                  {progress.done} of {progress.total}
                </span>{" "}
                tasks done
              </li>
            </ul>
          </div>
        </Card>
      </motion.section>

      <motion.section variants={rise} aria-label="Plan with EasyLife">
        <Card className="p-4">
          <form onSubmit={onSubmit}>
            <label htmlFor="ask" className="sr-only">
              Ask EasyLife or describe how you want to plan
            </label>
            <input
              id="ask"
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What matters most today?"
              autoComplete="off"
              maxLength={300}
              enterKeyHint="send"
              className="h-11 w-full bg-transparent px-1.5 text-[17px] text-ink placeholder:text-muted/70 focus-visible:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => void flow.propose(text.trim())}
                disabled={flow.loading}
                className="flex-1 sm:flex-none"
              >
                Plan my day
              </Button>
              <Button type="submit" disabled={asking} className="flex-1 sm:flex-none">
                Ask EasyLife
              </Button>
            </div>
          </form>

          <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="h-8 shrink-0 rounded-full border border-line px-3 text-[13px] text-muted transition-colors hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {asking ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-center gap-3 border-t border-line pt-3.5 text-sm text-muted">
                  <Dots label="Thinking" /> Thinking…
                </div>
              </motion.div>
            ) : reply ? (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.26, ease: EASE }}
                className="overflow-hidden"
                aria-live="polite"
              >
                <div className="mt-3 border-t border-line pt-3.5">
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 0.08 }}
                    className="whitespace-pre-wrap px-1.5 text-[15px] leading-relaxed"
                  >
                    {reply.text}
                  </motion.p>
                  {reply.notice && <p className="mt-2 px-1.5 text-[13px] text-muted">{reply.notice}</p>}
                  <div className="mt-2 flex items-center justify-between gap-3 px-1.5">
                    <p className="text-xs text-muted">
                      {reply.source === "ai" ? `AI · ${reply.model}` : LOCAL_ENGINE_LABEL}
                    </p>
                    <button
                      type="button"
                      onClick={() => setReply(null)}
                      className="rounded-md px-1.5 py-1 text-xs text-muted hover:text-ink"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Card>
      </motion.section>

      <motion.section variants={rise} aria-labelledby="today-title">
        <SectionTitle
          action={
            <Button size="sm" variant="ghost" onClick={() => openTask({ date: today })}>
              <Plus size={15} aria-hidden /> Task
            </Button>
          }
        >
          <span id="today-title">Today</span>
        </SectionTitle>

        {overdue.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5 text-sm">
            <span className="text-muted">
              {overdue.length} unfinished {overdue.length === 1 ? "task" : "tasks"} from earlier days
            </span>
            <button
              type="button"
              onClick={() => carryOver(today)}
              className="shrink-0 rounded-md px-1 py-1 text-accent hover:underline"
            >
              Move to today
            </button>
          </div>
        )}

        {!hasTimeline && anytime.length === 0 ? (
          <Empty
            title="A clear day."
            body="Add the one thing that would make today a good day."
            action={
              <Button variant="primary" onClick={() => openTask({ date: today, priority: true })}>
                Add a priority
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {hasTimeline && (
              <Card className="py-2 pl-1 pr-3">
                <Timeline date={today} />
              </Card>
            )}
            {anytime.length > 0 && (
              <div>
                {hasTimeline && <p className="mb-2 text-[13px] text-muted">Anytime</p>}
                <TaskList tasks={anytime} />
              </div>
            )}
          </div>
        )}
      </motion.section>

      <PlanSheet flow={flow} />
    </motion.div>
  );
}
