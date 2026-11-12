import { NextResponse } from "next/server";
import type { AiStatus } from "@/lib/ai-shared";
import { aiConfig } from "@/lib/ai-server";

export const dynamic = "force-dynamic";

/** Tells the browser which mode is active. Never includes the key itself. */
export function GET() {
  const config = aiConfig();
  const status: AiStatus = {
    mode: config ? "ai" : "demo",
    model: config?.model ?? null,
    environment: process.env.NODE_ENV ?? "development",
  };
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
