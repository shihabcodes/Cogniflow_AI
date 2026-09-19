"use client";

import { useState } from "react";
import type { Source } from "@/lib/types";


type Tab = "youtube" | "pdf" | "audio" | "text";

const TABS: { key: Tab; label: string }[] = [
  { key: "youtube", label: "YouTube" },
  { key: "pdf", label: "PDF" },
  { key: "audio", label: "Audio" },
  { key: "text", label: "Text" },
];

const TYPE_ICON: Record<Source["type"], string> = {
  youtube: "▶",
  pdf: "📄",
  audio: "🎧",
  text: "✎",
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
    <aside className="flex h-full flex-col gap-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-300 uppercase">Add a source</h2>
        <div className="mb-3 flex gap-1 rounded-lg bg-slate-950/70 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                tab === t.key ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "youtube" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAddYouTube(url).then(() => setUrl(""));
            }}
            className="space-y-2"
          >
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              disabled={!!busy || !url.trim()}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
            >
              {busy === "youtube" ? "Ingesting…" : "Add video"}
            </button>
          </form>
        )}

        {(tab === "pdf" || tab === "audio") && (
          <div className="space-y-2">
            <label className="block cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-950 px-3 py-6 text-center text-sm text-slate-400 hover:border-indigo-500">
              {tab === "pdf" ? "Click to choose a PDF (≤ 4 MB)" : "Click to choose audio (≤ 15 MB, mp3/m4a/wav)"}
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
            <p className="text-xs text-slate-500">
              {tab === "audio"
                ? "Experimental: audio is transcribed by Gemini, then indexed like any other source."
                : "Text is extracted and chunked; scanned PDFs without a text layer can’t be indexed."}
            </p>
          </div>
        )}

        {tab === "text" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onAddText(title || "Pasted note", text).then(() => {
                setTitle("");
                setText("");
              });
            }}
            className="space-y-2"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste notes, an article, a transcript…"
              rows={5}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              disabled={!!busy || !text.trim()}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-40"
            >
              {busy === "text" ? "Indexing…" : "Add text"}
            </button>
          </form>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-300 uppercase">
          Sources <span className="text-slate-500">({sources.length})</span>
        </h2>
        {sources.length === 0 && (
          <p className="text-sm text-slate-500">No sources yet. Add one above — everything is stored locally in your browser.</p>
        )}
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="group flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <span className="mt-0.5 text-base">{TYPE_ICON[s.type]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-200" title={s.title}>
                  {s.title}
                </p>
                <p className="text-xs text-slate-500">
                  {s.chunks.length} chunks · {s.type}
                </p>
              </div>
              <button
                onClick={() => onRemove(s.id)}
                aria-label={`Remove ${s.title}`}
                className="rounded p-1 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
