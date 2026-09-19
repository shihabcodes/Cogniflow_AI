import type { Chunk } from "./types";
import type { Source } from "./types";

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

export function topK(
  queryVector: number[],
  sources: Source[],
  k = 6
): { chunk: Chunk; source: Source; score: number }[] {
  const scored: { chunk: Chunk; source: Source; score: number }[] = [];
  for (const s of sources) {
    for (const c of s.chunks) {
      if (!c.vector) continue;
      scored.push({ chunk: c, source: s, score: cosineSim(queryVector, c.vector) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
