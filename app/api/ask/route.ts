import { NextResponse } from "next/server";
import { answerWith } from "@/lib/gemini";
import type { RetrievedChunk } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You are Cogniflow, a precise research assistant answering questions strictly from the provided source excerpts.

Rules:
- Answer ONLY from the excerpts. If they do not contain the answer, say so plainly.
- Cite every claim with the excerpt's number in brackets, like [2]. Multiple: [1][3].
- Do not invent numbers, quotes, or facts. Quote the source when wording matters.
- Be concise. Prefer short paragraphs or bullets.`;

export async function POST(req: Request) {
  try {
    const headerKey = req.headers.get("x-gemini-key") || undefined;
    const { question, chunks, apiKey: bodyKey } = (await req.json()) as {
      question?: string;
      chunks?: RetrievedChunk[];
      apiKey?: string;
    };
    const effectiveKey = headerKey || bodyKey;

    if (!question?.trim())
      return NextResponse.json({ error: "Missing question." }, { status: 400 });
    if (!chunks?.length)
      return NextResponse.json({ error: "No retrieved chunks provided." }, { status: 400 });

    const context = chunks
      .map(
        (c) =>
          `[${c.n}] source: "${c.sourceTitle}" (${c.sourceType}${
            c.startTimeSec !== undefined ? `, at ${c.startTimeSec}s` : ""
          })\n${c.text}`
      )
      .join("\n\n---\n\n");

    const answer = await answerWith(
      SYSTEM,
      `Source excerpts:\n\n${context}\n\n---\n\nQuestion: ${question.trim()}`,
      effectiveKey
    );
    return NextResponse.json({ answer });
  } catch (err) {
    let message = err instanceof Error ? err.message : "Answer generation failed.";
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // not JSON
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
