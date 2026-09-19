import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/gemini";

export const runtime = "nodejs";

const ALLOWED = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a", "audio/mp3", "audio/webm", "video/mp4"];

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get("x-gemini-key") || undefined;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Missing file." }, { status: 400 });

    const mime = ALLOWED.includes(file.type) ? file.type : "audio/mpeg";
    if (file.size > 15_000_000)
      return NextResponse.json(
        { error: "Audio file larger than ~15 MB. Trim it, or extract a section first (long-file support is on the roadmap)." },
        { status: 413 }
      );

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const transcript = await transcribeAudio(base64, mime, apiKey);
    if (!transcript.trim())
      return NextResponse.json({ error: "Transcription came back empty." }, { status: 422 });

    return NextResponse.json({
      title: file.name.replace(/\.[a-z0-9]+$/i, ""),
      text: transcript.trim(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
