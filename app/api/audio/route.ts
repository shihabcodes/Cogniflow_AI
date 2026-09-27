import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/gemini";
import { errorResponse, geminiKey } from "@/lib/api";

export const runtime = "nodejs";

const ALLOWED = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a", "audio/mp3", "audio/webm", "video/mp4"];

export async function POST(req: Request) {
  const { key, denied } = geminiKey(req);
  if (denied) return denied;
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
    // Vercel rejects request bodies over ~4.5 MB before they reach this route.
    if (file.size > 4_000_000)
      return NextResponse.json({ error: "Audio file is larger than ~4 MB. Trim it or extract a section first." }, { status: 413 });

    const mime = ALLOWED.includes(file.type) ? file.type : "audio/mpeg";
    const transcript = (await transcribeAudio(Buffer.from(await file.arrayBuffer()).toString("base64"), mime, key)).trim();
    if (!transcript) return NextResponse.json({ error: "Transcription came back empty." }, { status: 422 });

    return NextResponse.json({ title: file.name.replace(/\.[a-z0-9]+$/i, ""), text: transcript });
  } catch (err) {
    return errorResponse(err, "Failed to transcribe audio.");
  }
}
