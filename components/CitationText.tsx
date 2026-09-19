"use client";

import ReactMarkdown from "react-markdown";
import { parseCitations } from "@/lib/citations";
import type { Citation } from "@/lib/types";

/**
 * Renders a model answer: markdown for text, [n] markers become citation
 * chips that link to the exact moment in a video (or show the source).
 */
export default function CitationText({
  answer,
  citations,
}: {
  answer: string;
  citations: Citation[];
}) {
  const tokens = parseCitations(answer);
  return (
    <div className="prose-answer text-sm text-slate-200">
      {tokens.map((t, i) =>
        t.kind === "text" ? (
          <ReactMarkdown key={i}>{t.value}</ReactMarkdown>
        ) : (
          <CitationChip key={i} citation={citations[t.n - 1]} n={t.n} />
        )
      )}
    </div>
  );
}

function CitationChip({ citation, n }: { citation?: Citation; n: number }) {
  if (!citation) {
    return (
      <sup className="mx-0.5 rounded bg-slate-800 px-1 text-xs text-slate-400">[{n}]</sup>
    );
  }
  const href =
    citation.videoId && citation.startTimeSec !== undefined
      ? `https://www.youtube.com/watch?v=${citation.videoId}&t=${citation.startTimeSec}s`
      : citation.sourceUrl;
  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noreferrer"
      title={`${citation.sourceTitle}${citation.startTimeSec !== undefined ? ` — at ${formatTime(citation.startTimeSec)}` : ""}\n${citation.snippet.slice(0, 180)}…`}
      className="mx-0.5 inline-flex items-center gap-0.5 rounded bg-indigo-600/80 px-1.5 align-super text-[10px] font-semibold text-white hover:bg-indigo-500"
    >
      {n}
      {citation.videoId && citation.startTimeSec !== undefined ? " ▸" : ""}
    </a>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
