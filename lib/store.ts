"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Notebook, Source } from "./types";

const DB_NAME = "cogniflow";
// v1: sources. v2: notebooks. Sources saved before v2 have no notebookId and belong to DEFAULT_NOTEBOOK.
export const DEFAULT_NOTEBOOK = "default";

async function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 2, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("sources")) d.createObjectStore("sources", { keyPath: "id" });
      if (!d.objectStoreNames.contains("notebooks")) d.createObjectStore("notebooks", { keyPath: "id" });
    },
  });
}

/** Persistence used by the page: IndexedDB when signed out (below), Supabase when signed in (lib/cloud.ts). */
export interface Store {
  loadAll(): Promise<{ notebooks: Notebook[]; sources: Source[] }>;
  saveSource(source: Source): Promise<void>;
  deleteSource(id: string): Promise<void>;
  saveNotebook(notebook: Notebook): Promise<void>;
  deleteNotebook(id: string, sourceIds: string[]): Promise<void>;
}

async function loadAll(): Promise<{ notebooks: Notebook[]; sources: Source[] }> {
  try {
    const d = await db();
    let notebooks = ((await d.getAll("notebooks")) as Notebook[]).sort((a, b) => a.createdAt - b.createdAt);
    if (!notebooks.length) {
      notebooks = [{ id: DEFAULT_NOTEBOOK, name: "My notebook", createdAt: Date.now() }];
      await d.put("notebooks", notebooks[0]);
    }
    const sources = ((await d.getAll("sources")) as Source[])
      .map((s) => ({ ...s, notebookId: s.notebookId ?? DEFAULT_NOTEBOOK }))
      .sort((a, b) => a.addedAt - b.addedAt);
    return { notebooks, sources };
  } catch {
    return { notebooks: [{ id: DEFAULT_NOTEBOOK, name: "My notebook", createdAt: 0 }], sources: [] };
  }
}

async function saveSource(source: Source): Promise<void> {
  await (await db()).put("sources", source);
}

async function deleteSource(id: string): Promise<void> {
  await (await db()).delete("sources", id);
}

async function saveNotebook(notebook: Notebook): Promise<void> {
  await (await db()).put("notebooks", notebook);
}

/** Deletes the notebook and every source in it. */
async function deleteNotebook(id: string, sourceIds: string[]): Promise<void> {
  const tx = (await db()).transaction(["notebooks", "sources"], "readwrite");
  await Promise.all([tx.objectStore("notebooks").delete(id), ...sourceIds.map((s) => tx.objectStore("sources").delete(s)), tx.done]);
}

/** Empties this browser's store (after its notebooks were moved into an account). */
async function clear(): Promise<void> {
  const tx = (await db()).transaction(["notebooks", "sources"], "readwrite");
  await Promise.all([tx.objectStore("notebooks").clear(), tx.objectStore("sources").clear(), tx.done]);
}

export const localStore = { loadAll, saveSource, deleteSource, saveNotebook, deleteNotebook, clear };
