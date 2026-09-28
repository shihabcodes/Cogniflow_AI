import { NextResponse } from "next/server";
import type { Turn } from "./types";

/** Requests per visitor per day on the shared key (each question is ~2 requests). */
export const SHARED_DAILY_LIMIT = Number(process.env.SHARED_KEY_DAILY_LIMIT) || 100;

/** x-real-ip is set by Vercel. Clients can prepend to x-forwarded-for, so only trust its LAST entry. */
export const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";

/**
 * The caller's Gemini key from the x-gemini-key header. Without one, the request
 * falls back to the deployment's shared key (NEXT_PUBLIC_SHARED_KEY) under a daily
 * per-visitor cap; with no shared key it's a 401.
 * Every route that spends Gemini quota must return `denied` when it is set.
 */
export async function geminiKey(req: Request): Promise<{ key?: string; denied?: NextResponse }> {
  const key = req.headers.get("x-gemini-key") || undefined;
  if (key) return { key };
  if (!process.env.NEXT_PUBLIC_SHARED_KEY)
    return {
      denied: NextResponse.json(
        { error: "Missing Gemini API key. Please enter your Gemini API key in Settings." },
        { status: 401 }
      ),
    };
  if (await withinSharedQuota(req)) return {};
  return {
    denied: NextResponse.json(
      {
        error: `You've reached today's free limit on the shared key. Add your own free Gemini key in Settings to keep going — it takes a minute at aistudio.google.com.`,
      },
      { status: 429 }
    ),
  };
}

// Counts in Supabase (consume_quota, migration 0002). Subjects are the client IP hashed
// with the server secret, so neither raw IPs nor guessable ids are stored. Fails open:
// a counter outage shouldn't take the app down.
async function withinSharedQuota(req: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.QUOTA_SECRET;
  if (!url || !apikey || !secret) return true;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${clientIp(req)}`));
  const subject = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  try {
    const res = await fetch(`${url}/rest/v1/rpc/consume_quota`, {
      method: "POST",
      headers: { apikey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: secret, p_subject: subject, p_limit: SHARED_DAILY_LIMIT }),
      cache: "no-store",
    });
    return res.ok ? (await res.json()) === true : true;
  } catch {
    return true;
  }
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
