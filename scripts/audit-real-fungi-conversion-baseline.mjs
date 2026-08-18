#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

import {
  BASELINE_SCHEMA,
  classifyFungiBaseline,
} from "./lib/real-fungi-conversion-baseline/core.mjs";

const MAX_BUFFER = 256 * 1024 * 1024;
const ORACLE = /^\/\/\/ TypeScript oracle: (packages-galerina\/[A-Za-z0-9._/-]+\.(?:ts|mts|cts))#([A-Za-z_$][A-Za-z0-9_$.]*)$/mu;

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function runGit(root, args, { allowFailure = false, encoding = "utf8" } = {}) {
  const result = spawnSync("git", args, { cwd: root, encoding, maxBuffer: MAX_BUFFER, windowsHide: true });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`GIT_COMMAND_FAILED: ${(result.stderr || result.stdout || "git command failed").toString().trim()}`);
  }
  return result;
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return Object.freeze({ selfTest: true });
  const checkCount = argv.filter((argument) => argument === "--check").length;
  const currentOnlyCount = argv.filter((argument) => argument === "--check-current").length;
  if (checkCount > 1) throw new Error("CLI_ARGUMENT_INVALID: --check may appear once");
  if (currentOnlyCount > 1) throw new Error("CLI_ARGUMENT_INVALID: --check-current may appear once");
  if (checkCount > 0 && currentOnlyCount > 0) throw new Error("CLI_ARGUMENT_INVALID: --check and --check-current are mutually exclusive");
  const check = checkCount === 1 || currentOnlyCount === 1;
  const checkCurrent = currentOnlyCount === 1;
  const values = argv.filter((argument) => argument !== "--check" && argument !== "--check-current");
  let root = resolve(import.meta.dirname, "..");
  let out;
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    const value = values[index + 1];
    if ((key !== "--root" && key !== "--out") || typeof value !== "string") {
      throw new Error("CLI_ARGUMENT_INVALID: usage: audit-real-fungi-conversion-baseline [--root path] --out repo-relative.json | --self-test");
    }
    if (key === "--root") root = resolve(value);
    else out = value;
  }
  if (typeof out !== "string" || out.length === 0 || out.includes("\\") || isAbsolute(out) || /^[A-Za-z]:\//u.test(out) || out.startsWith("../")) {
    throw new Error("OUTPUT_PATH_INVALID: --out must be a repository-relative JSON path");
  }
  return Object.freeze({ selfTest: false, root, out, check, checkCurrent });
}

