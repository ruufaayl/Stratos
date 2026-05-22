import { loadEnvConfig } from "@next/env";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Monorepo convention: .env.local lives at the repo ROOT (one source of truth).
// Load it before Next.js reads process.env so it's available at build + runtime.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(__dirname, "../.."));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    return [
      {
        source: "/engine/:path*",
        destination: `${process.env.ENGINE_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
