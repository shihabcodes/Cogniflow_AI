"use client";

import { useState } from "react";
import { AudioLines, CirclePlay, FileText, LoaderCircle, Type, Upload, X, type LucideIcon } from "lucide-react";
import type { Source, SourceType } from "@/lib/types";
import { BUTTON_PRIMARY, CARD, ICON_BUTTON, INPUT } from "./ui";

export type Busy = { kind: SourceType; status: string } | null;

const TYPES: { key: SourceType; label: string; icon: LucideIcon }[] = [
  { key: "youtube", label: "YouTube", icon: CirclePlay },
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "audio", label: "Audio", icon: AudioLines },
  { key: "text", label: "Text", icon: Type },
];
const ICON = Object.fromEntries(TYPES.map((t) => [t.key, t.icon])) as Record<SourceType, LucideIcon>;

export default function SourcesPanel({
  sources,
  busy,
  onAddYouTube,
  onAddFile,
  onAddText,
  onRemove,
}: {
  sources: Source[];
  busy: Busy;
  onAddYouTube: (url: string) => Promise<void>;
  onAddFile: (file: File, kind: "pdf" | "audio") => Promise<void>;
  onAddText: (title: string, text: string) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const [tab, setTab] = useState<SourceType>("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);

  return (
    <aside className="flex h-full min-h-0 flex-col gap-3">
      <section className={`${CARD} p-4`} aria-labelledby="add-source">
        <h2 id="add-source" className="mb-3 text-sm font-semibold">
          Add a source
        </h2>

        <div role="tablist" aria-label="Source type" className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1">
          {TYPES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex min-h-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-row sm:gap-1.5 ${
                tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {tab === "youtube" && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onAddYouTube(url).then(() => setUrl(""));
            }}
          >
            <label htmlFor="yt-url" className="sr-only">
              YouTube link
            </label>
            <input
              id="yt-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a YouTube link"
              inputMode="url"
              className={INPUT}
            />
            <button disabled={!!busy || !url.trim()} className={`${BUTTON_PRIMARY} w-full`}>
              Add video
            </button>
            <p className="text-xs text-muted-foreground">Answers link to the exact second in the video.</p>
          </form>
        )}

        {(tab === "pdf" || tab === "audio") && (
          <div className="space-y-2">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f && !busy) void onAddFile(f, tab);
              }}
              className={`flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-within:ring-2 focus-within:ring-accent ${
                dragging ? "border-accent bg-accent-soft" : "border-border hover:border-accent/60 hover:bg-muted"
              }`}
            >
              <Upload className="size-5 text-muted-foreground" aria-hidden />
              <span className="text-sm font-medium">{tab === "pdf" ? "Choose a PDF" : "Choose an audio file"}</span>
              <span className="text-xs text-muted-foreground">
                {tab === "pdf" ? "or drop it here · read in your browser, never uploaded" : "or drop it here · mp3, wav, m4a up to 4 MB"}
              </span>
              <input
                type="file"
                accept={tab === "pdf" ? "application/pdf" : "audio/*,video/mp4"}
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onAddFile(f, tab);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {tab === "text" && (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              void onAddText(title || "Pasted note", text).then(() => {
                setTitle("");
                setText("");
              });
            }}
          >
            <label htmlFor="note-title" className="sr-only">
              Title
            </label>
            <input id="note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={INPUT} />
            <label htmlFor="note-text" className="sr-only">
              Text
            </label>
            <textarea
              id="note-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste notes, a transcript or an article…"
              rows={4}
              className={`${INPUT} resize-y`}
            />
            <button disabled={!!busy || !text.trim()} className={`${BUTTON_PRIMARY} w-full`}>
              Add text
            </button>
          </form>
        )}
      </section>

      <section className={`${CARD} flex min-h-0 flex-1 flex-col p-4`} aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          Sources
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs font-normal text-muted-foreground">{sources.length}</span>
        </h2>

        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto" aria-live="polite">
          {busy && (
            <li className="flex items-center gap-3 rounded-lg bg-accent-soft p-2.5">
              <LoaderCircle className="size-5 shrink-0 animate-spin text-accent" aria-hidden />
              <span className="min-w-0 text-sm">{busy.status}</span>
            </li>
          )}
          {sources.map((s) => {
            const Icon = ICON[s.type];
            return (
              <li key={s.id} className="group flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={s.title}>
                    {s.title}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {s.chunks.length} {s.chunks.length === 1 ? "passage" : "passages"}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(s.id)}
                  aria-label={`Remove ${s.title}`}
                  className={`${ICON_BUTTON} hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
          {!sources.length && !busy && (
            <li className="px-1 py-6 text-center text-sm text-muted-foreground">No sources yet. Add one above, or try the demo.</li>
          )}
        </ul>
      </section>
    </aside>
  );
}
