#!/usr/bin/env node
// Analyze canonical Fungi constructs without compiling candidates or releasing authority.

import { execFile as execFileCallback } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  ANALYSIS_COMMANDS,
  LogicAnalysisError,
  analyzeFungiSource,
  atomicWriteAnalysis,
  canonicalAnalysisJson,
  runLogicAnalysisSelfTest,
} from "./lib/fungi-logic-analysis/index.mjs";

const execFile = promisify(execFileCallback);
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function fail(code, message) {
  throw new LogicAnalysisError(code, message);
}

function canonicalParts(value, label) {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\\")) fail("CLI_PATH_INVALID", `${label} must be repository-relative`);
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) fail("CLI_PATH_INVALID", `${label} contains a non-canonical segment`);
  return parts;
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return Object.freeze({ selfTest: true });
  const command = argv[0];
  if (!ANALYSIS_COMMANDS.includes(command)) fail("CLI_COMMAND_INVALID", "expected scan, if, match, check, contract, flow, global, vault or hallmark");
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!["--file", "--out", "--graph-build-point", "--profile"].includes(flag) || value === undefined || value.startsWith("--") || flag in values) {
      fail("CLI_ARGUMENT_INVALID", "expected --file, --out, --graph-build-point and optional --profile");
    }
    values[flag] = value;
  }
  if (values["--file"] === undefined || values["--out"] === undefined || values["--graph-build-point"] === undefined) fail("CLI_ARGUMENT_INVALID", "file, output and graph build point are required");
  const profile = values["--profile"] ?? "dev";
  if (profile !== "dev") fail("CLI_PROFILE_INVALID", "the first analysis profile is dev only");
  return Object.freeze({ selfTest: false, command, file: values["--file"], out: values["--out"], graphBuildPoint: values["--graph-build-point"], profile });
}

async function inputPath(value) {
  const parts = canonicalParts(value, "input");
  if (!value.endsWith(".fungi")) fail("CLI_INPUT_INVALID", "input must be a .fungi file");
  if (value.startsWith("packages-galerina/galerina-test/") || value.includes("/conversion-overlays/")) fail("CLI_INPUT_SCOPE_INVALID", "test overlays are outside construct-analysis credit");
  const root = await realpath(ROOT);
  const path = resolve(root, ...parts);
  const rel = relative(root, path);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("CLI_INPUT_INVALID", "input escapes repository root");
  const stat = await lstat(path).catch(() => null);
  if (stat === null || !stat.isFile() || stat.isSymbolicLink() || await realpath(path) !== path || stat.size < 1 || stat.size > 10 * 1024 * 1024) fail("CLI_INPUT_INVALID", "input must be one bounded regular non-symlink file");
  return path;
}

async function outputPath(value) {
  const parts = canonicalParts(value, "output");
  if (parts[0] !== "build" || parts[1] !== "fungi-logic-analysis" || !value.endsWith(".json")) fail("CLI_OUTPUT_INVALID", "output must be JSON inside build/fungi-logic-analysis");
  const root = await realpath(ROOT);
  const path = resolve(root, ...parts);
  const rel = relative(root, path);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail("CLI_OUTPUT_INVALID", "output escapes repository root");
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = resolve(current, part);
    const stat = await lstat(current).catch(() => null);
    if (stat !== null && (stat.isSymbolicLink() || await realpath(current) !== current)) fail("CLI_OUTPUT_INVALID", "output has a redirected ancestor");
  }
  return path;
}

async function gitHead() {
  const { stdout } = await execFile("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return stdout.trim();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selfTest = runLogicAnalysisSelfTest();
  if (!selfTest.passed) fail("SELF_TEST_FAILED", "construct-analysis self-test failed");
  if (args.selfTest) {
    process.stdout.write(`${canonicalAnalysisJson(selfTest)}\n`);
    return;
  }
  if (!/^[0-9a-f]{40}$/u.test(args.graphBuildPoint) || args.graphBuildPoint !== await gitHead()) fail("GRAPH_BUILD_POINT_STALE", "graph build point must equal the exact repository HEAD");
  const path = await inputPath(args.file);
  const bytes = await readFile(path);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (!Buffer.from(source, "utf8").equals(bytes)) fail("CLI_INPUT_UTF8_INVALID", "input is not canonical UTF-8");
  const result = await analyzeFungiSource({ source, file: args.file, command: args.command, graphBuildPoint: args.graphBuildPoint, profile: args.profile });
  await atomicWriteAnalysis(await outputPath(args.out), result);
  process.stdout.write(`${canonicalAnalysisJson(result)}\n`);
  process.exitCode = result.status === "SUPPORTED" ? 0 : 1;
}

try {
  await main();
} catch (error) {
  const code = error instanceof LogicAnalysisError ? error.code : "LOGIC_ANALYSIS_ERROR";
  const message = error instanceof LogicAnalysisError ? error.message : "construct analysis failed";
  process.stderr.write(`fungi-logic-analysis: ERROR ${code}: ${message}\n`);
  process.exitCode = 2;
}
