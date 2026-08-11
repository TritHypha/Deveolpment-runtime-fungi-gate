#!/usr/bin/env node
import { realpathSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ownedProcessTree from "./lib/owned-process-tree.cjs";

const { runOwnedProcessSync } = ownedProcessTree;
const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CADENCES = new Set(["changed", "normal", "nightly", "exhaustive", "release", "on-demand"]);

function parseArguments(argv) {
  if (argv.length === 0) return DEFAULT_ROOT;
  if (argv.length === 2 && argv[0] === "--root" && !argv[1].startsWith("--")) return resolve(argv[1]);
  throw new Error("usage: run-generator-contract-cadence.mjs [--root <path>]");
}

function childEnvironment() {
  const admitted = {};
  const entries = Object.entries(process.env);
  const copy = (name, aliases) => {
    const item = entries.find(([key, value]) => aliases.includes(key.toLowerCase())
      && typeof value === "string" && value.length > 0);
    if (item) admitted[name] = item[1];
  };
  copy("PATH", ["path"]);
  if (process.platform === "win32") {
    copy("SystemRoot", ["systemroot"]); copy("WINDIR", ["windir"]);
    copy("ComSpec", ["comspec"]); copy("PATHEXT", ["pathext"]);
    copy("TEMP", ["temp"]); copy("TMP", ["tmp"]);
  } else {
    copy("TMPDIR", ["tmpdir"]); copy("LANG", ["lang"]); copy("LC_ALL", ["lc_all"]);
  }
  admitted.GIT_CONFIG_NOSYSTEM = "1";
  admitted.GIT_CONFIG_GLOBAL = process.platform === "win32" ? "NUL" : "/dev/null";
  admitted.NPM_CONFIG_USERCONFIG = process.platform === "win32" ? "NUL" : "/dev/null";
  return admitted;
}

try {
  const root = realpathSync(parseArguments(process.argv.slice(2)));
  if (!statSync(root).isDirectory()) throw new Error("root is not a directory");
  const cadence = process.env.GALERINA_ASSURANCE_CADENCE;
  if (!CADENCES.has(cadence)) throw new Error("GALERINA_ASSURANCE_CADENCE is outside the closed vocabulary");
  const tier = cadence === "exhaustive" ? "exhaustive" : "phase-close";
  const child = runOwnedProcessSync({
    command: process.execPath,
    args: ["scripts/audit-generator-contract.mjs", "--tier", tier],
    cwd: root,
    env: childEnvironment(),
    timeoutMs: 600_000,
    maxOutputBytes: 67_108_864,
    windowsHide: true,
  });
  if (child.stdout) process.stdout.write(child.stdout);
  if (child.stderr) process.stderr.write(child.stderr);
  if (child.error !== undefined || typeof child.signal === "string" || !Number.isSafeInteger(child.status)) {
    throw new Error("generator-contract child did not return exact terminal evidence");
  }
  process.exitCode = child.status;
} catch (error) {
  process.stderr.write(`generator-contract-cadence: REFUSED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
