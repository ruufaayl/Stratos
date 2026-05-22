#!/usr/bin/env node
/**
 * Sync .env.local from the monorepo root into apps/web so Next.js picks it up
 * natively. The root is the canonical location — edits there propagate on the
 * next `pnpm dev`. Drizzle-kit reads from the root via @next/env.
 */

import { copyFileSync, existsSync, statSync, utimesSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const src = resolve(root, ".env.local");
const dst = resolve(root, "apps", "web", ".env.local");

if (!existsSync(src)) {
  console.warn(`[sync-env] ${src} not found — skip. Create it from .env.example.`);
  process.exit(0);
}

// Only copy if source is newer than destination (avoid bumping mtime needlessly).
let needCopy = true;
if (existsSync(dst)) {
  const srcM = statSync(src).mtimeMs;
  const dstM = statSync(dst).mtimeMs;
  needCopy = srcM > dstM;
}

if (needCopy) {
  copyFileSync(src, dst);
  // Align mtime so we don't re-copy on the next run.
  const m = statSync(src).mtimeMs / 1000;
  utimesSync(dst, m, m);
  console.log(`[sync-env] copied ${src} -> ${dst}`);
} else {
  console.log("[sync-env] apps/web/.env.local already in sync.");
}
