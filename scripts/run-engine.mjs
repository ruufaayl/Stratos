#!/usr/bin/env node
/**
 * Cross-platform launcher for the Python engine.
 *
 * Why this exists: the previous npm script
 *   "engine/.venv/Scripts/python -m uvicorn engine.main:app --reload --port 8000"
 * works on Linux/macOS but Windows cmd misparses the leading `engine/...` path
 * (treats `/` as a flag separator), failing with
 *   "'engine' is not recognized as an internal or external command".
 *
 * This launcher resolves the venv Python path per-OS and spawns uvicorn
 * with the correct module + reload settings.
 *
 * Usage: node scripts/run-engine.mjs [extra-args-passed-to-uvicorn]
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

const isWin = process.platform === "win32";
const venvPython = isWin
  ? resolve(repoRoot, "engine", ".venv", "Scripts", "python.exe")
  : resolve(repoRoot, "engine", ".venv", "bin", "python");

if (!existsSync(venvPython)) {
  console.error(`\n[run-engine] Python venv not found at: ${venvPython}`);
  console.error(`[run-engine] Run: pnpm engine:install\n`);
  process.exit(1);
}

const extraArgs = process.argv.slice(2);

const args = [
  "-m", "uvicorn",
  "engine.main:app",
  "--reload",
  "--port", "8000",
  ...extraArgs,
];

console.log(`[run-engine] ${venvPython} ${args.join(" ")}`);

const child = spawn(venvPython, args, {
  cwd: repoRoot,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
