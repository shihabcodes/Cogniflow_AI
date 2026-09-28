import type { Metadata, Viewport } from "next";
// Fonts ship from our own origin (npm packages), so the CSP stays 'self' and builds need no network.
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

// Render per request so Next.js can stamp the proxy's CSP nonce on its scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cogniflow — ask your videos, podcasts & PDFs",
  description:
    "Add YouTube videos, podcasts, PDFs or notes and ask questions. Every answer cites its source, and video citations jump to the exact second.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans antialiased selection:bg-accent/25">{children}</body>
    </html>
  );
}
