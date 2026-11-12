"use client";

import { useEffect, useState } from "react";
import type {
  AiAskResponse,
  AiErrorResponse,
  AiPlanResponse,
  AiRequest,
  AiStatus,
} from "./ai-shared";
import { parseHHMM, toHHMM } from "./date";
import type { PlanBlock } from "./planner";
import type { CalEvent, Settings, Task } from "./types";

const DEMO: AiStatus = { mode: "demo", model: null, environment: "development" };
let cached: Promise<AiStatus> | null = null;

export function fetchStatus(): Promise<AiStatus> {
  cached ??= fetch("/api/status")
    .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : DEMO))
    .catch(() => DEMO);
  return cached;
}

/** Null while loading. Falls back to demo mode if the server can't be reached. */
export function useAiStatus(): AiStatus | null {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}

export interface DayContext {
  date: string;
  now: number | null;
  settings: Pick<Settings, "dayStart" | "dayEnd">;
  tasks: Task[];
  events: CalEvent[];
}

function buildRequest(kind: AiRequest["kind"], ctx: DayContext, text: string): AiRequest {
  return {
    kind,
    date: ctx.date,
    now: ctx.now === null ? null : toHHMM(ctx.now),
    dayStart: toHHMM(ctx.settings.dayStart),
    dayEnd: toHHMM(ctx.settings.dayEnd),
    tasks: ctx.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      durationMin: t.durationMin,
    })),
    events: ctx.events.map((e) => ({ title: e.title, start: toHHMM(e.start), end: toHHMM(e.end) })),
    text,
  };
}

async function call<T>(body: AiRequest): Promise<T> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as T | AiErrorResponse | null;
  if (!res.ok || !json || "error" in (json as object)) {
    throw new Error((json as AiErrorResponse | null)?.error ?? "The AI service is unavailable.");
  }
  return json as T;
}

export async function aiPlan(ctx: DayContext, hint: string) {
  const res = await call<AiPlanResponse>(buildRequest("plan", ctx, hint));
  const byId = new Map(ctx.tasks.map((t) => [t.id, t]));
  const blocks: PlanBlock[] = [];
  for (const b of res.blocks) {
    const start = parseHHMM(b.start);
    const task = byId.get(b.taskId);
    // Unknown ids are kept so validation can reject the plan as a whole.
    if (start === null) continue;
    blocks.push({ taskId: b.taskId, start, end: start + (task?.durationMin ?? 30) });
  }
  return { blocks, note: res.note, model: res.model };
}

export async function aiAsk(ctx: DayContext, question: string) {
  return call<AiAskResponse>(buildRequest("ask", ctx, question));
}
