import { GoogleGenAI } from "@google/genai";

const EMBED_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const FALLBACK_MODELS = [
  DEFAULT_MODEL,
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro-latest",
  "gemini-1.5-pro",
].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i) as string[];

export function getAI(customKey?: string): GoogleGenAI {
  const apiKey = customKey?.trim() || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Please configure your Gemini API key in Settings."
    );
  }
  return new GoogleGenAI({ apiKey });
}

// Helper to execute generateContent with automatic model fallback for deprecated, unavailable, or overloaded models
async function generateWithFallback(
  ai: GoogleGenAI,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contents: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config?: any
): Promise<{ text?: string; modelUsed: string }> {
  let primaryError: Error | null = null;
  let rateLimitHit = false;
  let highDemandHit = false;

  for (const model of FALLBACK_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents,
        ...(config ? { config } : {}),
      });
      return { text: res.text, modelUsed: model };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!primaryError && err instanceof Error) {
        primaryError = err;
      }

      // If input tokens exceed 1M limit (common for videos > 1 hour), attempt 2M-token models
      if (
        msg.includes("exceeds the maximum number of tokens") ||
        msg.includes("input token count exceeds")
      ) {
        console.warn(`Input token count exceeded for ${model}. Attempting 2M-token model...`);
        for (const proModel of ["gemini-1.5-pro-latest", "gemini-2.5-pro", "gemini-1.5-pro-002"]) {
          try {
            const proRes = await ai.models.generateContent({
              model: proModel,
              contents,
              ...(config ? { config } : {}),
            });
            return { text: proRes.text, modelUsed: proModel };
          } catch (proErr: unknown) {
            const proMsg = proErr instanceof Error ? proErr.message : String(proErr);
            if (
              proMsg.includes("exceeds the maximum number of tokens") ||
              proMsg.includes("input token count exceeds")
            ) {
              throw new Error(
                "This video is over 2 hours long and exceeds the token limit for direct AI video ingestion. Please copy the transcript from YouTube and paste it into the 'Text' tab to query it!"
              );
            }
          }
        }
      }

      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
        rateLimitHit = true;
      }
      if (
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("overloaded")
      ) {
        highDemandHit = true;
      }

      // Check for deprecation, not found, high demand / overload (503), or rate limits (429)
      if (
        msg.includes("404") ||
        msg.includes("no longer available") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not found") ||
        msg.includes("503") ||
        msg.includes("UNAVAILABLE") ||
        msg.includes("high demand") ||
        msg.includes("overloaded") ||
        msg.includes("temporarily unavailable") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED")
      ) {
        console.warn(`Model ${model} unavailable or overloaded (${msg}), attempting next candidate...`);
        continue;
      }
      throw err;
    }
  }

  // If all models were exhausted, provide a clean, helpful error message rather than a confusing 404 from a dead fallback
  if (rateLimitHit) {
    throw new Error(
      "Gemini API rate limit or quota exceeded (429). If you are using a free key from Google AI Studio, please wait a minute or check your quota at https://aistudio.google.com/."
    );
  }
  if (highDemandHit) {
    throw new Error(
      "Gemini API is currently experiencing temporary high demand (503). Please try asking again in a few moments."
    );
  }

  throw primaryError || new Error("All AI model fallbacks were unavailable. Please verify your Gemini API key in Settings.");
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
