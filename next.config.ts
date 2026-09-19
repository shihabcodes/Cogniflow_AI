import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep file tracing anchored to this repo (avoids lockfile-root inference warnings)
  outputFileTracingRoot: __dirname,
  // PDF/audio uploads go through server routes; keep the body limit generous
  // while staying under Vercel Hobby's ~4.5 MB request cap.
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
