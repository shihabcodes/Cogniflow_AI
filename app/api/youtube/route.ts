import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { chunkTranscript } from "@/lib/chunk";
import { transcribeYouTube } from "@/lib/gemini";
import { parseTimestampedTranscript } from "@/lib/parse-timestamps";
import { errorMessage, errorResponse, geminiKey } from "@/lib/api";

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

async function scrapeCaptions(videoId: string) {
  const entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" }).catch(() =>
    YoutubeTranscript.fetchTranscript(videoId)
  );
  return chunkTranscript(entries.map((e) => ({ text: e.text, offset: e.offset })));
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    if (!url) return NextResponse.json({ error: "Missing url." }, { status: 400 });

    const videoId = extractVideoId(url);
    if (!videoId) return NextResponse.json({ error: "Could not parse a YouTube video ID from that URL." }, { status: 400 });

    const title = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(async (r) => (r.ok ? ((await r.json()) as { title?: string }).title : undefined))
      .catch(() => undefined); // cosmetic — fall back to the videoId

    // Tier 1: scrape captions (free). Often blocked from Vercel IPs.
    let chunks: { text: string; startTimeSec: number }[] = [];
    let scrapeError = "captions unavailable";
    try {
      chunks = await scrapeCaptions(videoId);
    } catch (err) {
      scrapeError = errorMessage(err, scrapeError);
    }

    // Tier 2: have Gemini watch the video. Spends quota, so it needs a key.
    if (!chunks.length) {
      const { key, denied } = geminiKey(req);
      if (denied)
        return NextResponse.json(
          { error: `Could not scrape captions for this video (${scrapeError}). Add your Gemini API key in Settings so Gemini can transcribe it instead.` },
          { status: 401 }
        );
      try {
        chunks = parseTimestampedTranscript(await transcribeYouTube(videoId, key));
      } catch (err) {
        const msg = errorMessage(err, "Gemini video understanding failed");
        if (/exceeds the maximum number of tokens|input token count exceeds|too long/.test(msg))
          return NextResponse.json(
            { error: "This video is too long for direct AI video ingestion, and YouTube blocked caption scraping. Tip: open the video on YouTube, click '… More' → 'Show transcript', copy it, and paste it into the 'Text' tab." },
            { status: 413 }
          );
        return NextResponse.json(
          { error: `Could not fetch transcript: YouTube blocked direct scraping (${scrapeError}), and Gemini fallback reported: ${msg}` },
          { status: 502 }
        );
      }
    }

    if (!chunks.length)
      return NextResponse.json({ error: "No transcript could be extracted for this video." }, { status: 404 });

    return NextResponse.json({ videoId, title: title ?? videoId, url: `https://www.youtube.com/watch?v=${videoId}`, chunks });
  } catch (err) {
    return errorResponse(err, "Failed to fetch transcript.");
  }
}
