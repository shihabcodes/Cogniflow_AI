export type SourceType = "youtube" | "pdf" | "audio" | "text";

export interface Chunk {
  text: string;
  vector: number[];
  startTimeSec?: number; // seconds — YouTube only
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  url?: string; // YouTube only
  videoId?: string;
  addedAt: number;
  chunks: Chunk[];
}

export interface RetrievedChunk {
  n: number; // 1-based citation number shown to the model
  text: string;
  sourceTitle: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoId?: string;
  startTimeSec?: number;
}

export interface Turn {
  role: "user" | "assistant";
  text: string;
}
