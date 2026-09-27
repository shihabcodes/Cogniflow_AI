import { NextResponse } from "next/server";
import { testApiKey } from "@/lib/gemini";
import { errorMessage, geminiKey } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { key, denied } = geminiKey(req);
  if (denied) return denied;
  try {
    return NextResponse.json({ ok: true, model: await testApiKey(key) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: errorMessage(err, "API key test failed.") }, { status: 400 });
  }
}
