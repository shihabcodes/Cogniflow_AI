# Cogniflow AI — ask your media, get cited answers

**Retrieval-augmented generation (RAG), in your browser.** Add YouTube videos, podcasts, PDFs, or pasted notes as sources, then ask questions — every claim in the answer carries a citation chip that links back to the exact moment in the video.

```
add source ──► ingest ──► chunk ──► embed (Gemini) ──► vectors in your browser
                                                                    │
ask ──► embed question ──► cosine top-k ──► grounded Gemini answer ─┘
                                          with [n] citation chips ──► deep-links
```

## Features

- **Try it instantly** — one click loads a demo notebook (a public-domain NASA video about the James Webb telescope) with suggested questions; no key or sign-up needed. Visitors get a daily free allowance on the shared key and can add their own free Gemini key for unlimited use
- **Four source types** — YouTube links (transcript with timestamps), PDFs (parsed in your browser, never uploaded), audio files (Gemini-native transcription), pasted text
- **Cited answers** — the model must ground every claim in `[n]` citations; chips link to the source, and for YouTube to the *exact second* (`&t=`)
- **Local-first storage** — sources, chunks, and embeddings live in your browser's IndexedDB; only small excerpts are sent to the model when you ask
- **Retrieval quality matters** — paragraph-aware chunking with overlap, task-typed embeddings, and hybrid search (vector similarity + BM25 keyword match, merged with reciprocal rank fusion)
- **Real conversations** — answers stream in, and follow-ups like "what did he say after that?" are rewritten into standalone queries before searching
- **Notebooks** — keep separate collections of sources, each with its own chat; questions only search the open notebook
- **Portable answers** — copy any answer as Markdown with its cited sources and timestamp links
- **Honest refusal** — if the sources don't contain the answer, the model says so instead of inventing one

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Gemini (`@google/genai` — `gemini-3.6-flash` + `gemini-embedding-001`) · `youtube-transcript` · `unpdf` · IndexedDB (`idb`)

## Run locally

```bash
git clone https://github.com/shihabcodes/Cogniflow_AI && cd Cogniflow_AI
npm install
cp .env.example .env.local    # add your key from https://aistudio.google.com/apikey
npm run dev                   # → http://localhost:3000
```

Sanity-check the retrieval core without an API key:

```bash
npm run selftest
```

## Deploy to Vercel

1. Push the repo → import it at [vercel.com/new](https://vercel.com/new)
2. Add environment variable `GOOGLE_API_KEY` (from Google AI Studio)
3. Deploy — no database needed; storage is client-side

Notes: PDFs have no size limit (they never leave the browser). Audio uploads are limited to ~4 MB by Vercel's request cap. Set `NEXT_PUBLIC_SHARED_KEY=true` to let visitors without a key use yours, with a daily per-visitor cap (see `.env.example`).

## Architecture

```
app/
  api/youtube/route.ts   transcript fetch (+ timestamps) → chunked
  api/audio/route.ts     Gemini-native transcription
  api/embed/route.ts     Gemini embeddings (task-typed); rewrites follow-up queries
  api/ask/route.ts       streamed, grounded generation with [n] citation contract
lib/
  chunk.ts               paragraph-aware chunking + transcript grouping
  vector.ts              hybrid search: cosine + BM25, reciprocal rank fusion
  store.ts               IndexedDB persistence (notebooks, sources, chunks, vectors)
  citations.ts           answer → citation chips
  gemini.ts              all Gemini calls, with model fallback
  api.ts                 per-route key check + error helpers
```

## Roadmap

- [x] Multiple named notebooks
- [ ] Optional Supabase persistence (sync across devices)
- [ ] Long-audio support via Files API (currently ~4 MB upload limit)
- [x] Answer streaming
- [x] Export answers with citations to Markdown

## Privacy & Security

- **Your sources stay yours** — documents, chunks, and embeddings are stored in your browser's IndexedDB. They are never uploaded to the server.
- **Only excerpts travel** — when you ask a question, just the top-6 retrieved excerpts are sent to Google's Gemini API to compose the answer. The system prompt wraps excerpts in `<source_excerpt>` tags and instructs the model to treat them as passive data, never as instructions.
- **No accounts, no analytics, no tracking.**
- **Bring your own key** — your Gemini key is kept only in memory for the current tab (never saved to disk) and sent per-request via the `x-gemini-key` header. Reloading the page clears it.
- **Shared key is opt-in and capped** — deployment owners decide via `NEXT_PUBLIC_SHARED_KEY`; visitors on it get a daily request cap, tracked by a salted hash of their IP (no raw IPs stored). All API routes are per-IP rate limited, and standard security headers are set on every response.
- **Found a vulnerability?** Please report it privately via GitHub's *Security → Report a vulnerability* rather than a public issue. See [SECURITY.md](SECURITY.md).

## License

MIT — see [LICENSE](LICENSE).
