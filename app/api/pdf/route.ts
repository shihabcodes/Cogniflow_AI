import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    if (file.size > 4_000_000)
      return NextResponse.json(
        { error: "PDF is larger than ~4 MB — that exceeds Vercel's request limit. Split the file or paste the text instead." },
        { status: 413 }
      );

    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { text } = await extractText(pdf, { mergePages: true });
    const clean = (Array.isArray(text) ? text.join("\n\n") : text).trim();
    if (!clean)
      return NextResponse.json(
        { error: "No extractable text found — this PDF is likely a scan (images only)." },
        { status: 422 }
      );

    return NextResponse.json({
      title: file.name.replace(/\.pdf$/i, ""),
      text: clean,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
