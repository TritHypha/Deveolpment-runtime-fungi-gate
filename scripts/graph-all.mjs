#!/usr/bin/env node
// graph-all.mjs — fail-closed orchestrator for repository-owned Galerina graph surfaces.
// Version: 3.0.0 · governed-memory migration.
//
// Personal/agent memory is deliberately excluded: it is private untrusted
// development data, not a reproducible build input. Use memory-graph.mjs
// explicitly for a read-only ephemeral query or health check.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let kbDir = null;
  let check = false;
  let quiet = false;
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" || arg === "--kb-dir") {
      if (seen.has(arg) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        throw new Error(`graph-all: ${arg} requires exactly one path`);
      }
      seen.add(arg);
      const value = resolve(argv[++i]);
      if (arg === "--root") root = value;
      if (arg === "--kb-dir") kbDir = value;
      continue;
    }
    if (arg === "--check" && !check) {
      check = true;
      continue;
    }
    if (arg === "--quiet" && !quiet) {
      quiet = true;
      continue;
    }
    throw new Error(`graph-all: unknown or duplicate argument ${arg}`);
  }
  return {
    root,
    kbDir: kbDir
      || (process.env.GALERINA_KB_DIR ? resolve(process.env.GALERINA_KB_DIR) : null)
      || resolve(root, "..", "ZTF-Knowledge-Bases"),
    check,
    quiet,
  };
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const node = process.execPath;
const mode = options.check ? "check" : "generate";
const children = [
  {
    name: "package graph",
    args: [
      "scripts/package-graph-generator.mjs",
      "--root", options.root,
      ...(options.check ? ["--check"] : []),
    ],
  },
  {
    name: "project graph",
    args: [
      "scripts/project-graph-generator.mjs",
      "--root", options.root,
      ...(options.check ? ["--check"] : []),
    ],
  },
  {
    name: "graph integrity",
    args: ["scripts/audit-graph-integrity.mjs"],
  },
  {
    name: "KB graph",
    args: [
      "scripts/kb-graph-generator.mjs",
      "--root", options.root,
      "--kb-dir", options.kbDir,
      ...(options.check ? ["--check"] : []),
    ],
  },
  {
    name: "dev-tool index",
    args: [
      "scripts/dev-tool-index.mjs",
      "--root", options.root,
      ...(options.check ? ["--generator-check"] : []),
    ],
  },
  {
    name: "Fungi source capability inventory",
    args: [
      "scripts/fungi-source-capability-inventory.mjs",
      "--root", options.root,
      ...(options.check ? ["--check"] : []),
    ],
  },
  {
    name: "semantic assurance graph",
    args: [
      "scripts/gen-assurance-semantic-graph.mjs",
      "--root", options.root,
      ...(options.check ? ["--check"] : []),
    ],
  },
];

const results = [];
for (const child of children) {
  const result = spawnSync(node, child.args, {
    cwd: options.root,
    encoding: "utf8",
    env: { ...process.env, GALERINA_KB_DIR: options.kbDir },
  });
  const status = result.error || result.signal || result.status !== 0
    ? result.status ?? 1
    : 0;
  results.push({ ...child, status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" });
  if (!options.quiet) {
    console.log(`${status === 0 ? "PASS" : "FAIL"} ${child.name} (${mode}; exit ${status})`);
  }
}

const failed = results.filter((result) => result.status !== 0);
if (failed.length > 0) {
  for (const result of failed) {
    const detail = `${result.stderr}\n${result.stdout}`.trim();
    console.error(`graph-all: ${result.name} refused with exit ${result.status}${detail ? `\n${detail}` : ""}`);
  }
  console.error(`graph-all: FAIL ${children.length - failed.length}/${children.length} ${mode} children passed`);
  process.exit(1);
}

console.log(`graph-all: PASS ${children.length}/${children.length} ${mode} children passed`);
