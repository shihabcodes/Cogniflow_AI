"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, LoaderCircle, Sparkles } from "lucide-react";
import CitationText from "./CitationText";
import { answerToMarkdown } from "@/lib/citations";
import type { RetrievedChunk } from "@/lib/types";
import { BUTTON, BUTTON_PRIMARY, CARD } from "./ui";

export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: RetrievedChunk[];
  error?: boolean;
}

export default function ChatPanel({
  messages,
  asking,
  hasSources,
  suggestions,
  onAsk,
  onTryDemo,
}: {
  messages: Message[];
  asking: boolean;
  hasSources: boolean;
  suggestions: string[];
  onAsk: (q: string) => Promise<void>;
  onTryDemo?: () => void;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasAsking = useRef(false);

  // The input is disabled while answering, which drops focus; hand it back for the follow-up
  // (only after an answer, so phones don't pop the keyboard on page load).
  useEffect(() => {
    if (wasAsking.current && !asking) inputRef.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, asking]);

  const ask = (q: string) => {
    if (!q.trim() || asking || !hasSources) return;
    setInput("");
    void onAsk(q.trim());
  };

  return (
    <section className={`${CARD} flex h-full min-h-0 flex-col overflow-hidden`} aria-label="Chat">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.length === 0 &&
          (hasSources ? (
            <div className="mx-auto flex h-full max-w-xl flex-col justify-center py-8">
              <h2 className="text-xl font-semibold">Ask anything about your sources</h2>
              <p className="mt-1 text-sm text-muted-foreground">Every answer cites where it came from. Try one of these:</p>
              <div className="mt-5 grid gap-2">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => ask(s)} className={`${BUTTON} h-auto justify-start py-2.5 text-left font-normal`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-full max-w-xl flex-col justify-center py-8 text-center">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ask your videos, podcasts and PDFs</h2>
              <p className="mt-3 text-muted-foreground">
                Add a source and ask questions. Every claim is cited, and video citations jump to the exact second.
              </p>
              {onTryDemo && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <button onClick={onTryDemo} className={BUTTON_PRIMARY}>
                    <Sparkles className="size-4" aria-hidden />
                    Try the demo
                  </button>
                  <span className="text-xs text-muted-foreground">A NASA video about the James Webb telescope, ready to question</span>
                </div>
              )}
              <ul className="mt-8 grid gap-3 text-left text-sm sm:grid-cols-3">
                {[
                  ["Cited answers", "Every claim links back to its source."],
                  ["Exact moments", "Video citations open at the right second."],
                  ["Free, no sign-up", "Your sources stay in your browser."],
                ].map(([title, body]) => (
                  <li key={title} className="rounded-lg bg-muted p-3">
                    <p className="font-medium">{title}</p>
                    <p className="mt-0.5 text-muted-foreground">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        <div className="mx-auto max-w-3xl space-y-5">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5">{m.text}</p>
              </div>
            ) : (
              <div key={m.id} className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" className="mt-0.5 size-7 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  {m.error ? (
                    <p role="alert" className="rounded-lg bg-destructive-soft px-3 py-2 text-sm text-destructive">
                      {m.text}
                    </p>
                  ) : (
                    <>
                      <CitationText answer={m.text} citations={m.citations ?? []} />
                      {!(asking && m === messages.at(-1)) && <CopyButton text={answerToMarkdown(m.text, m.citations ?? [])} />}
                    </>
                  )}
                </div>
              </div>
            )
          )}

          {/* Until the first streamed token arrives */}
          {asking && messages.at(-1)?.role === "user" && <Thinking />}
          <div ref={endRef} />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-border p-3"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-xl border border-border bg-background p-1.5 pl-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
          <input
            ref={inputRef}
            aria-label="Ask a question"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasSources ? "Ask a question…" : "Add a source or try the demo first"}
            disabled={!hasSources || asking}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            disabled={!hasSources || asking || !input.trim()}
            aria-label="Send"
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-accent text-accent-foreground transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            <ArrowUp className="size-5" aria-hidden />
          </button>
        </div>
      </form>
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className="mt-2 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy as Markdown"}
    </button>
  );
}

function Thinking() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground" role="status">
      <LoaderCircle className="size-5 animate-spin text-accent" aria-hidden />
      {slow ? "Still working — Gemini is busy right now…" : "Searching your sources…"}
    </div>
  );
}
