#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import { classifyTypeScriptSource } from "./lib/ts-to-fungi-sandbox/classifier.mjs";
import { BASELINE_SCHEMA } from "./lib/real-fungi-conversion-baseline/core.mjs";
import { evaluateDriftReport } from "./lib/ts-fungi-drift/core.mjs";

const MAX_BUFFER = 128 * 1024 * 1024;
const ZERO_DIGEST = `sha256:${"0".repeat(64)}`;

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function runGit(root, args, { allowFailure = false, encoding = null } = {}) {
  const result = spawnSync("git", args, { cwd: root, encoding, maxBuffer: MAX_BUFFER, windowsHide: true });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`GIT_COMMAND_FAILED: ${(result.stderr || result.stdout || "git command failed").toString().trim()}`);
  }
  return result;
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return Object.freeze({ selfTest: true });
  const checkCount = argv.filter((argument) => argument === "--check").length;
  if (checkCount > 1) throw new Error("CLI_ARGUMENT_INVALID: --check may appear once");
  const check = checkCount === 1;
  const values = argv.filter((argument) => argument !== "--check");
  let root = resolve(import.meta.dirname, "..");
  let baseline;
  let out;
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if (!new Set(["--root", "--baseline", "--out"]).has(key) || typeof value !== "string") {
      throw new Error("CLI_ARGUMENT_INVALID: usage: audit-ts-fungi-drift [--root path] --baseline repo-relative.json --out repo-relative.json | --self-test");
    }
    if (key === "--root") root = resolve(value);
    else if (key === "--baseline") baseline = value;
    else out = value;
  }
  for (const [label, value] of [["baseline", baseline], ["out", out]]) {
    if (typeof value !== "string" || value.length === 0 || value.includes("\\") || isAbsolute(value) || /^[A-Za-z]:\//u.test(value) || value.startsWith("../")) {
      throw new Error(`${label.toUpperCase()}_PATH_INVALID: ${label} must be repository-relative`);
    }
  }
  return Object.freeze({ selfTest: false, root, baseline, out, check });
}

function contained(root, target) {
  const rel = relative(root, target);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function readRegular(root, path) {
  const target = resolve(root, ...path.split("/"));
  if (!contained(root, target) || !existsSync(target)) return undefined;
  const stat = lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
  return readFileSync(target);
}

function gitBlob(root, commit, path) {
  const result = runGit(root, ["show", `${commit}:${path}`], { allowFailure: true });
  return result.status === 0 ? result.stdout : undefined;
}

function classificationFingerprint(bytes, file, symbol) {
  if (bytes === undefined) return undefined;
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
  let classification;
  try {
    classification = classifyTypeScriptSource({ source, file, symbol });
  } catch {
    return undefined;
  }
  if (classification.reason === "expected one declaration, found 0") return undefined;
  const semantic = {
    outcome: classification.outcome,
    complete: classification.complete,
    blockers: classification.blockers,
    kind: classification.kind,
    value: classification.value,
    parameters: classification.parameters,
    returnType: classification.returnType,
    operators: classification.operators,
    inventory: classification.inventory,
    reason: classification.reason,
  };
  return sha256(Buffer.from(canonicalJson(semantic), "utf8"));
}

function loadBaseline(root, path) {
  const bytes = readRegular(root, path);
  if (bytes === undefined) throw new Error("BASELINE_MISSING: baseline report is unavailable");
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("BASELINE_JSON_INVALID: baseline is not one JSON value");
  }
  if (value?.schema !== BASELINE_SCHEMA || !Array.isArray(value.entries)) throw new Error("BASELINE_SCHEMA_INVALID: baseline has the wrong schema");
  return value;
}

