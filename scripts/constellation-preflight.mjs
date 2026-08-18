#!/usr/bin/env node
// Body-free Galerina/SLIDE/VOK/Lyth detached-scalar readiness preflight.

import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  PREFLIGHT_PROFILE,
  PreflightError,
  atomicWriteReport,
  canonicalJson,
  collectConstellationPreflight,
  runPreflightSelfTest,
} from "./lib/constellation-preflight/index.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return { selfTest: true };
  let profile;
  let out;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json" && !json) { json = true; continue; }
    if (["--profile", "--out"].includes(arg) && index + 1 < argv.length) {
      const value = argv[index + 1];
      if (value.startsWith("--") || (arg === "--profile" && profile !== undefined) || (arg === "--out" && out !== undefined)) throw new PreflightError("CLI_ARGUMENT_INVALID", "duplicate or missing CLI value");
      if (arg === "--profile") profile = value; else out = value;
      index += 1;
      continue;
    }
    throw new PreflightError("CLI_ARGUMENT_INVALID", `unsupported argument ${arg}`);
  }
  if (profile !== PREFLIGHT_PROFILE || (!json && out === undefined)) throw new PreflightError("CLI_ARGUMENT_INVALID", "expected --profile detached-scalar and --json or --out");
  return { selfTest: false, profile, out, json };
}

function outputPath(value) {
  if (value === undefined) return undefined;
  if (isAbsolute(value) || value.includes("\\") || value.split("/").some((part) => part === ".." || part.length === 0)) throw new PreflightError("OUTPUT_PATH_INVALID", "output must be one repository-relative slash path");
  const target = resolve(ROOT, ...value.split("/"));
  const rel = relative(ROOT, target);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new PreflightError("OUTPUT_PATH_INVALID", "output escapes the repository");
  return target;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) {
    const result = runPreflightSelfTest();
    process.stdout.write(`${canonicalJson(result)}\n`);
    if (!result.passed) process.exitCode = 2;
    return;
  }
  const out = outputPath(args.out);
  const report = await collectConstellationPreflight({
    galerinaRoot: ROOT,
    slideRoot: resolve(ROOT, "..", "SLIDE"),
    lythRoot: resolve(ROOT, "..", "lyth-weaver"),
    skillRoot: resolve(homedir(), ".agents", "skills"),
    outputRoot: out === undefined ? ROOT : dirname(out),
    projects: {
      galerina: process.env.GALERINA_CONSTELLATION_PROJECT,
      slide: process.env.SLIDE_CONSTELLATION_PROJECT,
      vok: process.env.VOK_CONSTELLATION_PROJECT,
      lyth: process.env.LYTH_CONSTELLATION_PROJECT,
    },
  });
  if (out !== undefined) await atomicWriteReport(out, report);
  if (args.json) process.stdout.write(`${canonicalJson(report)}\n`);
  process.exitCode = report.status === "ALLOW" ? 0 : report.status === "ERROR" ? 2 : 1;
}

try {
  await main();
} catch (error) {
  const code = error instanceof PreflightError ? error.code : "PREFLIGHT_ERROR";
  const message = error instanceof PreflightError ? error.message : "preflight prerequisite or publication failed";
  process.stderr.write(`constellation-preflight: ERROR ${code}: ${message}\n`);
  process.exitCode = 2;
}
