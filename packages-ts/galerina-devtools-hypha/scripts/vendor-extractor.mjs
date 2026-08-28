#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "..");
const TARGET = join(PACKAGE_ROOT, "src", "extract.mjs");
const PROVENANCE = join(PACKAGE_ROOT, "src", "provenance.json");
const CHILD_TIMEOUT_MS = 30_000;
const CHILD_MAX_BUFFER = 1024 * 1024;
const MAX_SOURCE_BYTES = 1024 * 1024;

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

function git(repo, args, encoding = "utf8") {
  const safeRepo = resolve(repo).split(sep).join("/");
  return execFileSync("git", ["--no-replace-objects", "-c", `safe.directory=${safeRepo}`, ...args], {
    cwd: repo,
    encoding,
    timeout: CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
    windowsHide: true,
  });
}

export function sourceOwnerRootFromCommonDir(commonDir, ownerName) {
  if (typeof commonDir !== "string" || !isAbsolute(commonDir)) {
    refuse("Git common directory must be absolute");
  }
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

export function parseArgs(argv) {
  let mode = "--write";
  let modeSeen = false;
  let upstreamRoot;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write" || arg === "--check") {
      if (modeSeen) refuse(arg === mode ? `duplicate ${arg}` : "conflicting mode arguments");
      mode = arg;
      modeSeen = true;
    }
    else if (arg === "--upstream") {
      if (upstreamRoot !== undefined) refuse("duplicate --upstream");
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) refuse("--upstream requires a repository root");
      if (!isAbsolute(value)) refuse("--upstream must be absolute");
      upstreamRoot = resolve(value);
      index += 1;
    } else refuse(`unknown argument ${arg}`);
  }
  return { mode, upstreamRoot };
}

export function equalSourceBytes(left, right) {
  const canonical = (bytes) => {
    if (!Buffer.isBuffer(bytes)) refuse("source bytes must be buffers");
    const output = Buffer.allocUnsafe(bytes.length);
    let write = 0;
    for (let read = 0; read < bytes.length; read += 1) {
      if (bytes[read] === 0x0d && bytes[read + 1] === 0x0a) continue;
      output[write] = bytes[read];
      write += 1;
    }
    return output.subarray(0, write);
  };
  return canonical(left).equals(canonical(right));
}

export function readUpstreamSource(upstreamRoot) {
  const upstream = resolve(upstreamRoot);
  const upstreamEntry = lstatSync(upstream);
  if (!upstreamEntry.isDirectory() || upstreamEntry.isSymbolicLink()) {
    refuse("upstream root must be a regular directory");
  }
  const sourceDirectory = join(upstream, "src");
  const sourceDirectoryEntry = lstatSync(sourceDirectory);
  if (!sourceDirectoryEntry.isDirectory() || sourceDirectoryEntry.isSymbolicLink()) {
    refuse("upstream source directory must be a regular directory");
  }
  const source = join(sourceDirectory, "extract.js");
  const entry = lstatSync(source);
  if (!entry.isFile() || entry.isSymbolicLink()) {
    refuse("upstream source must be a regular non-symbolic-link file");
  }
  if (entry.size > MAX_SOURCE_BYTES) refuse("upstream source exceeds the byte limit");
  const topLevel = git(upstream, ["rev-parse", "--show-toplevel"]).trim();
  if (resolve(topLevel).toLowerCase() !== upstream.toLowerCase()) {
    refuse("upstream root is not the repository top level");
  }
  git(upstream, ["ls-files", "--error-unmatch", "--", "src/extract.js"]);
  if (git(upstream, ["status", "--porcelain=v1", "--untracked-files=no", "--", "src/extract.js"]).trim()) {
    refuse("upstream source is not clean");
  }
  const bytes = git(upstream, ["show", "HEAD:src/extract.js"], null);
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_SOURCE_BYTES) {
    refuse("committed upstream source exceeds the byte limit");
  }
  return bytes;
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
  let body;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(upstreamBytes).replaceAll("\r\n", "\n");
  } catch {
    refuse("upstream source is not valid UTF-8");
  }

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

export function main(argv = process.argv.slice(2)) {
  const { mode, upstreamRoot } = parseArgs(argv);
  const upstream = upstreamRoot ?? defaultUpstreamRoot();

  const rendered = render(readUpstreamSource(upstream));
  if (mode === "--check") {
    if (!existsSync(TARGET) || !existsSync(PROVENANCE)) refuse("vendored outputs are absent");
    if (!equalSourceBytes(readFileSync(TARGET), Buffer.from(rendered.target, "utf8"))) refuse("src/extract.mjs is stale");
    if (!equalSourceBytes(readFileSync(PROVENANCE), Buffer.from(rendered.provenance, "utf8"))) refuse("src/provenance.json is stale");
    process.stdout.write("hypha vendor check: current\n");
    return;
  }

  writeFileSync(TARGET, rendered.target, "utf8");
  writeFileSync(PROVENANCE, rendered.provenance, "utf8");
  process.stdout.write("hypha vendor: updated src/extract.mjs and src/provenance.json\n");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch {
    process.stderr.write("REFUSED: Hypha source-owner input or evidence is invalid\n");
    process.exitCode = 2;
  }
}
