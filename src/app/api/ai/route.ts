/**
 * Real AI Mode. Runs only on the server: the API key is read from the
 * environment here and never reaches the browser. Without a key this route
 * answers 503 and the app uses its local, rule-based engine instead.
 */
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { aiConfig } from "@/lib/ai-server";
import type {
  AiAskResponse,
  AiErrorResponse,
  AiEvent,
  AiPlanResponse,
  AiRequest,
  AiTask,
} from "@/lib/ai-shared";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (error: string, status: number) =>
  NextResponse.json<AiErrorResponse>({ error }, { status });

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Accept only the shape we expect; anything else is a 400. */
function parseRequest(body: unknown): AiRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.kind !== "plan" && b.kind !== "ask") return null;
  if (typeof b.date !== "string" || !DATE.test(b.date)) return null;
  if (typeof b.dayStart !== "string" || !HHMM.test(b.dayStart)) return null;
  if (typeof b.dayEnd !== "string" || !HHMM.test(b.dayEnd)) return null;
  if (b.now !== null && (typeof b.now !== "string" || !HHMM.test(b.now))) return null;
  if (!Array.isArray(b.tasks) || !Array.isArray(b.events)) return null;
  if (b.tasks.length > 80 || b.events.length > 80) return null;

  const tasks: AiTask[] = [];
  for (const t of b.tasks as Record<string, unknown>[]) {
    if (!t || typeof t.id !== "string" || typeof t.durationMin !== "number") return null;
    tasks.push({
      id: t.id.slice(0, 64),
      title: str(t.title, 200),
      priority: t.priority === true,
      durationMin: Math.min(600, Math.max(5, Math.round(t.durationMin))),
    });
  }
  const events: AiEvent[] = [];
  for (const e of b.events as Record<string, unknown>[]) {
    if (!e || typeof e.start !== "string" || typeof e.end !== "string") return null;
    if (!HHMM.test(e.start) || !HHMM.test(e.end)) return null;
    events.push({ title: str(e.title, 200), start: e.start, end: e.end });
  }
  return {
    kind: b.kind,
    date: b.date,
    now: b.now as string | null,
    dayStart: b.dayStart,
    dayEnd: b.dayEnd,
    tasks,
    events,
    text: str(b.text, 1000),
  };
}

function describeDay(r: AiRequest): string {
  return JSON.stringify(
    {
      date: r.date,
      currentTime: r.now,
      workingHours: { start: r.dayStart, end: r.dayEnd },
      fixedEvents: r.events,
      openTasks: r.tasks,
    },
    null,
    2,
  );
}

const PLAN_SYSTEM = `You are the planning engine inside EasyLife, a calm daily planner.
You receive one day: fixed calendar events, open tasks with durations, and working hours.
Return a time-blocked plan for the tasks.

The app validates your plan and discards it if a block overlaps an event or another block,
starts before currentTime (when given) or the start of working hours, or ends after working
hours. So: keep every block inside the free time, start blocks on 5-minute marks, and use
each task's durationMin as its length. Put priority tasks earlier, when energy is highest,
and leave a few minutes between blocks. If everything cannot fit, leave the least important
tasks out rather than overbooking. Respect the user's stated preference when one is given.
"note" is one short, plain sentence about the plan — no cheerleading.`;

const ASK_SYSTEM = `You are EasyLife, a calm and concise daily-planning assistant.
Answer the user's question using the day's data provided. Be direct and practical:
two or three short sentences, plain text, no markdown, no lists unless asked.
You cannot change tasks or events yourself — if the user wants a change, tell them
which button to use (for example "Plan my day").`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          start: { type: "string", description: "24-hour HH:MM start time" },
        },
        required: ["taskId", "start"],
        additionalProperties: false,
      },
    },
    note: { type: "string" },
  },
  required: ["blocks", "note"],
  additionalProperties: false,
} as const;

export async function POST(request: Request) {
  const config = aiConfig();
  if (!config) {
    return fail("AI is not configured. EasyLife is running in Local Demo Mode.", 503);
  }

  let input: AiRequest | null = null;
  try {
    input = parseRequest(await request.json());
  } catch {
    /* handled below */
  }
  if (!input) return fail("Invalid request.", 400);
  if (input.kind === "ask" && !input.text.trim()) return fail("Ask a question first.", 400);

  const client = new Anthropic({ apiKey: config.apiKey, timeout: 55_000, maxRetries: 1 });
  const isPlan = input.kind === "plan";
  const userText = isPlan
    ? `${describeDay(input)}\n\nPreference: ${input.text.trim() || "none"}`
    : `${describeDay(input)}\n\nQuestion: ${input.text.trim()}`;

  try {
    const response = await client.beta.messages.create({
      model: config.model,
      max_tokens: 16000,
      system: isPlan ? PLAN_SYSTEM : ASK_SYSTEM,
      messages: [{ role: "user", content: userText }],
      output_config: {
        effort: "low",
        ...(isPlan ? { format: { type: "json_schema" as const, schema: PLAN_SCHEMA } } : {}),
      },
      // If a request is declined by a safety classifier, let the API retry it
      // on its default fallback model instead of failing the plan.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      return fail("The AI model declined this request.", 502);
    }
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();
    if (!text) return fail("The AI model returned an empty answer.", 502);

    if (!isPlan) {
      return NextResponse.json<AiAskResponse>({ kind: "ask", text, model: response.model });
    }

    let parsed: { blocks?: unknown; note?: unknown };
    try {
      parsed = JSON.parse(text);
    } catch {
      return fail("The AI model returned a plan that could not be read.", 502);
    }
    const blocks = Array.isArray(parsed.blocks)
      ? parsed.blocks.filter(
          (b): b is { taskId: string; start: string } =>
            !!b && typeof b.taskId === "string" && typeof b.start === "string" && HHMM.test(b.start),
        )
      : [];
    return NextResponse.json<AiPlanResponse>({
      kind: "plan",
      blocks: blocks.map((b) => ({ taskId: b.taskId, start: b.start })),
      note: str(parsed.note, 300),
      model: response.model,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return fail("The AI key was rejected. Check ANTHROPIC_API_KEY in .env.local.", 502);
    }
    if (err instanceof Anthropic.PermissionDeniedError || err instanceof Anthropic.NotFoundError) {
      return fail(`The model "${config.model}" is not available for this key.`, 502);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return fail("The AI service is rate-limited right now. Try again in a moment.", 429);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return fail("Could not reach the AI service. Check your connection.", 502);
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[EasyLife] AI request failed", err.status, err.message);
      return fail("The AI service returned an error.", 502);
    }
    console.error("[EasyLife] unexpected AI error", err);
    return fail("Something went wrong while planning.", 500);
  }
}
