"use client";

import { useState } from "react";
import type { Source } from "@/lib/types";

type Tab = "youtube" | "pdf" | "audio" | "text";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "youtube", label: "YouTube", icon: "▶" },
  { key: "pdf", label: "PDF", icon: "📄" },
  { key: "audio", label: "Audio", icon: "🎙" },
  { key: "text", label: "Text", icon: "✎" },
];

const TYPE_BADGE: Record<Source["type"], { label: string; color: string; icon: string }> = {
  youtube: { label: "YouTube", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: "▶" },
  pdf: { label: "PDF", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: "📄" },
  audio: { label: "Audio", color: "bg-orange-500/10 text-orange-400 border-orange-500/20", icon: "🎙" },
  text: { label: "Text", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: "✎" },
};

export default function SourcesPanel({
  sources,
  busy,
  onAddYouTube,
  onAddFile,
  onAddText,
  onRemove,
}: {
  sources: Source[];
  busy: string | null;
  onAddYouTube: (url: string) => Promise<void>;
  onAddFile: (file: File, kind: "pdf" | "audio") => Promise<void>;
  onAddText: (title: string, text: string) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  return (
    <aside className="flex h-full flex-col gap-3">
      {/* Source Ingestion Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4.5 shadow-xl backdrop-blur-xl">
        <div className="mb-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-xs shadow-orange-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Knowledge Source
            </h2>
          </div>
          <span className="rounded-md border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-orange-400">
            RAG Engine v2
          </span>
        </div>

        {/* Tab Switcher */}
        <div className="mb-3.5 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-950/80 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                tab === t.key
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <span className="text-[11px]">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* YouTube Input Form */}
        {tab === "youtube" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAddYouTube(url).then(() => setUrl(""));
            }}
            className="space-y-2.5"
          >
            <div className="relative">
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              disabled={!!busy || !url.trim()}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all duration-200 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:opacity-40"
            >
              {busy === "youtube" ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Ingesting & Chunking…</span>
                </>
              ) : (
                <>
                  <span>Index Video</span>
                  <span className="text-xs transition-transform group-hover:translate-x-0.5">→</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-zinc-500 leading-normal">
              Direct scraping with Gemini multimodal fallback. Timestamps preserved.
            </p>
          </form>
        )}

        {/* PDF & Audio Upload */}
        {(tab === "pdf" || tab === "audio") && (
          <div className="space-y-2.5">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950/60 px-4 py-6 text-center transition-all duration-200 hover:border-orange-500/50 hover:bg-zinc-950/90">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-lg transition-transform group-hover:scale-110">
                {tab === "pdf" ? "📄" : "🎙"}
              </div>
              <p className="text-xs font-medium text-zinc-300 group-hover:text-orange-400">
                {tab === "pdf" ? "Select PDF document (≤ 4 MB)" : "Select audio file (≤ 15 MB, mp3/wav/m4a)"}
              </p>
              <p className="mt-1 text-[10px] text-zinc-500">Drag and drop or browse files</p>
              <input
                type="file"
                accept={tab === "pdf" ? "application/pdf" : "audio/*,video/mp4"}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onAddFile(f, tab).catch(() => undefined);
                  e.target.value = "";
                }}
              />
            </label>
            <p className="text-[11px] text-zinc-500 leading-normal">
              {tab === "audio"
                ? "Audio is transcribed with Gemini 2.0 and vector-indexed locally."
                : "Text is extracted with unpdf and vector-embedded for sub-second retrieval."}
            </p>
          </div>
        )}

        {/* Text / Notes Input */}
        {tab === "text" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAddText(title || "Pasted Note", text).then(() => {
                setTitle("");
                setText("");
              });
            }}
            className="space-y-2.5"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Meeting Notes, Transcript)"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste notes, transcripts, or research excerpts…"
              rows={4}
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
            <button
              disabled={!!busy || !text.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:opacity-40"
            >
              {busy === "text" ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Embedding Text…</span>
                </>
              ) : (
                "Index Text Source"
              )}
            </button>
          </form>
        )}
      </div>

      {/* Active Indexed Sources List */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-4 shadow-xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Active Context
            </h2>
            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-mono font-medium text-orange-400">
              {sources.length}
            </span>
          </div>
          {sources.length > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono">Stored in IndexedDB</span>
          )}
        </div>

        {sources.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/60 text-zinc-500">
              ⚡
            </div>
            <p className="text-xs font-medium text-zinc-400">No sources indexed yet</p>
            <p className="mt-1 text-[11px] text-zinc-600 max-w-[200px]">
              Add a video, document, or audio above to power your AI retrieval.
            </p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {sources.map((s) => {
              const badge = TYPE_BADGE[s.type];
              return (
                <li
                  key={s.id}
                  className="group relative flex items-start gap-2.5 rounded-xl border border-zinc-800/90 bg-zinc-950/60 p-3 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-950/90"
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs ${badge.color}`}
                  >
                    {badge.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-zinc-200" title={s.title}>
                      {s.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                      <span>{s.chunks.length} chunks</span>
                      <span>·</span>
                      <span className="uppercase">{s.type}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(s.id)}
                    aria-label={`Remove ${s.title}`}
                    className="rounded-md p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
