import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep file tracing anchored to this repo (avoids lockfile-root inference warnings)
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
