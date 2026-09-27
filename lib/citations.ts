import type { RetrievedChunk } from "./types";

export type AnswerToken =
  | { kind: "text"; value: string }
  | { kind: "cite"; n: number };

/**
 * Split a model answer into text and citation tokens.
 * The model is instructed to cite sources as [1], [2], … matching the
 * numbered context chunks it received.
 */
export function parseCitations(answer: string): AnswerToken[] {
  const tokens: AnswerToken[] = [];
  const re = /\[(\d{1,2})\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer)) !== null) {
    if (m.index > last) tokens.push({ kind: "text", value: answer.slice(last, m.index) });
    tokens.push({ kind: "cite", n: parseInt(m[1], 10) });
    last = m.index + m[0].length;
  }
  if (last < answer.length) tokens.push({ kind: "text", value: answer.slice(last) });
  return tokens;
}

export const CITE_HREF_PREFIX = "#cite-";

/**
 * Rewrite each [n] citation as a markdown link to `#cite-n`, so the whole
 * answer can be rendered as one markdown document (lists, bold, etc. stay
 * intact) and the renderer can swap those links for citation chips.
 */
export function linkCitations(answer: string): string {
  return parseCitations(answer)
    .map((t) => (t.kind === "text" ? t.value : `[${t.n}](${CITE_HREF_PREFIX}${t.n})`))
    .join("");
}

export function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
}

/** Deep link for a citation: the exact second for YouTube, else the source URL. */
export function citationHref(c: RetrievedChunk): string | undefined {
  return c.videoId && c.startTimeSec !== undefined
    ? `https://www.youtube.com/watch?v=${c.videoId}&t=${c.startTimeSec}s`
    : c.sourceUrl;
}

/** The answer as portable Markdown, with a list of the sources it actually cited. */
export function answerToMarkdown(answer: string, citations: RetrievedChunk[]): string {
  const cited = new Set(parseCitations(answer).flatMap((t) => (t.kind === "cite" ? [t.n] : [])));
  const refs = citations
    .filter((c) => cited.has(c.n))
    .map((c) => {
      const label = `${c.sourceTitle}${c.startTimeSec !== undefined ? ` @ ${formatTime(c.startTimeSec)}` : ""}`;
      const href = citationHref(c);
      return `[${c.n}] ${href ? `[${label}](${href})` : label}`;
    });
  return refs.length ? `${answer.trim()}\n\n**Sources**\n\n${refs.join("  \n")}\n` : `${answer.trim()}\n`;
}
