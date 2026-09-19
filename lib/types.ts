export type SourceType = "youtube" | "pdf" | "audio" | "text";

export interface Chunk {
  id: string; // `${sourceId}:${index}`
  sourceId: string;
  index: number;
  text: string;
  // seconds — only for YouTube sources
  startTimeSec?: number;
  vector?: number[];
}

export interface Source {
  id: string;
  type: SourceType;
  title: string;
  // original url for youtube, blob url none for others
  url?: string;
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

export interface Citation {
  n: number;
  sourceTitle: string;
  sourceType: SourceType;
  sourceUrl?: string;
  videoId?: string;
  startTimeSec?: number;
  snippet: string;
}
