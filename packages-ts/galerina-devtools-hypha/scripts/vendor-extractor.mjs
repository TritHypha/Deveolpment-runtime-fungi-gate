#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const TARGET = join(PACKAGE_ROOT, "src", "extract.mjs");
const PROVENANCE = join(PACKAGE_ROOT, "src", "provenance.json");
const CHILD_TIMEOUT_MS = 30_000;
const CHILD_MAX_BUFFER = 1024 * 1024;

const EXPORTED = Object.freeze([
  "distDir",
  "distFiles",
  "extractGateList",
  "extractStdlibCases",
  "extractInlineTables",
  "extractKindSets",
  "extractPassCalls",
  "extractExportedCheckers",
  "extractDiagnostics",
  "findCallSites",
  "findAllCallSites",
  "extractParserKinds",
]);

function refuse(message) {
  throw new Error(`hypha vendor refused: ${message}`);
}

function git(repo, args) {
  const safeRepo = resolve(repo).split(sep).join("/");
  return execFileSync("git", ["-c", `safe.directory=${safeRepo}`, ...args], {
    cwd: repo,
    encoding: "utf8",
    timeout: CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
    windowsHide: true,
  });
}

export function sourceOwnerRootFromCommonDir(commonDir, ownerName) {
  const normalized = resolve(commonDir);
  if (basename(normalized).toLowerCase() !== ".git") {
    refuse("Git common directory must end in .git");
  }
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(ownerName)) {
    refuse("source owner name is invalid");
  }
  return resolve(normalized, "..", "..", "subprojects", ownerName);
}

function defaultUpstreamRoot() {
  const commonDir = git(PACKAGE_ROOT, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]).trim();
  return sourceOwnerRootFromCommonDir(commonDir, "hypha");
}

function parseArgs(argv) {
  let mode = "--write";
  let upstreamRoot;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write" || arg === "--check") mode = arg;
    else if (arg === "--upstream") {
      const value = argv[index + 1];
      if (!value) refuse("--upstream requires a repository root");
      upstreamRoot = resolve(value);
      index += 1;
    } else refuse(`unknown argument ${arg}`);
  }
  return { mode, upstreamRoot };
}

function replaceExactly(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) refuse(`${label} start was absent`);
  if (source.indexOf(before, first + before.length) >= 0) {
    refuse(`${label} was not unique`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function removeFreshnessOnly(source) {
  const startMarker = "// ── freshness digests (LIMITS.md §11)";
  const endMarker = "/**\n * Flow-decl node kinds the parser can actually produce.";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) {
    refuse("upstream freshness-only section boundaries changed");
  }
  return source.slice(0, start) + source.slice(end);
}

function render(upstreamBytes) {
  const digest = createHash("sha256").update(upstreamBytes).digest("hex");
  let body = upstreamBytes.toString("utf8").replaceAll("\r\n", "\n");

  body = replaceExactly(body, '"use strict";\n\n', "", "CJS strict directive");
  body = replaceExactly(body, 'const fs = require("fs");\n', 'import fs from "node:fs";\n', "fs import");
  body = replaceExactly(body, 'const path = require("path");\n', 'import path from "node:path";\n', "path import");
  body = replaceExactly(body, 'const crypto = require("crypto");\n', "", "unused persistence crypto import");
  body = removeFreshnessOnly(body);
  body = replaceExactly(body, "let current = null;", "let current = undefined;", "current absence state");
  body = replaceExactly(body, "let una = null;", "let una = undefined;", "unattributed absence state");
  body = body.replaceAll("una = null;", "una = undefined;");
  body = body.replaceAll("current = null;", "current = undefined;");
  body = replaceExactly(body, "const out = Object.create(null);", "const out = new Map();", "call-site result map");
  body = replaceExactly(body, "for (const n of names) out[n] = [];", "for (const n of names) out.set(n, []);", "call-site result initialization");
  body = replaceExactly(body, "if (names.length === 0) return out;", "if (names.length === 0) return Object.fromEntries(out);", "empty call-site result");
  body = replaceExactly(body, "out[m.name].push({ file, line: i + 1 });", "out.get(m.name).push({ file, line: i + 1 });", "call-site result append");
  body = replaceExactly(body, "  return out;\n}\n\n// ── gate list", "  return Object.fromEntries(out);\n}\n\n// ── gate list", "call-site result return");

  const moduleStart = body.indexOf("module.exports = {");
  if (moduleStart < 0 || body.indexOf("module.exports = {", moduleStart + 1) >= 0) {
    refuse("upstream module export block was absent or ambiguous");
  }
  for (const name of EXPORTED) {
    if (!body.includes(`function ${name}(`)) refuse(`expected export ${name} was absent`);
  }
  body = body.slice(0, moduleStart) + `export {\n  ${EXPORTED.join(",\n  ")},\n};\n`;

  for (const forbidden of ["require(", "module.exports", "__dirname", "crypto.", "null"]) {
    if (body.includes(forbidden)) refuse(`transformed source retained forbidden token ${forbidden}`);
  }

  const header = `// ============================================================================\n` +
    `// galerina-devtools-hypha — src/extract.mjs\n` +
    `//\n` +
    `// VENDORED, NOT WRITTEN HERE. Source of truth:\n` +
    `//   subprojects/hypha/src/extract.js\n` +
    `//   sha256 ${digest}\n` +
    `//\n` +
    `// Deterministic CJS-to-ESM surface transform: npm run vendor. The upstream\n` +
    `// persistence-only freshness helpers are excluded because this passive package\n` +
    `// has no database or persisted fact base. Any transform drift refuses.\n` +
    `//\n` +
    `// Exports: ${EXPORTED.join(", ")}\n` +
    `// ============================================================================\n`;

  const provenance = `${JSON.stringify({
    vendoredFrom: "subprojects/hypha/src/extract.js",
    sha256: digest,
    exports: EXPORTED,
    note: "Regenerate with npm run vendor; never edit src/extract.mjs by hand.",
  }, undefined, 2)}\n`;

  return { target: header + body, provenance };
}

function main(argv = process.argv.slice(2)) {
  const { mode, upstreamRoot } = parseArgs(argv);
  const upstream = join(upstreamRoot ?? defaultUpstreamRoot(), "src", "extract.js");
  if (!existsSync(upstream)) refuse("upstream source is unavailable");

  const rendered = render(readFileSync(upstream));
  if (mode === "--check") {
    if (!existsSync(TARGET) || !existsSync(PROVENANCE)) refuse("vendored outputs are absent");
    if (readFileSync(TARGET, "utf8") !== rendered.target) refuse("src/extract.mjs is stale");
    if (readFileSync(PROVENANCE, "utf8") !== rendered.provenance) refuse("src/provenance.json is stale");
    process.stdout.write("hypha vendor check: current\n");
    return;
  }

  writeFileSync(TARGET, rendered.target, "utf8");
  writeFileSync(PROVENANCE, rendered.provenance, "utf8");
  process.stdout.write("hypha vendor: updated src/extract.mjs and src/provenance.json\n");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
