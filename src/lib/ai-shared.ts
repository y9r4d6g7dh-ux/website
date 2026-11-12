/** Wire types shared by the browser and the server-side AI route. */

export interface AiStatus {
  /** "demo" = local rule-based engine. "ai" = a server-side model is configured. */
  mode: "demo" | "ai";
  model: string | null;
  environment: string;
}

export interface AiTask {
  id: string;
  title: string;
  priority: boolean;
  durationMin: number;
}

export interface AiEvent {
  title: string;
  start: string;
  end: string;
}

export interface AiRequest {
  kind: "plan" | "ask";
  date: string;
  /** "HH:MM" local time, or null when planning a future day. */
  now: string | null;
  dayStart: string;
  dayEnd: string;
  tasks: AiTask[];
  events: AiEvent[];
  /** Planning preference or question from the user. */
  text: string;
}

export interface AiPlanResponse {
  kind: "plan";
  blocks: { taskId: string; start: string }[];
  note: string;
  model: string;
}

export interface AiAskResponse {
  kind: "ask";
  text: string;
  model: string;
}

export interface AiErrorResponse {
  error: string;
}
