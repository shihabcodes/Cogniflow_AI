import { ApiError, GoogleGenAI, type ContentListUnion, type GenerateContentConfig } from "@google/genai";

const EMBED_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const MODELS = [...new Set([process.env.GEMINI_MODEL || "gemini-3.6-flash", "gemini-3.6-flash", "gemini-2.5-flash"])];

export function getAI(customKey?: string): GoogleGenAI {
  const apiKey = customKey?.trim() || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API key. Please configure your Gemini API key in Settings.");
  return new GoogleGenAI({ apiKey });
}

// Try each model in turn: 404 = retired, 429 = that model's quota is spent, 5xx = overloaded.
// Any other error (bad key, token limit, …) is final.
async function generate(
  apiKey: string | undefined,
  contents: ContentListUnion,
  config?: GenerateContentConfig
): Promise<{ text: string; model: string }> {
  const ai = getAI(apiKey);
  let last: ApiError | undefined;
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({ model, contents, config });
      return { text: res.text ?? "", model };
    } catch (err) {
      if (!(err instanceof ApiError) || ![404, 429, 500, 503].includes(err.status)) throw err;
      last = err;
    }
  }
  if (last?.status === 429)
    throw new Error("Gemini rate limit or quota exceeded. If you're on a free AI Studio key, wait a minute or check https://aistudio.google.com/.");
  if (last && last.status >= 500)
    throw new Error("Gemini is temporarily overloaded. Please try again in a moment.");
  throw last;
}

export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  apiKey?: string
): Promise<number[][]> {
  // One batchEmbedContents call for the whole list (API max 100).
  const res = await getAI(apiKey).models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: { taskType, outputDimensionality: 768 },
  });
  const vectors = res.embeddings?.map((e) => e.values);
  if (vectors?.length !== texts.length || vectors.some((v) => !v))
    throw new Error("Embedding returned no values for a chunk.");
  return vectors as number[][];
}

export async function answerWith(systemInstruction: string, prompt: string, apiKey?: string): Promise<string> {
  return (await generate(apiKey, prompt, { systemInstruction, temperature: 0.2 })).text;
}

export async function transcribeAudio(base64: string, mimeType: string, apiKey?: string): Promise<string> {
  const { text } = await generate(apiKey, [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64 } },
        {
          text: "Transcribe this audio verbatim. Output only the transcript text with paragraph breaks where the speaker changes topic. Do not add commentary.",
        },
      ],
    },
  ]);
  return text;
}

export async function transcribeYouTube(videoId: string, apiKey?: string): Promise<string> {
  const { text } = await generate(apiKey, [
    {
      role: "user",
      parts: [
        { fileData: { fileUri: `https://www.youtube.com/watch?v=${videoId}`, mimeType: "video/mp4" } },
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
  ]);
  return text;
}

export async function testApiKey(apiKey?: string): Promise<string> {
  return (await generate(apiKey, "Hello, reply with 'OK' only.")).model;
}
