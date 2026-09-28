"use client";

import ReactMarkdown from "react-markdown";
import { CITE_HREF_PREFIX, citationHref, formatTime, linkCitations } from "@/lib/citations";
import type { RetrievedChunk } from "@/lib/types";

/**
 * Renders a model answer: markdown for text, [n] markers become citation
 * chips that link to the exact moment in a video (or show the source).
 */
export default function CitationText({
  answer,
  citations,
}: {
  answer: string;
  citations: RetrievedChunk[];
}) {
  return (
    <div className="prose-answer">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith(CITE_HREF_PREFIX)) {
              const n = parseInt(href.slice(CITE_HREF_PREFIX.length), 10);
              return <CitationChip citation={citations[n - 1]} n={n} />;
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {linkCitations(answer)}
      </ReactMarkdown>
    </div>
  );
}

function CitationChip({ citation, n }: { citation?: RetrievedChunk; n: number }) {
  const chip = "mx-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 align-baseline font-mono text-xs font-medium";
  if (!citation) return <span className={`${chip} bg-muted text-muted-foreground`}>[{n}]</span>;

  const href = citationHref(citation);
  const time = citation.videoId && citation.startTimeSec !== undefined ? formatTime(citation.startTimeSec) : undefined;
  const label = `Source ${n}: ${citation.sourceTitle}${time ? `, at ${time}` : ""}`;
  const body = (
    <>
      <span>{n}</span>
      {time && <span className="opacity-80">· {time}</span>}
    </>
  );
  if (!href)
    return (
      <span className={`${chip} bg-muted text-foreground`} title={`${label}\n\n“${citation.text.slice(0, 200)}…”`}>
        {body}
      </span>
    );
  return (
    <a
      data-cite
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label}${time ? " (opens the video at that moment)" : ""}`}
      title={`${label}\n\n“${citation.text.slice(0, 200)}…”`}
      className={`${chip} cursor-pointer bg-accent-soft text-accent-text ring-1 ring-accent/30 transition-colors duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
    >
      {body}
    </a>
  );
}
