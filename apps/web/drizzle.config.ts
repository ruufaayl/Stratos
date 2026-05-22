import { defineConfig } from "drizzle-kit";
import nextEnv from "@next/env";

// apps/web/.env.local is kept in sync with the monorepo root by sync-env.mjs.
// drizzle-kit doesn't auto-load env files, so we do it explicitly here.
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

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
