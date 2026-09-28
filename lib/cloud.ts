"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Store } from "./store";
import type { Chunk, Notebook, Source } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False when the deployment has no Supabase project: the app then runs local-only. */
export const cloudEnabled = Boolean(url && key);

// supabase-js is ~65 kB, so it loads after first paint instead of in the page bundle.
let client: Promise<SupabaseClient> | undefined;
export function getSupabase(): Promise<SupabaseClient> {
  return (client ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(url!, key!, { auth: { flowType: "pkce" } })
  ));
}

const PAGE = 1000; // PostgREST's default max rows per response

// Throw on error; writes return no rows, so null becomes an empty list.
async function check<T>(q: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as NonNullable<T>;
}

type ChunkRow = { source_id: string; idx: number; text: string; start_time_sec: number | null; embedding: string };

export function cloudStore(db: SupabaseClient): Store {
  return {
    async loadAll() {
      const [nbRows, srcRows] = await Promise.all([
        check(db.from("notebooks").select("id, name, created_at").order("created_at")),
        check(db.from("sources").select("id, notebook_id, type, title, url, video_id, added_at").order("added_at")),
      ]);
      const chunks = new Map<string, Chunk[]>();
      for (let from = 0; ; from += PAGE) {
        const rows: ChunkRow[] = await check(
          db.from("chunks").select("source_id, idx, text, start_time_sec, embedding").order("source_id").order("idx").range(from, from + PAGE - 1)
        );
        for (const r of rows) {
          const list = chunks.get(r.source_id) ?? [];
          list.push({ text: r.text, vector: JSON.parse(r.embedding), startTimeSec: r.start_time_sec ?? undefined });
          chunks.set(r.source_id, list);
        }
        if (rows.length < PAGE) break;
      }

      let notebooks: Notebook[] = nbRows.map((n) => ({ id: n.id, name: n.name, createdAt: Date.parse(n.created_at) }));
      if (!notebooks.length) {
        notebooks = [{ id: crypto.randomUUID(), name: "My notebook", createdAt: Date.now() }];
        await this.saveNotebook(notebooks[0]);
      }
      const sources: Source[] = srcRows.map((s) => ({
        id: s.id,
        notebookId: s.notebook_id,
        type: s.type,
        title: s.title,
        url: s.url ?? undefined,
        videoId: s.video_id ?? undefined,
        addedAt: Date.parse(s.added_at),
        chunks: chunks.get(s.id) ?? [],
      }));
      return { notebooks, sources };
    },

    async saveSource(s) {
      await check(
        db.from("sources").insert({
          id: s.id,
          notebook_id: s.notebookId,
          type: s.type,
          title: s.title.slice(0, 300),
          url: s.url ?? null,
          video_id: s.videoId ?? null,
          added_at: new Date(s.addedAt).toISOString(),
        })
      );
      try {
        // ~200 rows (≈2 MB of vectors) per request.
        for (let i = 0; i < s.chunks.length; i += 200) {
          const rows = s.chunks.slice(i, i + 200).map((c, j) => ({
            source_id: s.id,
            idx: i + j,
            text: c.text,
            start_time_sec: c.startTimeSec ?? null,
            embedding: JSON.stringify(c.vector),
          }));
          await check(db.from("chunks").insert(rows));
        }
      } catch (err) {
        await db.from("sources").delete().eq("id", s.id); // don't leave a half-saved source
        throw err;
      }
    },

    async deleteSource(id) {
      await check(db.from("sources").delete().eq("id", id)); // chunks cascade
    },

    async saveNotebook(n) {
      await check(db.from("notebooks").upsert({ id: n.id, name: n.name, created_at: new Date(n.createdAt).toISOString() }));
    },

    async deleteNotebook(id) {
      await check(db.from("notebooks").delete().eq("id", id)); // sources and chunks cascade
    },
  };
}
