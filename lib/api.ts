import { NextResponse } from "next/server";
import type { Turn } from "./types";

/**
 * The caller's Gemini key from the x-gemini-key header, plus a 401 response when
 * there is none and the owner hasn't opted into the server key (ALLOW_SERVER_KEY).
 * Every route that spends Gemini quota must return `denied` when it is set.
 */
export function geminiKey(req: Request): { key?: string; denied?: NextResponse } {
  const key = req.headers.get("x-gemini-key") || undefined;
  if (key || process.env.ALLOW_SERVER_KEY) return { key };
  return {
    denied: NextResponse.json(
      { error: "Missing Gemini API key. Please enter your Gemini API key in Settings." },
      { status: 401 }
    ),
  };
}

/** Error text for the client. Gemini errors carry a JSON body as their message; unwrap it. */
export function errorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : fallback;
  try {
    return JSON.parse(msg)?.error?.message ?? msg;
  } catch {
    return msg;
  }
}

export function errorResponse(err: unknown, fallback: string, status = 500): NextResponse {
  return NextResponse.json({ error: errorMessage(err, fallback) }, { status });
}

/**
 * Validate client-sent chat history and render it as plain text for a prompt.
 * Returns null if malformed. [n] markers are stripped: they pointed at excerpts
 * from earlier turns and would collide with this turn's numbering.
 */
export function conversationText(history: unknown): string | null {
  if (history === undefined) return "";
  if (!Array.isArray(history) || history.length > 10) return null;
  const turns = history as Turn[];
  if (turns.some((t) => (t?.role !== "user" && t?.role !== "assistant") || typeof t.text !== "string" || t.text.length > 4000))
    return null;
  return turns.map((t) => `${t.role === "user" ? "User" : "Assistant"}: ${t.text.replace(/\[\d{1,2}\]/g, "")}`).join("\n");
}
