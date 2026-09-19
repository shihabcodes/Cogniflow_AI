"use client";

import { useEffect, useRef, useState } from "react";
import CitationText from "./CitationText";
import type { Citation } from "@/lib/types";

export interface Message {
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  error?: boolean;
}

const QUICK_PROMPTS = [
  "Summarize the key takeaways and main thesis",
  "Extract timeline and key moments with timestamps",
  "What are the most actionable insights discussed?",
  "List the core arguments, evidence, and conclusions",
];

export default function ChatPanel({
  messages,
  asking,
  hasSources,
  onAsk,
}: {
  messages: Message[];
  asking: boolean;
  hasSources: boolean;
  onAsk: (q: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  function handlePromptClick(prompt: string) {
    if (!hasSources || asking) return;
    void onAsk(prompt);
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 shadow-2xl backdrop-blur-xl">
      {/* Messages Scroll Area */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
        {messages.length === 0 && (
          <EmptyState hasSources={hasSources} onSelectPrompt={handlePromptClick} />
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs border border-orange-500/20 bg-gradient-to-br from-zinc-800 to-zinc-900 px-4.5 py-3 text-sm text-zinc-100 shadow-md">
                <p className="leading-relaxed">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-xs font-black text-orange-400 shadow-xs">
                Y
              </div>
              <div
                className={`max-w-[90%] rounded-2xl rounded-tl-xs px-5 py-4 shadow-md transition-all ${
                  m.error
                    ? "border border-red-500/30 bg-red-950/40 text-red-200"
                    : "border border-zinc-800/90 bg-zinc-950/80"
                }`}
              >
                {m.error ? (
                  <p className="text-sm leading-relaxed">{m.text}</p>
                ) : (
                  <CitationText answer={m.text} citations={m.citations ?? []} />
                )}
              </div>
            </div>
          )
        )}

        {asking && (
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 text-xs font-black text-orange-400">
              Y
            </div>
            <div className="flex items-center gap-3 rounded-2xl rounded-tl-xs border border-zinc-800 bg-zinc-950/80 px-4 py-3 shadow-md">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping" />
              <p className="text-xs font-medium text-zinc-400">
                Searching vector index & synthesizing cited answer…
              </p>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = input.trim();
          if (!q || asking) return;
          setInput("");
          void onAsk(q);
        }}
        className="border-t border-zinc-800/80 bg-zinc-950/70 p-3.5 backdrop-blur-md"
      >
        <div className="relative flex items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              hasSources
                ? "Ask anything about your media — answers include citations & timestamps…"
                : "Index a source first (YouTube, PDF, audio, or text), then ask away…"
            }
            disabled={!hasSources || asking}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/90 py-3 pl-4 pr-24 text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            disabled={!hasSources || asking || !input.trim()}
            className="absolute right-2 flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-95 disabled:opacity-30 disabled:hover:from-orange-500 disabled:hover:to-amber-500"
          >
            <span>Ask</span>
            <span className="text-[11px]">↵</span>
          </button>
        </div>
      </form>
    </section>
  );
}

function EmptyState({
  hasSources,
  onSelectPrompt,
}: {
  hasSources: boolean;
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 py-12 text-center">
      {/* Ambient Orb */}
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 opacity-20 blur-xl animate-pulse-glow" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-xl shadow-orange-500/10">
          <span className="text-2xl font-black text-orange-500">Y</span>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[11px] font-mono text-orange-400 mb-3">
        <span>⚡ Multimodal RAG Engine</span>
        <span>·</span>
        <span>Not Backed by YC</span>
      </div>

      <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
        The Intelligence Layer for Media & Docs
      </h2>
      <p className="mt-2 max-w-md text-xs sm:text-sm text-zinc-400 leading-relaxed">
        {hasSources
          ? "Your sources are indexed in browser memory. Ask any question to retrieve cited excerpts linked to the exact timestamp."
          : "Add YouTube videos, PDFs, audio recordings, or pasted text on the left. Cogniflow embeds them locally for sub-second, hallucination-free retrieval."}
      </p>

      {/* Interactive Quick Prompts */}
      {hasSources && (
        <div className="mt-6 w-full max-w-lg space-y-2">
          <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Suggested Queries
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => onSelectPrompt(prompt)}
                className="group flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/60 px-3.5 py-2.5 text-left text-xs text-zinc-300 transition-all duration-200 hover:border-orange-500/40 hover:bg-zinc-900 hover:text-orange-400 active:scale-[0.99]"
              >
                <span className="truncate pr-2">{prompt}</span>
                <span className="text-[10px] text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-400">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4 text-[11px] text-zinc-600 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Client-Side Storage
        </span>
        <span>·</span>
        <span>Deep-Linked Timestamps</span>
        <span>·</span>
        <span>Cosine Vector Top-6</span>
      </div>
    </div>
  );
}
