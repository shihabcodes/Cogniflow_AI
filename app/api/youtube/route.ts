import { NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { chunkTranscript } from "@/lib/chunk";
import { transcribeYouTube } from "@/lib/gemini";
import { parseTimestampedTranscript } from "@/lib/parse-timestamps";

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
    const headerKey = req.headers.get("x-gemini-key") || undefined;
    const { url, apiKey: bodyApiKey } = (await req.json()) as { url?: string; apiKey?: string };
    const effectiveKey = headerKey || bodyApiKey;

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

    // Tier 1: Try scraping captions directly (fastest & free)
    let chunks: { text: string; startTimeSec: number }[] | null = null;
    let scrapeError: string | null = null;

    try {
      let entries;
      try {
        entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      } catch {
        entries = await YoutubeTranscript.fetchTranscript(videoId);
      }
      if (entries?.length) {
        chunks = chunkTranscript(
          entries.map((e) => ({ text: e.text, offset: e.offset }))
        );
      }
    } catch (err) {
      scrapeError = err instanceof Error ? err.message : "Transcript scraping failed";
    }

    // Tier 2: If scraping failed (e.g. Vercel AWS IP blocked by YouTube), use Gemini video understanding
    if (!chunks || chunks.length === 0) {
      console.log(`Scraping failed for ${videoId} (${scrapeError}). Falling back to Gemini video understanding...`);
      try {
        const rawTranscript = await transcribeYouTube(videoId, effectiveKey);
        if (rawTranscript && rawTranscript.trim()) {
          chunks = parseTimestampedTranscript(rawTranscript);
        }
      } catch (geminiErr) {
        let geminiMsg = geminiErr instanceof Error ? geminiErr.message : "Gemini video understanding failed";
        try {
          const parsed = JSON.parse(geminiMsg);
          if (parsed?.error?.message) {
            geminiMsg = parsed.error.message;
          }
        } catch {
          // not JSON
        }

        if (
          geminiMsg.includes("exceeds the maximum number of tokens") ||
          geminiMsg.includes("input token count exceeds") ||
          geminiMsg.includes("too long")
        ) {
          return NextResponse.json(
            {
              error: "This video is very long (> 1 hour) for direct AI video ingestion, and YouTube blocked caption scraping from Vercel. Tip: Open this video on YouTube, click '... More' -> 'Show transcript', copy it, and paste it into the 'Text' tab to query it immediately!",
            },
            { status: 413 }
          );
        }

        return NextResponse.json(
          {
            error: `Could not fetch transcript: YouTube blocked direct scraping (${scrapeError || "captions unavailable"}), and Gemini fallback reported: ${geminiMsg}. Check your Gemini API key in Settings.`,
          },
          { status: 502 }
        );
      }
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "No transcript could be extracted for this video. Please check the video URL or enter your Gemini API key in Settings." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      videoId,
      title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      chunks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch transcript.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
