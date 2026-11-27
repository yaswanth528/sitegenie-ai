import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small self-contained server for the Docker image (.next/standalone). Vercel ignores it.
  output: "standalone",
};

export default nextConfig;
