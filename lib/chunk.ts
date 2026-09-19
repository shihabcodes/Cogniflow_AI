/**
 * Paragraph-aware text chunking with overlap.
 * Goal: chunks big enough for context, small enough for precise retrieval.
 */

export const CHUNK_TARGET_CHARS = 1100;
export const CHUNK_OVERLAP_CHARS = 140;

export function chunkText(
  text: string,
  target = CHUNK_TARGET_CHARS,
  overlap = CHUNK_OVERLAP_CHARS
): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= target) return [clean];

  // split into paragraphs, then pack paragraphs into chunks under target size
  const paragraphs = clean.split(/\n\n+/).flatMap((p) =>
    p.length > target * 1.5 ? splitLongParagraph(p, target) : [p]
  );

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length <= target) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      // carry overlap from the end of the previous chunk
      current = overlap > 0 && current.length > overlap
        ? current.slice(-overlap) + "\n\n" + p
        : p;
      while (current.length > target * 1.5) {
        chunks.push(current.slice(0, target).trim());
        current = current.slice(target - overlap);
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

function splitLongParagraph(p: string, target: number): string[] {
  const sentences = p.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length <= target) {
      current = current ? `${current} ${s}` : s;
    } else {
      if (current) out.push(current);
      current = s;
    }
  }
  if (current) out.push(current);
  return out;
}

export interface TranscriptEntry {
  text: string;
  offset: number; // ms from video start
}

/**
 * Group raw transcript entries into chunks, keeping the start time of the
 * first entry so answers can deep-link to the exact moment in the video.
 */
export function chunkTranscript(
  entries: TranscriptEntry[],
  target = 900
): { text: string; startTimeSec: number }[] {
  const chunks: { text: string; startTimeSec: number }[] = [];
  let texts: string[] = [];
  let startTimeMs = 0;
  let size = 0;

  for (const e of entries) {
    const t = e.text.replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (size === 0) startTimeMs = e.offset;
    texts.push(t);
    size += t.length + 1;
    if (size >= target) {
      chunks.push({ text: texts.join(" "), startTimeSec: Math.floor(startTimeMs / 1000) });
      texts = [];
      size = 0;
    }
  }
  if (texts.length) {
    chunks.push({ text: texts.join(" "), startTimeSec: Math.floor(startTimeMs / 1000) });
  }
  return chunks;
}
