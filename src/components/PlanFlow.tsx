"use client";

import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { Dots } from "./ui/Bits";
import { Button } from "./ui/Button";
import { Sheet } from "./ui/Sheet";
import { aiPlan, fetchStatus } from "@/lib/ai-client";
import { fmtDuration, fmtTime, relativeDay } from "@/lib/date";
import { rise, stagger } from "@/lib/motion";
import { planDay, validatePlan, type PlanBlock } from "@/lib/planner";
import { useStore } from "@/lib/store";

interface Proposal {
  blocks: PlanBlock[];
  unscheduled: string[];
  source: "local" | "ai";
  model?: string;
  note?: string;
  /** Shown when we had to fall back from AI to the local engine. */
  notice?: string;
}

export interface PlanFlow {
  date: string;
  open: boolean;
  loading: boolean;
  proposal: Proposal | null;
  propose(hint?: string): Promise<void>;
  apply(): void;
  close(): void;
}

export const LOCAL_ENGINE_LABEL = "Local demo engine · rule-based, not an AI model";

export function usePlanFlow(date: string): PlanFlow {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);

  const { data, today, now, applyPlan } = store;

  const propose = useCallback(
    async (hint = "") => {
      const tasks = data.tasks.filter((t) => t.date === date && !t.done);
      const events = data.events.filter((e) => e.date === date);
      const clock = date === today ? now : null;
      const { dayStart, dayEnd } = data.settings;
      const local = (): Proposal => ({
        ...planDay({ tasks, events, dayStart, dayEnd, now: clock }),
        source: "local",
      });

      setOpen(true);
      setProposal(null);
      if (!tasks.length) {
        setProposal({ blocks: [], unscheduled: [], source: "local" });
        return;
      }

      setLoading(true);
      try {
        const status = await fetchStatus();
        if (status.mode !== "ai") {
          setProposal(local());
          return;
        }
        const ai = await aiPlan({ date, now: clock, settings: data.settings, tasks, events }, hint);
        const problems = validatePlan(ai.blocks, tasks, events, Math.max(dayStart, clock ?? 0), dayEnd);
        if (problems.length || !ai.blocks.length) {
          setProposal({
            ...local(),
            notice: "The AI plan had scheduling conflicts, so the local engine planned this instead.",
          });
        } else {
          const placed = new Set(ai.blocks.map((b) => b.taskId));
          setProposal({
            blocks: [...ai.blocks].sort((a, b) => a.start - b.start),
            unscheduled: tasks.filter((t) => !placed.has(t.id)).map((t) => t.id),
            source: "ai",
            model: ai.model,
            note: ai.note,
          });
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : "The AI service is unavailable.";
        setProposal({ ...local(), notice: `${reason} The local engine planned this instead.` });
      } finally {
        setLoading(false);
      }
    },
    [data.tasks, data.events, data.settings, date, today, now],
  );

  return {
    date,
    open,
    loading,
    proposal,
    propose,
    apply() {
      if (proposal) applyPlan(date, proposal.blocks);
      setOpen(false);
    },
    close: () => setOpen(false),
  };
}

export function PlanSheet({ flow }: { flow: PlanFlow }) {
  const { data, today } = useStore();
  const { proposal, loading } = flow;
  const taskById = new Map(data.tasks.map((t) => [t.id, t]));
  const events = data.events.filter((e) => e.date === flow.date);

  const rows = proposal
    ? [
        ...proposal.blocks.map((b) => ({
          id: b.taskId,
          start: b.start,
          end: b.end,
          title: taskById.get(b.taskId)?.title ?? "Task",
          priority: taskById.get(b.taskId)?.priority ?? false,
          fixed: false,
        })),
        ...events.map((e) => ({
          id: e.id,
          start: e.start,
          end: e.end,
          title: e.title,
          priority: false,
          fixed: true,
        })),
      ].sort((a, b) => a.start - b.start)
    : [];

  return (
    <Sheet
      open={flow.open}
      onClose={flow.close}
      title={`Plan for ${relativeDay(flow.date, today).toLowerCase()}`}
      description={
        proposal
          ? proposal.source === "ai"
            ? `Planned by AI · ${proposal.model}`
            : LOCAL_ENGINE_LABEL
          : undefined
      }
    >
      {loading || !proposal ? (
        <div className="flex items-center gap-3 py-10 text-sm text-muted">
          <Dots label="Planning" /> Building your plan…
        </div>
      ) : proposal.blocks.length === 0 && proposal.unscheduled.length === 0 ? (
        <div className="py-6">
          <p className="text-[15px]">Nothing to plan.</p>
          <p className="mt-1 text-sm text-muted">Add a task for this day and try again.</p>
          <div className="mt-5 flex justify-end">
            <Button variant="primary" onClick={flow.close}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {proposal.notice && (
            <p className="mb-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-muted">
              {proposal.notice}
            </p>
          )}
          {proposal.note && <p className="mb-3 text-sm text-muted">{proposal.note}</p>}

          {rows.length > 0 && (
            <motion.ol variants={stagger} initial="hidden" animate="show" className="space-y-1.5">
              {rows.map((r) => (
                <motion.li
                  key={r.id}
                  variants={rise}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                    r.fixed ? "border-transparent bg-transparent" : "border-line bg-card"
                  }`}
                >
                  <span className="tabular w-[68px] shrink-0 text-[13px] text-muted">{fmtTime(r.start)}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] ${r.fixed ? "text-muted" : ""}`}>{r.title}</span>
                    <span className="block text-[13px] text-muted">
                      {r.fixed ? "Event" : r.priority ? "Priority" : "Task"} · {fmtDuration(r.end - r.start)}
                    </span>
                  </span>
                  {r.priority && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />}
                </motion.li>
              ))}
            </motion.ol>
          )}

          {proposal.unscheduled.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] text-muted">
                Didn’t fit in your working hours — these stay unscheduled:
              </p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {proposal.unscheduled.map((id) => (
                  <li key={id} className="truncate">
                    {taskById.get(id)?.title ?? "Task"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 mt-5 flex justify-end gap-2 bg-surface px-5 pt-3">
            <Button variant="ghost" onClick={flow.close}>
              Not now
            </Button>
            <Button variant="primary" onClick={flow.apply} disabled={!proposal.blocks.length}>
              Apply plan
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
