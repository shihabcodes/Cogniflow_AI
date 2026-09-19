import { GoogleGenAI } from "@google/genai";

const EMBED_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i) as string[];

export function getAI(customKey?: string): GoogleGenAI {
  const apiKey = customKey?.trim() || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Set GOOGLE_API_KEY in your environment or enter your key in Settings."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Helper to execute generateContent with automatic model fallback for deprecated/unavailable models
async function generateWithFallback(
  ai: GoogleGenAI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<{ text?: string; modelUsed: string }> {
  let lastError: unknown = null;
  for (const model of FALLBACK_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        ...(config ? { config } : {}),
      });
      return { text: res.text, modelUsed: model };
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("404") ||
        msg.includes("no longer available") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found")
      ) {
        console.warn(`Model ${model} unavailable (${msg}), attempting next candidate...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  apiKey?: string
): Promise<number[][]> {
  const ai = getAI(apiKey);
  const vectors = await Promise.all(
    texts.map(async (t) => {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: t,
        config: { taskType, outputDimensionality: 768 },
      });
      const values = res.embeddings?.[0]?.values;
      if (!values) throw new Error("Embedding returned no values for a chunk.");
      return values;
    })
  );
  return vectors;
}

export async function answerWith(
  systemInstruction: string,
  prompt: string,
  apiKey?: string
): Promise<string> {
  const ai = getAI(apiKey);
  const res = await generateWithFallback(
    ai,
    prompt,
    { systemInstruction, temperature: 0.2 }
  );
  return res.text ?? "";
}

export async function transcribeAudio(
  base64: string,
  mimeType: string,
  apiKey?: string
): Promise<string> {
  const ai = getAI(apiKey);
  const res = await generateWithFallback(
    ai,
    [
      {
        role: "user",
        parts: [
          {
            inlineData: { mimeType, data: base64 },
          },
          {
            text: "Transcribe this audio verbatim. Output only the transcript text with paragraph breaks where the speaker changes topic. Do not add commentary.",
          },
        ],
      },
    ]
  );
  return res.text ?? "";
}

export async function transcribeYouTube(
  videoId: string,
  apiKey?: string
): Promise<string> {
  const ai = getAI(apiKey);
  const res = await generateWithFallback(
    ai,
    [
      {
        role: "user",
        parts: [
          {
            fileData: {
              fileUri: `https://www.youtube.com/watch?v=${videoId}`,
              mimeType: "video/mp4",
            },
          },
          {
            text: `Please generate a comprehensive, timestamped transcript or detailed chronological outline of this video.
Format your output with timestamps at the beginning of each paragraph or topic change, like this:
[00:00] Introduction and overview of the topic...
[01:15] Deep dive into the first concept...
[03:45] Practical examples and demonstrations...

Include all key spoken points, discussions, and concepts covered. Do not include introductory commentary or meta text, only the timestamped transcript.`,
          },
        ],
      },
    ]
  );
  return res.text ?? "";
}

export async function testApiKey(apiKey?: string): Promise<{ ok: boolean; model: string }> {
  const ai = getAI(apiKey);
  const res = await generateWithFallback(ai, "Hello, reply with 'OK' only.");
  return { ok: !!res.text, model: res.modelUsed };
}
