#!/usr/bin/env node
// Verify the Galerina Myco snapshot against its public source owner.
//
//   node scripts/audit-public-source-owner.mjs [--upstream <repo>] [--json]
//   node scripts/audit-public-source-owner.mjs --self-test
//
// Exit 0: declared exact/partial-fork state reproduced.
// Exit 1: source-owner drift or metadata mismatch.
// Exit 2: refused because the owner repository/build point could not be verified.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_UPSTREAM = resolve(PACKAGE_ROOT, "..", "..", "..", "subprojects", "myco");
const CHILD_TIMEOUT_MS = 30_000;
const CHILD_MAX_BUFFER = 4 * 1024 * 1024;
const MAX_SOURCE_FILES = 128;
const MAX_SOURCE_DEPTH = 8;

function normalize(paths) {
  return [...paths].sort((a, b) => a.localeCompare(b));
}

export function compareSnapshot(actual, expected) {
  const normalized = {
    upstreamFileCount: actual.upstreamPaths.length,
    exactFileCount: actual.exactPaths.length,
    divergentPaths: normalize(actual.divergentPaths),
    missingPaths: normalize(actual.missingPaths),
    localOnlyPaths: normalize(actual.localOnlyPaths),
  };
  const declared = {
    upstreamFileCount: expected.upstreamFileCount,
    exactFileCount: expected.exactFileCount,
    divergentPaths: normalize(expected.divergentPaths),
    missingPaths: normalize(expected.missingPaths),
    localOnlyPaths: normalize(expected.localOnlyPaths),
  };
  const findings = [];
  for (const key of Object.keys(declared)) {
    if (JSON.stringify(normalized[key]) !== JSON.stringify(declared[key])) {
      findings.push({ code: "PROVENANCE_DRIFT", field: key, declared: declared[key], actual: normalized[key] });
    }
  }
  return { actual: normalized, findings };
}

function git(repo, args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: repo,
    encoding,
    timeout: CHILD_TIMEOUT_MS,
    maxBuffer: CHILD_MAX_BUFFER,
    windowsHide: true,
  });
}

function localSourcePaths(root) {
  const paths = [];
  const visit = (dir, depth) => {
    if (depth > MAX_SOURCE_DEPTH) throw new Error("source depth exceeds " + MAX_SOURCE_DEPTH);
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = resolve(dir, entry.name);
      if (entry.isDirectory() && entry.name !== ".myco") visit(absolute, depth + 1);
      else if (entry.isFile()) {
        paths.push(relative(root, absolute).split(sep).join("/"));
        if (paths.length > MAX_SOURCE_FILES) throw new Error("source file count exceeds " + MAX_SOURCE_FILES);
      }
    }
  };
  visit(resolve(root, "src"), 0);
  return normalize(paths);
}

function reproduce(upstream, commit) {
  const upstreamPaths = git(upstream, ["ls-tree", "-r", "--name-only", commit, "--", "src"])
    .split(/\r?\n/u).filter(Boolean).sort((a, b) => a.localeCompare(b));
  if (!upstreamPaths.length) throw new Error("upstream snapshot has no src files");
  if (upstreamPaths.length > MAX_SOURCE_FILES) throw new Error("upstream source file count exceeds " + MAX_SOURCE_FILES);

  const localPaths = localSourcePaths(PACKAGE_ROOT);
  const localSet = new Set(localPaths);
  const upstreamSet = new Set(upstreamPaths);
  const exactPaths = [];
  const divergentPaths = [];
  const missingPaths = [];

  for (const path of upstreamPaths) {
    const local = resolve(PACKAGE_ROOT, path);
    if (!localSet.has(path) || !existsSync(local)) {
      missingPaths.push(path);
      continue;
    }
    const upstreamBytes = git(upstream, ["show", commit + ":" + path], null);
    const localBytes = readFileSync(local);
    (Buffer.compare(upstreamBytes, localBytes) === 0 ? exactPaths : divergentPaths).push(path);
  }

  return {
    upstreamPaths,
    exactPaths,
    divergentPaths,
    missingPaths,
    localOnlyPaths: localPaths.filter((path) => !upstreamSet.has(path)),
  };
}

function selfTest(log = console.log) {
  const expected = {
    upstreamFileCount: 2,
    exactFileCount: 1,
    divergentPaths: ["src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  };
  const pass = compareSnapshot({
    upstreamPaths: ["src/a.ts", "src/b.ts"],
    exactPaths: ["src/a.ts"],
    divergentPaths: ["src/b.ts"],
    missingPaths: [],
    localOnlyPaths: ["src/local.ts"],
  }, expected).findings.length === 0;
  log("audit-public-source-owner self-test: " + (pass ? "OK" : "FAILED"));
  return pass;
}

function main(argv) {
  if (argv.includes("--self-test")) return selfTest() ? 0 : 1;
  const json = argv.includes("--json");
  if (!selfTest(json ? console.error : console.log)) return 2;
  const upstreamIndex = argv.indexOf("--upstream");
  const upstream = upstreamIndex >= 0 ? resolve(argv[upstreamIndex + 1] ?? "") : DEFAULT_UPSTREAM;
  if (!existsSync(upstream)) {
    console.error("REFUSED: public Myco source owner not found: " + upstream);
    return 2;
  }
  try {
    const pkg = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8"));
    const vendor = pkg.galerinaVendor;
    if (!vendor || vendor.snapshotStatus?.kind !== "PARTIAL_FORK") {
      console.error("REFUSED: package metadata has no machine-readable PARTIAL_FORK declaration");
      return 2;
    }
    git(upstream, ["cat-file", "-e", vendor.upstreamSnapshotCommit + "^{commit}"]);
    const result = compareSnapshot(reproduce(upstream, vendor.upstreamSnapshotCommit), vendor.snapshotStatus);
    const payload = {
      publicSourceOwner: vendor.publicSourceOwner,
      upstreamSnapshotCommit: vendor.upstreamSnapshotCommit,
      upstream,
      ...result,
    };
    if (json) console.log(JSON.stringify(payload, null, 2));
    else {
      for (const finding of result.findings) console.log("  " + finding.code + " " + finding.field);
      console.log("public-source-owner audit: " + (result.findings.length ? "DRIFT" : "CLEAN (declared partial fork reproduced)"));
    }
    return result.findings.length ? 1 : 0;
  } catch (error) {
    console.error("REFUSED: " + error.message);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