function contained(root, target) {
  const rel = relative(root, target);
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function trackedAndUntrackedFungi(root) {
  const output = runGit(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", "*.fungi"], { encoding: null }).stdout;
  return output.toString("utf8").split("\0").filter(Boolean).sort();
}

function introductionMap(root) {
  const output = runGit(root, ["log", "--all", "--reverse", "--diff-filter=A", "--format=@@%H", "--name-only", "--", "*.fungi"]).stdout;
  const introductions = new Map();
  let commit;
  for (const line of output.split(/\r?\n/u)) {
    if (line.startsWith("@@")) {
      commit = line.slice(2);
      continue;
    }
    if (line.endsWith(".fungi") && /^[0-9a-f]{40}$/u.test(commit ?? "") && !introductions.has(line)) introductions.set(line, commit);
  }
  return introductions;
}

function readFungi(root, paths, introductions) {
  return paths.map((path) => {
    const target = resolve(root, ...path.split("/"));
    if (!contained(root, target)) throw new Error(`FUNGI_PATH_ESCAPE: ${path}`);
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`FUNGI_IDENTITY_INVALID: ${path}`);
    return Object.freeze({
      path,
      source: readFileSync(target, "utf8"),
      introducedCommit: introductions.get(path) ?? "0".repeat(40),
    });
  });
}

function gitBlob(root, commit, path) {
  const result = runGit(root, ["show", `${commit}:${path}`], { allowFailure: true, encoding: null });
  return result.status === 0 ? result.stdout : undefined;
}

function sourceStates(root, fungi) {
  const states = new Map();
  for (const item of fungi) {
    const match = ORACLE.exec(item.source);
    if (match === null) continue;
    const path = match[1];
    const symbol = match[2];
    const identity = `${path}#${symbol}`;
    if (states.has(identity)) continue;
    const target = resolve(root, ...path.split("/"));
    if (!contained(root, target) || !existsSync(target)) {
      states.set(identity, Object.freeze({ present: false, symbolPresent: false }));
      continue;
    }
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      states.set(identity, Object.freeze({ present: false, symbolPresent: false }));
      continue;
    }
    const current = readFileSync(target);
    const introduced = gitBlob(root, item.introducedCommit, path);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(current);
    const terminal = symbol.split(".").at(-1);
    const symbolPresent = typeof terminal === "string" && new RegExp(`\\b${terminal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "u").test(text);
    states.set(identity, Object.freeze({
      present: true,
      symbolPresent,
      currentSha256: sha256(current),
      introducedSha256: introduced === undefined ? undefined : sha256(introduced),
    }));
  }
  return states;
}

function atomicWrite(root, relativePath, bytes) {
  const target = resolve(root, ...relativePath.split("/"));
  if (!contained(root, target)) throw new Error("OUTPUT_PATH_ESCAPE: report escapes repository root");
  if (existsSync(target)) throw new Error("REPORT_EXISTS: output report already exists");
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.partial-${process.pid}`;
  writeFileSync(temporary, bytes, { encoding: "utf8", flag: "wx" });
  if (existsSync(target)) throw new Error("REPORT_EXISTS: output report appeared during publication");
  renameSync(temporary, target);
}

function checkReport(root, relativePath, expected) {
  const target = resolve(root, ...relativePath.split("/"));
  if (!contained(root, target) || !existsSync(target)) return false;
  const stat = lstatSync(target);
  return stat.isFile() && !stat.isSymbolicLink() && readFileSync(target, "utf8") === expected;
}

function admittedReportHead(root, relativePath) {
  const target = resolve(root, ...relativePath.split("/"));
  if (!contained(root, target) || !existsSync(target)) return undefined;
  const stat = lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) return undefined;
  try {
    const report = JSON.parse(readFileSync(target, "utf8"));
    return report?.schema === BASELINE_SCHEMA && /^[0-9a-f]{40}$/u.test(report?.head)
      ? report.head
      : undefined;
  } catch {
    return undefined;
  }
}

function runSelfTest() {
  const head = "a".repeat(40);
  const sourceDigest = "sha256:" + "1".repeat(64);
  const source = `@version 1\n/// Non-authorizing sandbox candidate; TypeScript remains the oracle.\n/// TypeScript oracle: packages-galerina/p/src/x.ts#X\npure flow x() -> Int { return 1 }\n`;
  const report = classifyFungiBaseline({
    head,
    fungi: [{ path: "packages-galerina/p/src/self-hosted/x.fungi", source, introducedCommit: "b".repeat(40) }],
    sourceStates: new Map([["packages-galerina/p/src/x.ts#X", { present: true, symbolPresent: true, currentSha256: sourceDigest, introducedSha256: sourceDigest }]]),
  });
  if (report.schema !== BASELINE_SCHEMA || report.counts.BOUND !== 1) throw new Error("SELF_TEST_GREEN_FAILED");
  let red = false;
  try {
    classifyFungiBaseline({ head, fungi: [{ path: "../x.fungi", source, introducedCommit: "b".repeat(40) }], sourceStates: new Map() });
  } catch {
    red = true;
  }
  if (!red) throw new Error("SELF_TEST_RED_FAILED");
}

try {
  const options = parseArgs(process.argv.slice(2));
  runSelfTest();
  if (options.selfTest) {
    process.stdout.write("real-fungi-conversion-baseline: self-test ALLOW\n");
  } else {
    const root = resolve(options.root);
    const currentHead = runGit(root, ["rev-parse", "HEAD"]).stdout.trim();
    const head = options.check ? admittedReportHead(root, options.out) ?? currentHead : currentHead;
    const paths = trackedAndUntrackedFungi(root);
    const fungi = readFungi(root, paths, introductionMap(root));
    const report = classifyFungiBaseline({ head, fungi, sourceStates: sourceStates(root, fungi) });
    const encoded = `${canonicalJson(report)}\n`;
    if (options.check) {
      if (!checkReport(root, options.out, encoded)) {
        process.stdout.write("real-fungi-conversion-baseline: HOLD; report stale or missing\n");
        process.exitCode = 1;
      }
    } else {
      atomicWrite(root, options.out, encoded);
    }
    const findings = report.counts.UNBOUND + report.counts.STALE + report.counts.SHADOWED;
    if (!options.check || process.exitCode !== 1) {
      process.stdout.write(`real-fungi-conversion-baseline: ${findings === 0 ? "ALLOW" : "HOLD"}; ${options.check ? "report current; " : ""}real=${report.counts.realPackageFungi}; overlays=${report.counts.excludedTestOverlays}; bound=${report.counts.BOUND}; unbound=${report.counts.UNBOUND}; stale=${report.counts.STALE}; shadowed=${report.counts.SHADOWED}\n`);
      if (findings > 0 && !options.checkCurrent) process.exitCode = 1;
    }
  }
} catch (error) {
  process.stderr.write(`real-fungi-conversion-baseline: ERROR ${error instanceof Error ? error.message : "unknown failure"}\n`);
  process.exitCode = 2;
}
