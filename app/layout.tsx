import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogniflow AI — The Intelligence Layer for Media & Docs",
  description:
    "Y Combinator-grade Multimodal RAG: Query YouTube videos, podcasts, PDFs, and notes with cited answers linked to the exact timestamp.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-orange-500/30 selection:text-orange-200">
        {children}
      </body>
    </html>
  );
}
