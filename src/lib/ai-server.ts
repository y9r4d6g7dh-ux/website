import "server-only";

export const DEFAULT_MODEL = "claude-opus-5-5";

/** Server-side AI configuration, or null when EasyLife runs in Local Demo Mode. */
export function aiConfig(): { apiKey: string; model: string } | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, model: process.env.EASYLIFE_AI_MODEL?.trim() || DEFAULT_MODEL };
}
