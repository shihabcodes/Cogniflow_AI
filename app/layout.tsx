import type { Metadata } from "next";
import "./globals.css";

// Render per request so Next.js can stamp the middleware's CSP nonce on its scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cogniflow AI — The Intelligence Layer for Media & Docs",
  description:
    "Ask YouTube videos, podcasts, PDFs, and notes questions and get cited answers linked to the exact timestamp.",
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
