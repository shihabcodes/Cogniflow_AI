import { NextResponse } from "next/server";
import { embedTexts } from "@/lib/gemini";
import { errorResponse, geminiKey } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { key, denied } = geminiKey(req);
  if (denied) return denied;
  try {
    const { texts, taskType } = (await req.json()) as { texts?: string[]; taskType?: string };
    if (!texts?.length || texts.length > 96 || texts.some((t) => typeof t !== "string" || t.length > 5000))
      return NextResponse.json({ error: "Provide between 1 and 96 texts, max 5,000 characters each." }, { status: 400 });

    const vectors = await embedTexts(texts, taskType === "RETRIEVAL_QUERY" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT", key);
    return NextResponse.json({ vectors });
  } catch (err) {
    return errorResponse(err, "Embedding failed.");
  }
}
