import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three.js uses ES modules; Next.js must transpile it
  transpilePackages: ["three"],
};

export default nextConfig;
