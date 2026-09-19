import { GoogleGenAI } from "@google/genai";

const EMBED_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const ANSWER_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_API_KEY is not configured. Set it in .env.local (local) or your Vercel project environment variables."
    );
  }
  return new GoogleGenAI({ apiKey });
}

export async function embedTexts(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const ai = getAI();
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
  prompt: string
): Promise<string> {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: ANSWER_MODEL,
    contents: prompt,
    config: { systemInstruction, temperature: 0.2 },
  });
  return res.text ?? "";
}

export async function transcribeAudio(
  base64: string,
  mimeType: string
): Promise<string> {
  const ai = getAI();
  const res = await ai.models.generateContent({
    model: ANSWER_MODEL,
    contents: [
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
    ],
  });
  return res.text ?? "";
}
