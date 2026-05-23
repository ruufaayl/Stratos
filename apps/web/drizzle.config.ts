import { defineConfig } from "drizzle-kit";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// apps/web/.env.local is kept in sync with the monorepo root by sync-env.mjs.
// drizzle-kit doesn't auto-load env files, so we parse it manually here
// (avoids the @next/env CJS interop issue in drizzle-kit's ts-node context).
const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && !k.startsWith("#") && rest.length) {
      process.env[k.trim()] ??= rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

// Migrations require a direct (non-pooled) connection.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (or _UNPOOLED) is required for drizzle-kit");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
