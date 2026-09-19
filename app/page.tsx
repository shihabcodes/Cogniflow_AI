"use client";

import { useEffect, useState } from "react";
import SourcesPanel from "@/components/SourcesPanel";
import ChatPanel, { type Message } from "@/components/ChatPanel";
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

  useEffect(() => {
    void loadSources().then((s) => {
      setSources(s);
      setLoaded(true);
    });
  }, []);

  async function embedBatch(texts: string[], taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 48) {
      const res = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    setMessages((m) => [...m.slice(-20), { role: "assistant", text: "Ingesting video…" }]);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetch(`/api/${kind}`, { method: "POST", body: form });
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    <main className="mx-auto flex h-screen max-w-7xl flex-col p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Cogniflow <span className="text-indigo-400">AI</span>
          </h1>
          <p className="text-xs text-slate-500">Ask your videos, podcasts, and PDFs — cited answers, linked to the exact moment.</p>
        </div>
        <a
          href="https://github.com/shihabcodes/Cogniflow_AI"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
        >
          ★ GitHub
        </a>
      </header>

      {loaded && (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[340px_1fr]">
          <div className="min-h-0 max-lg:max-h-[45vh]">
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

      <footer className="mt-2 text-center text-[11px] text-slate-600">
        chunks of ~{CHUNK_TARGET_CHARS} chars · {CHUNK_OVERLAP_CHARS} overlap · retrieval is top-{6} cosine over your browser-stored vectors
      </footer>
    </main>
  );
}
