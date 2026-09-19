import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogniflow AI — ask your media",
  description:
    "NotebookLM-style RAG: add YouTube videos, podcasts, and PDFs as sources, then ask questions and get answers with citations that link back to the exact moment.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
