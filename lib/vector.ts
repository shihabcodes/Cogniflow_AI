import type { Chunk, Source } from "./types";

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

const tokenize = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [];

// Term counts per chunk, computed once per chunk object.
const termCache = new WeakMap<Chunk, { tf: Map<string, number>; len: number }>();
function terms(c: Chunk) {
  let t = termCache.get(c);
  if (!t) {
    const tokens = tokenize(c.text);
    const tf = new Map<string, number>();
    for (const w of tokens) tf.set(w, (tf.get(w) ?? 0) + 1);
    termCache.set(c, (t = { tf, len: tokens.length }));
  }
  return t;
}

/** Okapi BM25 score of every chunk for the query (k1 = 1.2, b = 0.75). */
export function bm25(query: string, chunks: Chunk[]): number[] {
  const q = [...new Set(tokenize(query))];
  const docs = chunks.map(terms);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / (docs.length || 1) || 1;
  const idf = q.map((w) => {
    const df = docs.filter((d) => d.tf.has(w)).length;
    return Math.log(1 + (docs.length - df + 0.5) / (df + 0.5));
  });
  return docs.map((d) =>
    q.reduce((s, w, i) => {
      const f = d.tf.get(w) ?? 0;
      return s + (f ? (idf[i] * f * 2.2) / (f + 1.2 * (0.25 + (0.75 * d.len) / avgLen)) : 0);
    }, 0)
  );
}

/**
 * Hybrid retrieval: rank chunks by embedding similarity and by BM25 keyword match,
 * then merge with reciprocal rank fusion (score = Σ 1 / (60 + rank)).
 */
export function topK(
  queryVector: number[],
  queryText: string,
  sources: Source[],
  k = 6
): { chunk: Chunk; source: Source; score: number }[] {
  const items = sources.flatMap((source) => source.chunks.map((chunk) => ({ chunk, source, score: 0 })));
  const keyword = bm25(queryText, items.map((i) => i.chunk));
  const semantic = items.map((i) => cosineSim(queryVector, i.chunk.vector));

  for (const scores of [semantic, keyword]) {
    const order = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]);
    order.forEach(([s, i], rank) => {
      if (s > 0) items[i].score += 1 / (60 + rank);
    });
  }
  return items.sort((a, b) => b.score - a.score).slice(0, k);
}
