import { NextResponse } from "next/server";
import { embedTexts } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const headerKey = req.headers.get("x-gemini-key") || undefined;
    const { texts, taskType, apiKey: bodyKey } = (await req.json()) as {
      texts?: string[];
      taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";
      apiKey?: string;
    };
    const effectiveKey = headerKey || bodyKey;

    if (!texts?.length || texts.length > 96)
      return NextResponse.json({ error: "Provide between 1 and 96 texts." }, { status: 400 });

    const vectors = await embedTexts(
      texts,
      taskType === "RETRIEVAL_QUERY" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      effectiveKey
    );
    return NextResponse.json({ vectors });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Embedding failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
