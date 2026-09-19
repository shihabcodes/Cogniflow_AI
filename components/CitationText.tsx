"use client";

import ReactMarkdown from "react-markdown";
import { parseCitations } from "@/lib/citations";
import type { Citation } from "@/lib/types";

/**
 * Renders a model answer: markdown for text, [n] markers become YC-themed citation
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
    <div className="prose-answer">
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
      <sup className="mx-0.5 inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
        [{n}]
      </sup>
    );
  }
  const href =
    citation.videoId && citation.startTimeSec !== undefined
      ? `https://www.youtube.com/watch?v=${citation.videoId}&t=${citation.startTimeSec}s`
      : citation.sourceUrl;

  const hasTimestamp = citation.videoId && citation.startTimeSec !== undefined;

  return (
    <a
      href={href ?? undefined}
      target="_blank"
      rel="noreferrer"
      title={`${citation.sourceTitle}${hasTimestamp ? ` — at ${formatTime(citation.startTimeSec!)}` : ""}\n\n"${citation.snippet.slice(0, 180)}…"`}
      className="group mx-0.5 inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 align-super text-[10px] font-mono font-semibold text-orange-400 shadow-xs transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-white"
    >
      <span>[{n}]</span>
      {hasTimestamp && (
        <span className="opacity-75 group-hover:opacity-100">
          {formatTime(citation.startTimeSec!)} ▸
        </span>
      )}
    </a>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
