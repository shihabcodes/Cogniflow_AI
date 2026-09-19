export interface TimestampedSegment {
  text: string;
  startTimeSec: number;
}

/**
 * Parses timestamp strings like [01:23], 1:23, [01:23:45], 1:23:45 into total seconds.
 */
export function parseTimestampToSeconds(ts: string): number {
  const clean = ts.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

/**
 * Parses raw text containing timestamps (e.g. from Gemini's video transcription)
 * into timestamped segments grouped by target chunk size.
 */
export function parseTimestampedTranscript(
  rawText: string,
  targetChunkSize = 900
): TimestampedSegment[] {
  const lines = rawText.split(/\r?\n/);
  const segments: TimestampedSegment[] = [];

  // Match: [00:12] or 00:12 or [1:23:45] or 1:23:45 at start of line or bullet
  const tsRegex = /^(?:[-*•]\s*)?\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[:-]?\s*(.*)$/;

  let currentSec = 0;
  let currentText = "";
  let foundAnyTimestamp = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(tsRegex);
    if (match) {
      foundAnyTimestamp = true;
      if (currentText.trim()) {
        segments.push({ text: currentText.trim(), startTimeSec: currentSec });
      }
      currentSec = parseTimestampToSeconds(match[1]);
      currentText = match[2] || "";
    } else {
      currentText = currentText ? `${currentText} ${trimmed}` : trimmed;
    }
  }

  if (currentText.trim()) {
    segments.push({ text: currentText.trim(), startTimeSec: currentSec });
  }

  if (!foundAnyTimestamp || segments.length === 0) {
    return [{ text: rawText.trim(), startTimeSec: 0 }];
  }

  // Group into chunks of targetChunkSize
  const chunks: TimestampedSegment[] = [];
  let chunkTexts: string[] = [];
  let chunkStartSec = segments[0].startTimeSec;
  let curSize = 0;

  for (const seg of segments) {
    if (curSize === 0) chunkStartSec = seg.startTimeSec;
    chunkTexts.push(seg.text);
    curSize += seg.text.length + 1;

    if (curSize >= targetChunkSize) {
      chunks.push({ text: chunkTexts.join(" "), startTimeSec: chunkStartSec });
      chunkTexts = [];
      curSize = 0;
    }
  }

  if (chunkTexts.length > 0) {
    chunks.push({ text: chunkTexts.join(" "), startTimeSec: chunkStartSec });
  }

  return chunks;
}
