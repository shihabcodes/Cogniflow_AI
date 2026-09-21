# Cogniflow AI — ask your media, get cited answers

**Retrieval-augmented generation (RAG), in your browser.** Add YouTube videos, podcasts, PDFs, or pasted notes as sources, then ask questions — every claim in the answer carries a citation chip that links back to the exact moment in the video.

```
add source ──► ingest ──► chunk ──► embed (Gemini) ──► vectors in your browser
                                                                    │
ask ──► embed question ──► cosine top-k ──► grounded Gemini answer ─┘
                                          with [n] citation chips ──► deep-links
```

## Features

- **Four source types** — YouTube links (transcript with timestamps), PDFs (text extraction), audio files (Gemini-native transcription), pasted text
- **Cited answers** — the model must ground every claim in `[n]` citations; chips link to the source, and for YouTube to the *exact second* (`&t=`)
- **Local-first storage** — sources, chunks, and embeddings live in your browser's IndexedDB; only small excerpts are sent to the model when you ask
- **Retrieval quality matters** — paragraph-aware chunking with overlap, `RETRIEVAL_DOCUMENT` vs `RETRIEVAL_QUERY` task-typed embeddings, top-k cosine search
- **Honest refusal** — if the sources don't contain the answer, the model says so instead of inventing one

## Tech stack

Next.js 15 (App Router) · TypeScript · Tailwind v4 · Gemini (`@google/genai` — `gemini-2.5-flash` + `gemini-embedding-001`) · `youtube-transcript` · `unpdf` · IndexedDB (`idb`)

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

Notes: Vercel's request-size cap means PDFs up to ~4 MB and audio up to ~15 MB locally (smaller on Vercel). Multi-notebook persistence and server-side vector storage are on the roadmap.

## Architecture

```
app/
  api/youtube/route.ts   transcript fetch (+ timestamps) → chunked
  api/pdf/route.ts       text extraction (unpdf)
  api/audio/route.ts     Gemini-native transcription
  api/embed/route.ts     Gemini embeddings (task-typed)
  api/ask/route.ts       grounded generation with [n] citation contract
lib/
  chunk.ts               paragraph-aware chunking + transcript grouping
  vector.ts              cosine similarity + top-k
  store.ts               IndexedDB persistence (sources, chunks, vectors)
  citations.ts           answer → citation chips
```

## Roadmap

- [ ] Multiple named notebooks
- [ ] Optional Supabase persistence (sync across devices)
- [ ] Long-audio support via Files API (currently ~15 MB inline limit)
- [ ] Answer streaming
- [ ] Export answers with citations to Markdown

## Privacy & Security

- **Your sources stay yours** — documents, chunks, and embeddings are stored in your browser's IndexedDB. They are never uploaded to the server.
- **Only excerpts travel** — when you ask a question, just the top-6 retrieved excerpts are sent to Google's Gemini API to compose the answer. The system prompt wraps excerpts in `<source_excerpt>` tags and instructs the model to treat them as passive data, never as instructions.
- **No accounts, no analytics, no tracking.**
- **Bring your own key** — your Gemini key is stored only in your browser's localStorage and sent per-request via the `x-gemini-key` header. Clear it anytime in Settings (⚙).
- **Server key is opt-in** — deployment owners decide via `ALLOW_SERVER_KEY`; without it, API routes refuse to run on the shared key. All API routes are per-IP rate limited, and standard security headers are set on every response.
- **Found a vulnerability?** Please report it privately via GitHub's *Security → Report a vulnerability* rather than a public issue. See [SECURITY.md](SECURITY.md).

## History

Cogniflow started as a single-file YouTube summarizer (Streamlit + Gemini) — it still lives, archived, in [`legacy-streamlit/`](legacy-streamlit/).

## License

MIT — see [LICENSE](LICENSE).
