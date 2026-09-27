import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { errorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
    if (file.size > 4_000_000)
      return NextResponse.json(
        { error: "PDF is larger than ~4 MB — that exceeds Vercel's request limit. Split the file or paste the text instead." },
        { status: 413 }
      );

    const { text } = await extractText(await getDocumentProxy(new Uint8Array(await file.arrayBuffer())), { mergePages: true });
    const clean = text.trim();
    if (!clean)
      return NextResponse.json({ error: "No extractable text found — this PDF is likely a scan (images only)." }, { status: 422 });

    return NextResponse.json({ title: file.name.replace(/\.pdf$/i, ""), text: clean });
  } catch (err) {
    return errorResponse(err, "Failed to parse PDF.");
  }
}
