#!/usr/bin/env node
// Grade a bounded real-package TypeScript-to-Fungi batch without releasing authority.

import { lstat, readFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";
import {
  ConversionGateError,
  atomicWriteRunCard,
  canonicalJson,
  collectConversionGateRun,
  runConversionGateSelfTest,
} from "./lib/fungi-conversion-gate/index.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function cliError(code, message) {
  throw new ConversionGateError(code, message);
}

function parseArgs(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return Object.freeze({ selfTest: true });
  let manifest;
  let out;
  let finalTailException = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--final-tail" && !finalTailException) {
      finalTailException = true;
      continue;
    }
    if (!["--manifest", "--out"].includes(arg) || index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
      cliError("CLI_ARGUMENT_INVALID", "expected --manifest <json> --out <json> and optional --final-tail");
    }
    if ((arg === "--manifest" && manifest !== undefined) || (arg === "--out" && out !== undefined)) cliError("CLI_ARGUMENT_INVALID", "duplicate CLI argument");
    if (arg === "--manifest") manifest = argv[index + 1]; else out = argv[index + 1];
    index += 1;
  }
  if (manifest === undefined || out === undefined) cliError("CLI_ARGUMENT_INVALID", "expected --manifest <json> --out <json>");
  return Object.freeze({ selfTest: false, manifest, out, finalTailException });
}

function canonicalParts(value, label) {
  if (typeof value !== "string" || value.length === 0 || isAbsolute(value) || value.includes("\\")) cliError("CLI_PATH_INVALID", `${label} must be repository-relative`);
  const parts = value.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) cliError("CLI_PATH_INVALID", `${label} is not canonical`);
  return parts;
}

async function inputPath(value) {
  const parts = canonicalParts(value, "manifest");
  if (!value.endsWith(".json")) cliError("CLI_PATH_INVALID", "manifest must be JSON");
  const path = resolve(ROOT, ...parts);
  const stat = await lstat(path).catch(() => null);
  if (stat === null || !stat.isFile() || stat.isSymbolicLink() || await realpath(path) !== path) cliError("CLI_INPUT_INVALID", "manifest must be an existing regular file");
  return path;
}

async function outputPath(value) {
  const parts = canonicalParts(value, "output");
  if (parts[0] !== "build" || parts[1] !== "fungi-conversion-gate" || !value.endsWith(".json")) cliError("CLI_PATH_INVALID", "output must be JSON inside build/fungi-conversion-gate");
  const root = await realpath(ROOT);
  const path = resolve(root, ...parts);
  const rel = relative(root, path);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) cliError("CLI_PATH_INVALID", "output escapes repository root");
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = resolve(current, part);
    const stat = await lstat(current).catch(() => null);
    if (stat !== null && (stat.isSymbolicLink() || await realpath(current) !== current)) cliError("CLI_OUTPUT_REDIRECTED", "output has a redirected ancestor");
  }
  return path;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const selfTest = runConversionGateSelfTest();
  if (!selfTest.passed) cliError("SELF_TEST_FAILED", "conversion gate self-test failed");
  if (args.selfTest) {
    process.stdout.write(`${canonicalJson(selfTest)}\n`);
    return;
  }
  const manifestPath = await inputPath(args.manifest);
  const out = await outputPath(args.out);
  const manifest = parseStrictJsonBytes(await readFile(manifestPath), { label: "conversion gate manifest", maxBytes: 1024 * 1024 });
  const card = await collectConversionGateRun({
    root: ROOT,
    slideRoot: resolve(ROOT, "..", "SLIDE"),
    lythRoot: resolve(ROOT, "..", "lyth-weaver"),
    skillRoot: resolve(homedir(), ".agents", "skills"),
    manifest,
    outputRoot: dirname(out),
    finalTailException: args.finalTailException,
    projects: {
      slide: process.env.SLIDE_CONSTELLATION_PROJECT,
      vok: process.env.VOK_CONSTELLATION_PROJECT,
      lyth: process.env.LYTH_CONSTELLATION_PROJECT,
    },
  });
  await atomicWriteRunCard(out, card);
  process.stdout.write(`${canonicalJson(card)}\n`);
  process.exitCode = card.status === "ALLOW" ? 0 : card.status === "ERROR" ? 2 : 1;
}

try {
  await main();
} catch (error) {
  const code = error instanceof ConversionGateError ? error.code : "CONVERSION_GATE_ERROR";
  const message = error instanceof ConversionGateError ? error.message : "conversion gate prerequisite or publication failed";
  process.stderr.write(`fungi-conversion-gate: ERROR ${code}: ${message}\n`);
  process.exitCode = 2;
}
