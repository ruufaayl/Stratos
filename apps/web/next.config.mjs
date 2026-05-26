// .env.local is synced from the monorepo root into apps/web/ by
// `scripts/sync-env.mjs` (runs automatically on `pnpm dev` / `pnpm build`).
// Edit the root file; this directory's copy is gitignored and overwritten.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,        // Don't expose "X-Powered-By: Next.js"
  compress: true,                // Enable gzip/brotli compression
  experimental: {
    instrumentationHook: true,   // Required for instrumentation.ts in Next.js 14
  },
  async rewrites() {
    return [
      {
        source: "/engine/:path*",
        destination: `${process.env.ENGINE_URL ?? "http://localhost:8000"}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS (1 year, include subdomains)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          // Restrict browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          // Note: 'unsafe-inline' is needed for Tailwind + Clerk; tighten post-launch
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.stratos.ai https://*.clerk.accounts.dev https://js.stripe.com https://us-assets.i.posthog.com https://us.i.posthog.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.stripe.com https://us.i.posthog.com https://us-assets.i.posthog.com wss://*.clerk.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
      {
        // API routes: no caching by default (each route handles its own)
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
