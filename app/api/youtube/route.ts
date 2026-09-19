import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { chunkTranscript } from "@/lib/chunk";

export const runtime = "nodejs";

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    const parts = url.pathname.split("/");
    const i = parts.findIndex((p) => ["shorts", "embed", "live"].includes(p));
    if (i >= 0 && parts[i + 1]) return parts[i + 1];
  } catch {
    return null;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: "Missing url." }, { status: 400 });

    const videoId = extractVideoId(url);
    if (!videoId)
      return NextResponse.json({ error: "Could not parse a YouTube video ID from that URL." }, { status: 400 });

    let title = videoId;
    try {
      const oembed = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembed.ok) title = ((await oembed.json()) as { title?: string }).title ?? title;
    } catch {
      // title is cosmetic — keep the videoId on failure
    }

    let entries;
    try {
      // prefer English captions when available, fall back to whatever exists
      entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    } catch {
      entries = await YoutubeTranscript.fetchTranscript(videoId);
    }
    if (!entries?.length)
      return NextResponse.json({ error: "No transcript available for this video." }, { status: 404 });

    const chunks = chunkTranscript(
      entries.map((e) => ({ text: e.text, offset: e.offset }))
    );
    return NextResponse.json({ videoId, title, url: `https://www.youtube.com/watch?v=${videoId}`, chunks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcript.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
