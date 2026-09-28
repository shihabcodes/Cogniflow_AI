"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import SourcesPanel from "@/components/SourcesPanel";
import ChatPanel, { type Message } from "@/components/ChatPanel";
import SettingsModal from "@/components/SettingsModal";
import NotebookBar from "@/components/NotebookBar";
import AccountButton from "@/components/AccountButton";
import { chunkText, CHUNK_TARGET_CHARS, CHUNK_OVERLAP_CHARS } from "@/lib/chunk";
import { topK } from "@/lib/vector";
import { localStore } from "@/lib/store";
import { cloudEnabled, cloudStore, getSupabase } from "@/lib/cloud";
import type { Notebook, RetrievedChunk, Source, SourceType } from "@/lib/types";

async function readPdf(file: File): Promise<string> {
  // Parsed in the browser: no upload, so no server size limit. Loaded on demand to keep the page bundle small.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });
  if (!text.trim()) throw new Error("No extractable text found — this PDF is likely a scan (images only).");
  return text;
}

const ACTIVE_KEY = "cogniflow:notebook"; // last-open notebook, a per-browser convenience
function readActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export default function Home() {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [active, setActive] = useState("");
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [chats, setChats] = useState<Record<string, Message[]>>({}); // per notebook, this tab only
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Signed in: notebooks sync to Supabase. Signed out (or no Supabase configured): this browser only.
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [localCount, setLocalCount] = useState(0); // sources in this browser that could move into the account
  const store = useMemo(() => (user && supabase ? cloudStore(supabase) : localStore), [user?.id, supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cloudEnabled) return;
    let unsubscribe = () => {};
    void getSupabase().then(async (client) => {
      setSupabase(client);
      unsubscribe = client.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null)).data.subscription.unsubscribe;
      setUser((await client.auth.getSession()).data.session?.user ?? null);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  async function reload() {
    setLoaded(false);
    try {
      const { notebooks, sources } = await store.loadAll();
      setNotebooks(notebooks);
      setAllSources(sources);
      setChats({});
      const last = readActive();
      setActive(notebooks.some((n) => n.id === last) ? last! : notebooks[0].id);
      setLocalCount(user ? (await localStore.loadAll()).sources.length : 0);
    } catch (err) {
      setNotebooks([{ id: "offline", name: "Unavailable", createdAt: 0 }]);
      setActive("offline");
      showError("offline", err, "Could not load your notebooks.");
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (authReady) void reload();
  }, [authReady, store]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Copy this browser's notebooks into the signed-in account, then clear them locally. */
  async function moveLocalToAccount() {
    setBusy("import");
    await guard(async () => {
      const local = await localStore.loadAll();
      const ids = new Map(local.notebooks.map((n) => [n.id, crypto.randomUUID()]));
      for (const n of local.notebooks)
        if (local.sources.some((s) => s.notebookId === n.id)) await store.saveNotebook({ ...n, id: ids.get(n.id)! });
      for (const s of local.sources) await store.saveSource({ ...s, id: crypto.randomUUID(), notebookId: ids.get(s.notebookId!)! });
      await localStore.clear();
      await reload();
    });
    setBusy(null);
  }

  useEffect(() => {
    try {
      if (active) localStorage.setItem(ACTIVE_KEY, active);
    } catch {
      // storage unavailable (private mode); the default notebook opens next time
    }
  }, [active]);

  const sources = allSources.filter((s) => s.notebookId === active);
  const messages = chats[active] ?? [];

  async function request(path: string, body: FormData | object): Promise<Response> {
    const form = body instanceof FormData;
    const res = await fetch(path, {
      method: "POST",
      headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(apiKey ? { "x-gemini-key": apiKey } : {}) },
      body: form ? body : JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status}).`);
    return res;
  }
  const post = async (path: string, body: FormData | object) => (await request(path, body)).json();

  async function embedDocuments(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 96) {
      out.push(...(await post("/api/embed", { texts: texts.slice(i, i + 96), taskType: "RETRIEVAL_DOCUMENT" })).vectors);
    }
    return out;
  }

  // Messages are addressed by notebook, so a reply streaming in after a switch lands in the right chat.
  const setChat = (nb: string, fn: (ms: Message[]) => Message[]) => setChats((c) => ({ ...c, [nb]: fn(c[nb] ?? []) }));
  function addMessage(nb: string, m: Omit<Message, "id">): string {
    const id = crypto.randomUUID();
    setChat(nb, (ms) => [...ms, { ...m, id }]);
    return id;
  }
  const updateMessage = (nb: string, id: string, patch: Partial<Message>) =>
    setChat(nb, (ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  const showError = (nb: string, err: unknown, fallback: string) =>
    addMessage(nb, { role: "assistant", text: err instanceof Error ? err.message : fallback, error: true });
  // Store calls can fail once they go over the network; surface that in the chat.
  async function guard(fn: () => Promise<void>) {
    const nb = active;
    try {
      await fn();
    } catch (err) {
      showError(nb, err, "Could not save your change.");
    }
  }

  type Loaded = { title: string; texts: string[]; times?: number[]; url?: string; videoId?: string };

  async function ingest(type: SourceType, load: () => Promise<Loaded>) {
    const nb = active;
    setBusy(type);
    try {
      const { texts, times, ...meta } = await load();
      const vectors = await embedDocuments(texts);
      const source: Source = {
        id: crypto.randomUUID(),
        notebookId: nb,
        type,
        addedAt: Date.now(),
        ...meta,
        chunks: texts.map((text, i) => ({ text, vector: vectors[i], startTimeSec: times?.[i] })),
      };
      await store.saveSource(source);
      setAllSources((prev) => [...prev, source]);
    } catch (err) {
      showError(nb, err, "Ingestion failed.");
    } finally {
      setBusy(null);
    }
  }

  const handleAddYouTube = (url: string) =>
    ingest("youtube", async () => {
      const j = await post("/api/youtube", { url });
      const chunks = j.chunks as { text: string; startTimeSec: number }[];
      return {
        title: j.title,
        url: j.url,
        videoId: j.videoId,
        texts: chunks.map((c) => c.text),
        times: chunks.map((c) => c.startTimeSec),
      };
    });

  const handleAddFile = (file: File, kind: "pdf" | "audio") =>
    ingest(kind, async () => {
      if (kind === "pdf") return { title: file.name.replace(/\.pdf$/i, ""), texts: chunkText(await readPdf(file)) };
      const form = new FormData();
      form.append("file", file);
      const j = await post("/api/audio", form);
      return { title: j.title, texts: chunkText(j.text) };
    });

  const handleAddText = (title: string, text: string) => ingest("text", async () => ({ title, texts: chunkText(text) }));

  const handleRemove = (id: string) =>
    guard(async () => {
      await store.deleteSource(id);
      setAllSources((prev) => prev.filter((s) => s.id !== id));
    });

  const handleCreateNotebook = () =>
    guard(async () => {
      const notebook = { id: crypto.randomUUID(), name: `Notebook ${notebooks.length + 1}`, createdAt: Date.now() };
      await store.saveNotebook(notebook);
      setNotebooks((n) => [...n, notebook]);
      setActive(notebook.id);
    });

  const handleRenameNotebook = (name: string) =>
    guard(async () => {
      const notebook = notebooks.find((n) => n.id === active);
      if (!notebook || !name.trim()) return;
      const renamed = { ...notebook, name: name.trim().slice(0, 80) };
      await store.saveNotebook(renamed);
      setNotebooks((n) => n.map((x) => (x.id === active ? renamed : x)));
    });

  const handleDeleteNotebook = () =>
    guard(async () => {
      if (notebooks.length < 2) return;
      const id = active;
      await store.deleteNotebook(id, sources.map((s) => s.id));
      const rest = notebooks.filter((n) => n.id !== id);
      setNotebooks(rest);
      setAllSources((prev) => prev.filter((s) => s.notebookId !== id));
      setChats(({ [id]: _dropped, ...c }) => c);
      setActive(rest[0].id);
    });

  async function handleAsk(question: string) {
    const nb = active;
    const history = messages.filter((m) => !m.error).slice(-6).map(({ role, text }) => ({ role, text: text.slice(0, 4000) }));
    addMessage(nb, { role: "user", text: question });
    setAsking(true);
    try {
      // Follow-ups are rewritten server-side into a standalone query; search with that.
      const { vectors, query } = await post("/api/embed", { texts: [question], taskType: "RETRIEVAL_QUERY", history });
      const hits = topK(vectors[0], query, sources, 6);
      if (!hits.length) throw new Error("No indexed sources found. Re-add a source (your browser storage may have been cleared).");

      const citations: RetrievedChunk[] = hits.map((h, i) => ({
        n: i + 1,
        text: h.chunk.text,
        sourceTitle: h.source.title,
        sourceType: h.source.type,
        sourceUrl: h.source.url,
        videoId: h.source.videoId,
        startTimeSec: h.chunk.startTimeSec,
      }));
      const res = await request("/api/ask", { question, chunks: citations, history });
      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      let text = "";
      let id: string | undefined;
      try {
        for (let r = await reader.read(); !r.done; r = await reader.read()) {
          text += r.value;
          if (id) updateMessage(nb, id, { text });
          else id = addMessage(nb, { role: "assistant", text, citations });
        }
      } catch (err) {
        if (!id) throw err;
        updateMessage(nb, id, { text: `${text}\n\n_(The answer was cut off. Please ask again.)_` });
      }
      if (!id) throw new Error("The model returned an empty answer.");
    } catch (err) {
      showError(nb, err, "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }

  const hasSources = sources.some((s) => s.chunks.length > 0);

  return (
    <main className="relative mx-auto flex h-screen max-w-7xl flex-col p-3 sm:p-4 md:p-6">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 flex justify-center">
        <div className="h-[350px] w-[700px] rounded-full bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-transparent blur-3xl opacity-80" />
      </div>

      <header className="mb-4 flex items-center justify-between border-b border-zinc-800/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6600] to-[#E65C00] font-black text-white text-sm shadow-lg shadow-orange-500/25">
            C
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-100 sm:text-lg">
              Cogniflow <span className="bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">AI</span>
            </h1>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              The Intelligence Layer for Media & Documents — cited in real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {supabase && authReady && (
            <AccountButton
              email={user?.email}
              onSignIn={(provider) =>
                void supabase!.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
              }
              onSignOut={() => void supabase!.auth.signOut()}
            />
          )}

          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="group flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-orange-500/40 hover:bg-zinc-800 hover:text-white"
          >
            <span aria-hidden>⚙</span>
            <span className="hidden sm:inline">Settings</span>
            {apiKey && (
              <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shadow-xs shadow-orange-500" title="Custom Gemini key active" />
            )}
          </button>

          <a
            href="https://github.com/shihabcodes/Cogniflow_AI"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
          >
            <span aria-hidden>★</span>
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </header>

      {loaded && (
        <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-[380px_1fr]">
          <div className="flex min-h-0 flex-col gap-3 max-lg:max-h-[48vh]">
            {user && localCount > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] text-orange-200">
                <span>
                  {localCount} source{localCount > 1 ? "s" : ""} saved in this browser only.
                </span>
                <button
                  disabled={!!busy}
                  onClick={() => void moveLocalToAccount()}
                  className="shrink-0 rounded-lg bg-orange-500 px-2.5 py-1 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  Move to my account
                </button>
              </div>
            )}
            <NotebookBar
              notebooks={notebooks}
              activeId={active}
              sourceCount={sources.length}
              disabled={!!busy || asking}
              onSelect={setActive}
              onCreate={handleCreateNotebook}
              onRename={handleRenameNotebook}
              onDelete={handleDeleteNotebook}
            />
            <div className="min-h-0 flex-1">
              <SourcesPanel
                sources={sources}
                busy={busy}
                onAddYouTube={handleAddYouTube}
                onAddFile={handleAddFile}
                onAddText={handleAddText}
                onRemove={handleRemove}
              />
            </div>
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
          <span>top-6 hybrid search</span>
        </div>
        <div className="hidden sm:block text-zinc-600">
          Cogniflow AI · open source
        </div>
      </footer>
    </main>
  );
}
