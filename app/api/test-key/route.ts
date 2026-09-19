import { NextResponse } from "next/server";
import { testApiKey } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const headerKey = req.headers.get("x-gemini-key") || undefined;
    let bodyKey: string | undefined;
    try {
      const body = (await req.json()) as { apiKey?: string };
      bodyKey = body.apiKey;
    } catch {
      // empty or non-json body is fine
    }

    const effectiveKey = headerKey || bodyKey;
    const result = await testApiKey(effectiveKey);
    return NextResponse.json({ ok: true, model: result.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : "API key test failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
