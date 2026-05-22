import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// .env.local lives at the monorepo root — load it before reading process.env.
loadEnvConfig(`${process.cwd()}/../..`);

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