function bindingsFromBaseline(root, baseline) {
  return baseline.entries
    .filter((entry) => entry?.role === "CONVERSION_CANDIDATE" && entry.oracle?.malformed !== true)
    .map((entry) => {
      const candidateCurrent = readRegular(root, entry.path);
      const candidateRecorded = gitBlob(root, entry.introducedCommit, entry.path);
      const sourceCurrent = readRegular(root, entry.oracle.path);
      const sourceRecorded = gitBlob(root, entry.introducedCommit, entry.oracle.path);
      const recordedSymbolFingerprint = classificationFingerprint(sourceRecorded, entry.oracle.path, entry.oracle.symbol);
      const currentSymbolFingerprint = classificationFingerprint(sourceCurrent, entry.oracle.path, entry.oracle.symbol);
      const symbolPresent = recordedSymbolFingerprint !== undefined && currentSymbolFingerprint !== undefined;
      return Object.freeze({
        path: entry.path,
        sourcePath: entry.oracle.path,
        symbol: entry.oracle.symbol,
        provenance: "RECONSTRUCTED",
        candidateRecordedSha256: candidateRecorded === undefined ? ZERO_DIGEST : sha256(candidateRecorded),
        candidateCurrentSha256: candidateCurrent === undefined ? ZERO_DIGEST : sha256(candidateCurrent),
        sourceRecordedSha256: sourceRecorded === undefined ? ZERO_DIGEST : sha256(sourceRecorded),
        sourceCurrentSha256: sourceCurrent === undefined ? ZERO_DIGEST : sha256(sourceCurrent),
        symbolRecordedFingerprint: recordedSymbolFingerprint,
        symbolCurrentFingerprint: currentSymbolFingerprint,
        symbolPresent,
        chain: [],
      });
    });
}

function atomicWrite(root, path, text) {
  const target = resolve(root, ...path.split("/"));
  if (!contained(root, target)) throw new Error("OUTPUT_PATH_ESCAPE: report escapes repository root");
  if (existsSync(target)) throw new Error("REPORT_EXISTS: output report already exists");
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.partial-${process.pid}`;
  writeFileSync(temporary, text, { encoding: "utf8", flag: "wx" });
  if (existsSync(target)) throw new Error("REPORT_EXISTS: output report appeared during publication");
  renameSync(temporary, target);
}

function checkReport(root, path, expected) {
  const target = resolve(root, ...path.split("/"));
  if (!contained(root, target) || !existsSync(target)) return false;
  const stat = lstatSync(target);
  return stat.isFile() && !stat.isSymbolicLink() && readFileSync(target, "utf8") === expected;
}

function selfTest() {
  const digest = (character) => `sha256:${character.repeat(64)}`;
  const base = {
    path: "packages-galerina/p/src/self-hosted/x.fungi",
    sourcePath: "packages-galerina/p/src/x.ts",
    symbol: "X",
    provenance: "RECONSTRUCTED",
    candidateRecordedSha256: digest("a"),
    candidateCurrentSha256: digest("a"),
    sourceRecordedSha256: digest("b"),
    sourceCurrentSha256: digest("b"),
    symbolRecordedFingerprint: digest("c"),
    symbolCurrentFingerprint: digest("c"),
    symbolPresent: true,
    chain: [],
  };
  const green = evaluateDriftReport({ head: "f".repeat(40), bindings: [base] });
  const red = evaluateDriftReport({ head: "f".repeat(40), bindings: [{ ...base, candidateCurrentSha256: digest("d") }] });
  if (green.counts.NO_DRIFT !== 1 || red.counts.CANDIDATE_BYTE_DRIFT !== 1) throw new Error("SELF_TEST_FAILED");
}

try {
  const options = parseArgs(process.argv.slice(2));
  selfTest();
  if (options.selfTest) {
    process.stdout.write("ts-fungi-drift: self-test ALLOW\n");
  } else {
    const root = resolve(options.root);
    const head = runGit(root, ["rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
    const baseline = loadBaseline(root, options.baseline);
    const report = evaluateDriftReport({ head, bindings: bindingsFromBaseline(root, baseline) });
    const encoded = `${canonicalJson(report)}\n`;
    if (options.check) {
      if (!checkReport(root, options.out, encoded)) {
        process.stdout.write("ts-fungi-drift: HOLD; report stale or missing\n");
        process.exitCode = 1;
      }
    } else {
      atomicWrite(root, options.out, encoded);
    }
    const findings = report.counts.total - report.counts.NO_DRIFT;
    if (!options.check || process.exitCode !== 1 || checkReport(root, options.out, encoded)) {
      process.stdout.write(`ts-fungi-drift: ${findings === 0 ? "ALLOW" : "HOLD"}; ${options.check ? "report current; " : ""}total=${report.counts.total}; noDrift=${report.counts.NO_DRIFT}; source=${report.counts.SOURCE_BYTE_DRIFT}; symbol=${report.counts.SYMBOL_DRIFT}; candidate=${report.counts.CANDIDATE_BYTE_DRIFT}; chain=${report.counts.CHAIN_DRIFT}; unbound=${report.counts.UNBOUND}\n`);
      if (findings > 0) process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`ts-fungi-drift: ERROR ${error instanceof Error ? error.message : "unknown failure"}\n`);
  process.exitCode = 2;
}
