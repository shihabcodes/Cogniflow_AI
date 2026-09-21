"use client";

import { useEffect, useState } from "react";
import SourcesPanel from "@/components/SourcesPanel";
import ChatPanel, { type Message } from "@/components/ChatPanel";
import SettingsModal from "@/components/SettingsModal";
import { chunkText, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS } from "@/lib/chunk";
import { topK } from "@/lib/vector";
import { deleteSource, loadSources, saveSource } from "@/lib/store";
import type { Citation, RetrievedChunk, Source } from "@/lib/types";

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    void loadSources().then((s) => {
      setSources(s);
      setLoaded(true);
    });
  }, []);

  const authHeaders: Record<string, string> = apiKey ? { "x-gemini-key": apiKey } : {};

  async function embedBatch(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 48) {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ texts: texts.slice(i, i + 48), taskType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Embedding failed.");
      out.push(...(json.vectors as number[][]));
    }
    return out;
  }

  async function addSource(base: Omit<Source, "chunks">, texts: string[], startTimeSecs?: (number | undefined)[]) {
    const vectors = await embedBatch(texts, "RETRIEVAL_DOCUMENT");
    const source: Source = {
      ...base,
      chunks: texts.map((text, i) => ({
        id: `${base.id}:${i}`,
        sourceId: base.id,
        index: i,
        text,
        vector: vectors[i],
        startTimeSec: startTimeSecs?.[i],
      })),
    };
    await saveSource(source);
    setSources((prev) => [...prev, source]);
  }

  async function handleAddYouTube(url: string) {
    setBusy("youtube");
    setMessages((m) => [...m.slice(-20), { role: "assistant", text: "Ingesting & indexing video…" }]);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to ingest video.");
      await addSource(
        { id: crypto.randomUUID(), type: "youtube", title: json.title, url: json.url, videoId: json.videoId, addedAt: Date.now() },
        (json.chunks as { text: string; startTimeSec: number }[]).map((c) => c.text),
        (json.chunks as { text: string; startTimeSec: number }[]).map((c) => c.startTimeSec)
      );
      setMessages((m) => m.slice(0, -1));
    } catch (err) {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: "assistant", text: err instanceof Error ? err.message : "Ingestion failed.", error: true },
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function handleAddFile(file: File, kind: "pdf" | "audio") {
    setBusy(kind);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/${kind}`, {
        method: "POST",
        headers: { ...authHeaders },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed to ingest ${kind}.`);
      const texts = chunkText(json.text as string);
      await addSource(
        { id: crypto.randomUUID(), type: kind, title: json.title, addedAt: Date.now() },
        texts
      );
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err instanceof Error ? err.message : "Ingestion failed.", error: true },
      ]);
    } finally {
      setBusy(null);
    }
  }

  async function handleAddText(title: string, text: string) {
    setBusy("text");
    try {
      const texts = chunkText(text);
      await addSource({ id: crypto.randomUUID(), type: "text", title, addedAt: Date.now() }, texts);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err instanceof Error ? err.message : "Indexing failed.", error: true },
      ]);
    } finally {
      setBusy(null);
    }
  }

  function handleRemove(id: string) {
    void deleteSource(id);
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAsk(question: string) {
    setMessages((m) => [...m, { role: "user", text: question }]);
    setAsking(true);
    try {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ texts: [question], taskType: "RETRIEVAL_QUERY" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Embedding failed.");
      const [queryVector] = json.vectors as number[][];

      const hits = topK(queryVector, sources, 6);
      if (!hits.length) throw new Error("No indexed sources found. Re-add a source (your browser storage may have been cleared).");

      const retrieved: RetrievedChunk[] = hits.map((h, i) => ({
        n: i + 1,
        text: h.chunk.text,
        sourceTitle: h.source.title,
        sourceType: h.source.type,
        sourceUrl: h.source.url,
        videoId: h.source.videoId,
        startTimeSec: h.chunk.startTimeSec,
      }));

      const askRes = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ question, chunks: retrieved }),
      });
      const askJson = await askRes.json();
      if (!askRes.ok) throw new Error(askJson.error ?? "Answer generation failed.");

      const citations: Citation[] = retrieved.map((c) => ({
        n: c.n,
        sourceTitle: c.sourceTitle,
        sourceType: c.sourceType,
        sourceUrl: c.sourceUrl,
        videoId: c.videoId,
        startTimeSec: c.startTimeSec,
        snippet: c.text.slice(0, 240),
      }));
      setMessages((m) => [...m, { role: "assistant", text: askJson.answer as string, citations }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: err instanceof Error ? err.message : "Something went wrong.", error: true },
      ]);
    } finally {
      setAsking(false);
    }
  }

  const hasSources = sources.some((s) => s.chunks.some((c) => c.vector));

  return (
    <main className="relative mx-auto flex h-screen max-w-7xl flex-col p-3 sm:p-4 md:p-6">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 flex justify-center">
        <div className="h-[350px] w-[700px] rounded-full bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent blur-3xl opacity-80" />
      </div>

      {/* Modern YC Startup Header */}
      <header className="mb-4 flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6600] to-[#E65C00] font-black text-white text-sm shadow-lg shadow-orange-500/25">
            Y
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
                Cogniflow <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">AI</span>
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-orange-400">
                Not Backed by YC
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              The Intelligence Layer for Media & Documents — cited in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Operational Status Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-mono text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational</span>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="group flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-orange-500/40 hover:bg-zinc-800 hover:text-white"
          >
            <span>⚙</span>
            <span className="hidden sm:inline">Settings</span>
            {apiKey && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500" title="Custom Gemini key active" />
            )}
          </button>

          <a
            href="https://github.com/shihabcodes/Cogniflow_AI"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <span>★</span>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {loaded && (
        <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-[380px_1fr]">
          <div className="min-h-0 max-lg:max-h-[42vh]">
            <SourcesPanel
              sources={sources}
              busy={busy}
              onAddYouTube={handleAddYouTube}
              onAddFile={handleAddFile}
              onAddText={handleAddText}
              onRemove={handleRemove}
            />
          </div>
          <div className="min-h-0">
            <ChatPanel messages={messages} asking={asking} hasSources={hasSources} onAsk={handleAsk} />
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiKey={apiKey}
        onSaveKey={(key) => setApiKey(key)}
      />

      <footer className="mt-2.5 flex items-center justify-between px-1 text-[11px] font-mono text-zinc-500">
        <div>
          <span>~{CHUNK_TARGET_CHARS} chars/chunk</span>
          <span className="mx-1.5">·</span>
          <span>{CHUNK_OVERLAP_CHARS} overlap</span>
          <span className="mx-1.5">·</span>
          <span>top-6 cosine</span>
        </div>
        <div className="hidden sm:block text-zinc-600">
          Cogniflow AI · Proudly Not Backed by YC (Yet)
        </div>
      </footer>
    </main>
  );
}
