import { NextResponse } from "next/server";
import { embedTexts, standaloneQuestion } from "@/lib/gemini";
import { conversationText, errorResponse, geminiKey } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { key, denied } = await geminiKey(req);
  if (denied) return denied;
  try {
    const { texts, taskType, history } = (await req.json()) as { texts?: string[]; taskType?: string; history?: unknown };
    if (!texts?.length || texts.length > 96 || texts.some((t) => typeof t !== "string" || t.length > 5000))
      return NextResponse.json({ error: "Provide between 1 and 96 texts, max 5,000 characters each." }, { status: 400 });

    if (taskType !== "RETRIEVAL_QUERY") return NextResponse.json({ vectors: await embedTexts(texts, "RETRIEVAL_DOCUMENT", key) });

    // A query with chat history is rewritten first so follow-ups ("what about the second one?") retrieve well.
    const conversation = conversationText(history);
    if (conversation === null || texts.length !== 1)
      return NextResponse.json({ error: "A query is one text plus an optional history of ≤10 turns." }, { status: 400 });
    const query = conversation ? await standaloneQuestion(conversation, texts[0], key) : texts[0];
    return NextResponse.json({ vectors: await embedTexts([query], "RETRIEVAL_QUERY", key), query });
  } catch (err) {
    return errorResponse(err, "Embedding failed.");
  }
}
