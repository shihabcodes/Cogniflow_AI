"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Source } from "./types";

const DB_NAME = "cogniflow";
const STORE = "sources";

async function db(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: "id" });
    },
  });
}

export async function loadSources(): Promise<Source[]> {
  try {
    const d = await db();
    const all = (await d.getAll(STORE)) as Source[];
    return all.sort((a, b) => a.addedAt - b.addedAt);
  } catch {
    return [];
  }
}

export async function saveSource(source: Source): Promise<void> {
  const d = await db();
  await d.put(STORE, source);
}

export async function deleteSource(id: string): Promise<void> {
  const d = await db();
  await d.delete(STORE, id);
}
