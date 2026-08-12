#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseStrictJsonBytes } from "./lib/assurance-fabric/strict-json.mjs";

const CLASSIFICATIONS = [
  "CANDIDATE",
  "BLOCKED",
  "NO_RUNTIME_BEHAVIOR",
  "SUPERSEDED_BY_EXISTING_FUNGI",
  "BOOTSTRAP_FLOOR",
];
const DECISION_FIELDS = ["classification", "evidenceDigest", "path", "reason"];
const DIGEST = /^[0-9a-f]{64}$/u;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseArgs(argv) {
  let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  let mode = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write" || arg === "--check") {
      if (mode !== null) throw new Error("choose exactly one of --write or --check");
      mode = arg;
    } else if (arg === "--root" && index + 1 < argv.length) {
      root = resolve(argv[++index]);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (mode === null) throw new Error("choose exactly one of --write or --check");
  return { root, mode };
}

function exactRecord(value, fields) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Object.keys(descriptors).sort();
  return keys.length === fields.length
    && keys.every((key, index) => key === fields[index]
      && descriptors[key]?.enumerable === true
      && descriptors[key]?.get === undefined
      && descriptors[key]?.set === undefined);
}

function loadInputs(root) {
  const retirementPath = join(root, "build", "ts-retirement", "ts-retirement.json");
  const decisionsPath = join(root, "governance", "conversion-queue-decisions.json");
  const retirementBytes = readFileSync(retirementPath);
  const decisionsBytes = readFileSync(decisionsPath);
  const retirement = parseStrictJsonBytes(retirementBytes, { label: "ts-retirement.json", maxBytes: 8_388_608 });
  const decisions = parseStrictJsonBytes(decisionsBytes, { label: "conversion-queue-decisions.json", maxBytes: 1_048_576 });
  if (!Array.isArray(retirement.allTrackedExecutablePaths)
      || !Array.isArray(retirement.retirementLedger)
      || !Array.isArray(retirement.twinnedPairs)
      || retirement.allTrackedExecutablePaths.length !== retirement.retirementLedger.length) {
    throw new Error("retirement graph does not conserve executable-family paths");
  }
  if (!exactRecord(decisions, ["decisions", "schemaVersion"])
      || decisions.schemaVersion !== 1
      || !Array.isArray(decisions.decisions)) {
    throw new Error("invalid conversion queue decisions root");
  }
  return { retirement, decisions: decisions.decisions, retirementBytes, decisionsBytes };
}

function deriveQueue(root) {
  const { retirement, decisions, retirementBytes, decisionsBytes } = loadInputs(root);
  const paths = retirement.allTrackedExecutablePaths;
  if (paths.some((path) => typeof path !== "string")
      || new Set(paths).size !== paths.length
      || paths.some((path, index) => retirement.retirementLedger[index]?.path !== path)) {
    throw new Error("retirement ledger path identity is not exact");
  }
  const pathSet = new Set(paths);
  const decisionMap = new Map();
  for (const decision of decisions) {
    if (!exactRecord(decision, DECISION_FIELDS)
        || typeof decision.path !== "string"
        || !pathSet.has(decision.path)
        || decisionMap.has(decision.path)
        || !CLASSIFICATIONS.slice(0, 4).includes(decision.classification)
        || typeof decision.reason !== "string"
        || !/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/u.test(decision.reason)
        || !DIGEST.test(decision.evidenceDigest)) {
      throw new Error("invalid, duplicate or unknown conversion decision");
    }
    decisionMap.set(decision.path, decision);
  }
  const twins = new Set(retirement.twinnedPairs);
  const entries = paths.map((path, index) => {
    const ledger = retirement.retirementLedger[index];
    const floor = ledger.dependencyTranche === "T0-compiler" || ledger.declaredFloor === "bounded-bootstrap-floor";
    const decision = decisionMap.get(path);
    if (floor && decision !== undefined) throw new Error(`bootstrap floor override refused: ${path}`);
    if (floor) {
      return { path, package: ledger.package, tranche: ledger.dependencyTranche, classification: "BOOTSTRAP_FLOOR", reason: "FIXPOINT_OR_PLATFORM_EVIDENCE_REQUIRED", evidenceDigest: null };
    }
    if (decision !== undefined) {
      return { path, package: ledger.package, tranche: ledger.dependencyTranche, classification: decision.classification, reason: decision.reason, evidenceDigest: decision.evidenceDigest };
    }
    return {
      path,
      package: ledger.package,
      tranche: ledger.dependencyTranche,
      classification: "BLOCKED",
      reason: twins.has(path) ? "EXISTING_FUNGI_NOT_CONSUMER_AUTHORITY" : "DOSSIER_REQUIRED",
      evidenceDigest: null,
    };
  });
  const counts = { total: entries.length };
  for (const classification of CLASSIFICATIONS) counts[classification] = entries.filter((entry) => entry.classification === classification).length;
  if (CLASSIFICATIONS.reduce((sum, classification) => sum + counts[classification], 0) !== counts.total) {
    throw new Error("conversion queue classification is not conserved");
  }
  return {
    schemaVersion: 1,
    sourceDigest: sha256(retirementBytes),
    decisionsDigest: sha256(decisionsBytes),
    counts,
    entries,
  };
}

function renderMarkdown(queue) {
  const lines = [
    "# Conserved TypeScript/MJS Conversion Queue",
    "",
    `Source digest: \`${queue.sourceDigest}\``,
    "",
    "| Classification | Count |",
    "|---|---:|",
    ...CLASSIFICATIONS.map((name) => `| ${name} | ${queue.counts[name]} |`),
    `| TOTAL | ${queue.counts.total} |`,
    "",
    "A zero candidate count means no source has an evidence-bound admission decision; it does not mean the corpus is complete.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function main() {
  const { root, mode } = parseArgs(process.argv.slice(2));
  const queue = deriveQueue(root);
  const json = `${JSON.stringify(queue, null, 2)}\n`;
  const markdown = renderMarkdown(queue);
  const outputRoot = join(root, "build", "conversion-queue");
  const outputs = [[join(outputRoot, "queue.json"), json], [join(outputRoot, "QUEUE.md"), markdown]];
  if (mode === "--write") {
    mkdirSync(outputRoot, { recursive: true });
    for (const [path, contents] of outputs) writeFileSync(path, contents);
  } else {
    for (const [path, contents] of outputs) {
      if (readFileSync(path, "utf8") !== contents) throw new Error(`stale conversion queue output: ${path}`);
    }
  }
  console.log(`conversion-queue: ${queue.counts.total}/${queue.counts.total} classified; ${queue.counts.CANDIDATE} candidates; ${queue.counts.BLOCKED} blocked`);
}

try {
  main();
} catch (error) {
  console.error(`REFUSED: ${error instanceof Error ? error.message : "unknown conversion queue failure"}`);
  process.exit(1);
}
