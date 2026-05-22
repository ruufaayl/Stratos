// .env.local is synced from the monorepo root into apps/web/ by
// `scripts/sync-env.mjs` (runs automatically on `pnpm dev` / `pnpm build`).
// Edit the root file; this directory's copy is gitignored and overwritten.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes was on but conflicts with Clerk's optional catch-all routes
  // ([[...sign-in]]). Re-enable when we move auth pages or upgrade Next.
  experimental: {},
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
