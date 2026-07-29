#!/usr/bin/env node
// graph-all.mjs — fail-closed orchestrator for every Galerina graph surface.
// Version: 2.0.0 · Task 7 generator governance.
//
// Generate mode updates the five derived graph/index surfaces and validates
// project-graph integrity. Check mode routes every generator to its
// non-mutating check. The external KB and memory trees must be selected
// explicitly or resolve unambiguously; no child refusal is informational.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let kbDir = null;
  let memoryDir = null;
  let check = false;
  let quiet = false;
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--root" || arg === "--kb-dir" || arg === "--memory-dir") {
      if (seen.has(arg) || i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        throw new Error(`graph-all: ${arg} requires exactly one path`);
      }
      seen.add(arg);
      const value = resolve(argv[++i]);
      if (arg === "--root") root = value;
      if (arg === "--kb-dir") kbDir = value;
      if (arg === "--memory-dir") memoryDir = value;
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
    memoryDir: memoryDir
      || (process.env.MEMORY_DIR ? resolve(process.env.MEMORY_DIR) : null),
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
    name: "package graph",
    args: [
      "scripts/package-graph-generator.mjs",
      "--root", options.root,
      ...(options.check ? ["--check"] : []),
    ],
  },
  {
    name: "memory graph",
    args: [
      "scripts/memory-graph.mjs",
      ...(options.memoryDir === null ? [] : ["--dir", options.memoryDir]),
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
