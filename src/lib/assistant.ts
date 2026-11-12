/**
 * "Ask EasyLife" in Local Demo Mode.
 *
 * A small keyword-matching assistant. It is deterministic and rule-based —
 * NOT an AI model — and every answer is labelled as such in the UI.
 */
import { fmtDuration, fmtTime } from "./date";
import { freeWindows, overdueTasks, slotsForDay } from "./planner";
import { dayProgress } from "./stats";
import type { CalEvent, Settings, Task } from "./types";

export type AssistantAction =
  | { type: "addTask"; title: string; durationMin: number; priority: boolean }
  | { type: "plan" }
  | { type: "carryOver" };

export interface AssistantReply {
  text: string;
  action?: AssistantAction;
}

export interface AssistantContext {
  tasks: Task[];
  events: CalEvent[];
  settings: Pick<Settings, "dayStart" | "dayEnd">;
  today: string;
  now: number;
}

/** "Call the bank 30m !" → { title: "Call the bank", durationMin: 30, priority: true } */
export function parseQuickTask(text: string) {
  let title = text.trim();
  let durationMin = 30;
  const dur = /\b(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)\b/i.exec(title);
  if (dur) {
    const n = Number(dur[1]);
    durationMin = Math.round(/^h/i.test(dur[2]) ? n * 60 : n);
    durationMin = Math.min(480, Math.max(5, durationMin));
    title = title.replace(dur[0], " ");
  }
  const priority = /!|\b(priority|important|urgent)\b/i.test(title);
  title = title
    .replace(/!+/g, " ")
    .replace(/\b(high\s+)?priority\b|\bimportant\b|\burgent\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,:-]+|[\s,:-]+$/g, "");
  return { title, durationMin, priority };
}

const HELP =
  "I'm EasyLife's local demo engine — a rule-based planner, not an AI model. Try: " +
  "“plan my day”, “what's next?”, “how am I doing?”, “when am I free?”, " +
  "“move overdue tasks”, or “add Call the bank 30m”.";

export function answerLocally(question: string, ctx: AssistantContext): AssistantReply {
  const q = question.trim();
  const lower = q.toLowerCase();
  if (!q) return { text: HELP };

  const add = /^(?:add|create|new)\s+(?:a\s+)?(?:task\s*:?\s*)?(.+)$/i.exec(q);
  if (add) {
    const parsed = parseQuickTask(add[1]);
    if (!parsed.title) return { text: "Tell me what to add, e.g. “add Call the bank 30m”." };
    return {
      text: `Added “${parsed.title}” to today (${fmtDuration(parsed.durationMin)}${
        parsed.priority ? ", priority" : ""
      }).`,
      action: { type: "addTask", ...parsed },
    };
  }

  const todays = ctx.tasks.filter((t) => t.date === ctx.today);
  const open = todays.filter((t) => !t.done);

  if (/\b(overdue|carry|reschedul|catch up|move)\b/.test(lower)) {
    const overdue = overdueTasks(ctx.tasks, ctx.today);
    if (!overdue.length) return { text: "Nothing is overdue. You're up to date." };
    return {
      text: `Moved ${overdue.length} unfinished ${
        overdue.length === 1 ? "task" : "tasks"
      } to today. Run “Plan my day” to fit them in.`,
      action: { type: "carryOver" },
    };
  }

  if (/\bplan\b|\bschedule\b|\borganis|\borganiz/.test(lower)) {
    if (!open.length) return { text: "There are no open tasks to plan today." };
    return { text: "Here's a plan built around your events.", action: { type: "plan" } };
  }

  if (/\bnext\b|\bnow\b|\bstart\b|should i do/.test(lower)) {
    const slots = slotsForDay(ctx.tasks, ctx.events, ctx.today).filter((s) => s.end > ctx.now);
    if (slots.length) {
      const s = slots[0];
      const when = s.start <= ctx.now ? "Happening now" : `Next up at ${fmtTime(s.start)}`;
      return { text: `${when}: ${s.title} (until ${fmtTime(s.end)}).` };
    }
    const first = open.find((t) => t.priority) ?? open[0];
    if (first) return { text: `Nothing is time-blocked. Start with “${first.title}”.` };
    return { text: "Nothing left for today. Enjoy the rest of your day." };
  }

  if (/\bfree\b|\bavailable\b|\bgap|\btime\b/.test(lower)) {
    const busy = slotsForDay(ctx.tasks, ctx.events, ctx.today);
    const from = Math.max(ctx.settings.dayStart, ctx.now);
    const windows = freeWindows(busy, from, ctx.settings.dayEnd).filter(
      (w) => w.end - w.start >= 15,
    );
    if (!windows.length) return { text: "No free time left inside your working hours today." };
    return {
      text:
        "Free today: " +
        windows
          .slice(0, 4)
          .map((w) => `${fmtTime(w.start)}–${fmtTime(w.end)}`)
          .join(", ") +
        ".",
    };
  }

  if (/\bprogress\b|\bdoing\b|\bsummary\b|\bstatus\b|\btoday\b|\bleft\b/.test(lower)) {
    const p = dayProgress(ctx.tasks, ctx.today);
    if (!p.total) return { text: "No tasks for today yet. Add one to get started." };
    const pri = open.filter((t) => t.priority).length;
    return {
      text: `${p.done} of ${p.total} tasks done (${p.pct}%). ${
        pri ? `${pri} priority ${pri === 1 ? "task" : "tasks"} still open.` : "All priorities are done."
      }`,
    };
  }

  return { text: HELP };
}
