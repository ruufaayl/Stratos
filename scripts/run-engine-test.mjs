#!/usr/bin/env node
/** Cross-platform `pytest engine/tests` runner. See run-engine.mjs for rationale. */

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
  console.error(`\n[run-engine-test] venv not found: ${venvPython}\n[run-engine-test] Run: pnpm engine:install\n`);
  process.exit(1);
}

const child = spawn(venvPython, ["-m", "pytest", "engine/tests", ...process.argv.slice(2)], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: false,
});
child.on("exit", (code) => process.exit(code ?? 0));
