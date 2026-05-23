#!/usr/bin/env node
/** Cross-platform engine venv bootstrap: creates .venv, installs requirements. */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const isWin = process.platform === "win32";
const venvDir = resolve(repoRoot, "engine", ".venv");
const venvPython = isWin
  ? resolve(venvDir, "Scripts", "python.exe")
  : resolve(venvDir, "bin", "python");

function run(cmd, args) {
  console.log(`[install-engine] ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { cwd: repoRoot, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!existsSync(venvPython)) {
  // Find a system python — try `py -3` (Windows launcher), then `python3`, then `python`
  const candidates = isWin ? ["py", "python", "python3"] : ["python3", "python"];
  let bootstrap = null;
  for (const c of candidates) {
    const t = spawnSync(c, ["--version"], { shell: false });
    if (t.status === 0) { bootstrap = c; break; }
  }
  if (!bootstrap) {
    console.error("[install-engine] No Python interpreter found. Install Python 3.12 first.");
    process.exit(1);
  }
  run(bootstrap, ["-m", "venv", venvDir]);
}

run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"]);
run(venvPython, ["-m", "pip", "install", "-r", "engine/requirements.txt"]);
console.log("[install-engine] done.");
