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

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 && <EmptyState hasSources={hasSources} />}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-sm text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div
              key={i}
              className={`max-w-[92%] rounded-2xl rounded-bl-md px-4 py-3 ${
                m.error ? "bg-red-950/60 text-red-200" : "bg-slate-950/80"
              }`}
            >
              {m.error ? (
                <p className="text-sm">{m.text}</p>
              ) : (
                <CitationText answer={m.text} citations={m.citations ?? []} />
              )}
            </div>
          )
        )}
        {asking && (
          <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-slate-950/80 px-4 py-3">
            <p className="animate-pulse text-sm text-slate-400">Searching sources and composing an answer…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = input.trim();
          if (!q || asking) return;
          setInput("");
          void onAsk(q);
        }}
        className="border-t border-slate-800 p-3"
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasSources ? "Ask your sources anything…" : "Add a source first, then ask away"}
            disabled={!hasSources || asking}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          />
          <button
            disabled={!hasSources || asking || !input.trim()}
            className="rounded-lg bg-indigo-600 px-5 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </form>
    </section>
  );
}

function EmptyState({ hasSources }: { hasSources: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="text-4xl">🧠</div>
      <h2 className="text-lg font-semibold text-slate-200">Your second brain for media</h2>
      <p className="max-w-md text-sm text-slate-400">
        {hasSources
          ? "Ask anything — answers are grounded in your sources, and every claim carries a citation that links back to the exact moment."
          : "Add a YouTube video, PDF, podcast, or pasted notes on the left. Cogniflow chunks them, embeds them, and lets you ask questions with cited answers."}
      </p>
      <p className="text-xs text-slate-500">
        Your sources never leave your browser — only small excerpts are sent to the model when you ask.
      </p>
    </div>
  );
}
