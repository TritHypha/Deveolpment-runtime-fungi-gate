#!/usr/bin/env node
import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateLegacyLifecycle } from "./lib/assurance-fabric/legacy-lifecycle.mjs";
import { validateAssuranceManifest } from "./lib/assurance-fabric/manifest.mjs";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";

const SCRIPT_ROOT = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_ROOT, "..");
const MAX_BYTES = 67_108_864;

function parseArguments(argv) {
  if (argv.length === 1 && argv[0] === "--self-test") return { kind: "self-test" };
  if (argv.length === 2 && argv[0] === "--root" && !argv[1].startsWith("--")) {
    return { kind: "root", root: resolve(argv[1]) };
  }
  if (argv.length === 0) return { kind: "root", root: DEFAULT_ROOT };
  throw new Error("usage: audit-assurance-legacy-lifecycle.mjs [--root <path> | --self-test]");
}

function inside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!isAbsolute(rel) && rel !== ".." && !rel.startsWith(`..\\`) && !rel.startsWith("../"));
}

function readJson(root, relativePath) {
  const path = resolve(root, ...relativePath.split("/"));
  if (!inside(root, path)) throw new Error(`${relativePath} escapes root`);
  const real = realpathSync(path);
  if (!inside(root, real) || !statSync(real).isFile()) throw new Error(`${relativePath} is not an admitted regular file`);
  const bytes = readFileSync(real);
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_BYTES) throw new Error(`${relativePath} is outside byte bounds`);
  return parseStrictJsonBytes(bytes, { label: relativePath, maxBytes: MAX_BYTES });
}

function activeEntry(id) {
  return {
    id,
    requirementId: `REQ-${id.toUpperCase()}`,
    satisfies: [`REQ-${id.toUpperCase()}`],
    execution: { kind: "process", command: ["node", `${id}.mjs`] },
    cwd: ".",
    toolClass: "legacy-oracle",
    authorityClass: "legacy-oracle",
    cadences: ["normal"],
    outcomePolicy: "legacy-exit",
    subjects: { kind: "requirements", values: [`REQ-${id.toUpperCase()}`], expectedCount: 1 },
    timeoutMs: 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "absent", reason: "self-test fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "live consumer remains" },
      overlap: "canonical",
      retirement: "active",
      evidence: { kind: "absent", reason: "zero-consumer evidence absent" },
    },
  };
}

function selfTest() {
  const validated = validateAssuranceManifest({
    schemaVersion: 1,
    entries: [activeEntry("wat"), activeEntry("wasm"), activeEntry("dss")],
  }, DEFAULT_ROOT);
  if (validated.kind !== "accepted") throw new Error(validated.detail);
  const common = {
    manifest: validated.value,
    semanticGraph: { nodes: [], edges: [] },
    retirementReport: { terminalReady: false },
    evidenceDag: { nodes: [] },
  };
  const clean = evaluateLegacyLifecycle({
    ...common,
    toolInventory: {
      legacyConsumers: [
        { controlId: "wat", consumerIds: ["bootstrap"] },
        { controlId: "wasm", consumerIds: ["differential"] },
        { controlId: "dss", consumerIds: ["oracle"] },
      ],
    },
  });
  const hostile = evaluateLegacyLifecycle({
    ...common,
    toolInventory: { legacyConsumers: [] },
  });
  if (clean.kind !== "accepted" || clean.authorizing !== false
      || clean.controls.length !== 3 || hostile.kind !== "refused") {
    throw new Error("active-control or missing-consumer direction did not fail closed");
  }
  process.stdout.write("assurance-legacy-lifecycle self-test: PASS (active + missing-consumer refusal)\n");
}

function audit(rootValue) {
  const root = realpathSync(rootValue);
  if (!statSync(root).isDirectory()) throw new Error("root is not a directory");
  const manifestRaw = readJson(root, "governance/phase-close-commands.json");
  const manifest = validateAssuranceManifest(manifestRaw, root);
  if (manifest.kind !== "accepted") throw new Error(`${manifest.code}: ${manifest.detail}`);
  const result = evaluateLegacyLifecycle({
    manifest: manifest.value,
    toolInventory: readJson(root, "build/dev-tool-index/index.json"),
    semanticGraph: readJson(root, "build/assurance-semantic-graph/semantic-graph.json"),
    retirementReport: readJson(root, "build/ts-retirement/ts-retirement.json"),
    evidenceDag: readJson(root, "governance/assurance-evidence-dependencies.json"),
  });
  if (result.kind !== "accepted") throw new Error(`${result.code}: ${result.controlId}: ${result.detail}`);
  process.stdout.write(`SUMMARY: ${result.controls.length} legacy controls exact; authority K3 0\n`);
}

try {
  const options = parseArguments(process.argv.slice(2));
  if (options.kind === "self-test") selfTest();
  else audit(options.root);
} catch (error) {
  process.stderr.write(`audit-assurance-legacy-lifecycle: REFUSED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
