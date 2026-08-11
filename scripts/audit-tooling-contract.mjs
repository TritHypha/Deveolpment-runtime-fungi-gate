#!/usr/bin/env node
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import {
  deriveCadenceCoverage,
  discoverTooling,
  loadAssuranceManifest,
  loadToolingPolicy,
  validateToolingContract,
} from "./lib/tooling-inventory.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const selfTest = argv.includes("--self-test");
const rootIndex = argv.indexOf("--root");
const root = rootIndex >= 0 && typeof argv[rootIndex + 1] === "string"
  ? resolve(argv[rootIndex + 1])
  : resolve(HERE, "..");

function write(fixtureRoot, relativePath, contents) {
  const absolutePath = join(fixtureRoot, ...relativePath.split("/"));
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function emptyPolicy() {
  return {
    schemaVersion: 1,
    packageNoTest: {},
    toolExceptions: {},
    generators: {},
  };
}

function fixtureManifestEntry() {
  return {
    id: "audit:uncovered", requirementId: "REQ-AUDIT-UNCOVERED", satisfies: ["REQ-AUDIT-UNCOVERED"],
    execution: { kind: "process", command: ["node", "scripts/audit-uncovered.mjs"] },
    acceptedExitCodes: [0], leasePolicy: "none", cwd: ".",
    toolClass: "analyzer", authorityClass: "blocking", cadences: ["normal"],
    outcomePolicy: "blocking",
    subjects: { kind: "requirements", values: ["REQ-AUDIT-UNCOVERED"], expectedCount: 1 },
    timeoutMs: 30_000, maxOutputBytes: 1_048_576, generatedOutputs: [], nestedTools: [],
    mutationPolicy: "read-only", platforms: [process.platform],
    selfTest: { kind: "absent", reason: "fixture" }, predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" }, overlap: "canonical",
      retirement: "active", evidence: { kind: "absent", reason: "active" },
    },
  };
}

function runSelfTest() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "tooling-contract-selftest-"));
  try {
    write(
      fixtureRoot,
      "galerina.workspace.json",
      JSON.stringify({ packages: [] }),
    );
    write(
      fixtureRoot,
      "governance/tooling-policy.json",
      JSON.stringify(emptyPolicy()),
    );
    write(
      fixtureRoot,
      "scripts/audit-uncovered.mjs",
      "process.exit(0);\n",
    );
    const red = validateToolingContract(
      discoverTooling(fixtureRoot),
      loadToolingPolicy(fixtureRoot),
    );
    const catchesUncovered = red.some((item) =>
      item.code === "TOOLING-AUDIT-UNCOVERED"
      && item.subject === "audit-uncovered.mjs");

    write(fixtureRoot, "governance/phase-close-commands.json", JSON.stringify({
      schemaVersion: 1,
      entries: [fixtureManifestEntry()],
    }));
    const greenInventory = discoverTooling(fixtureRoot);
    const greenPolicy = loadToolingPolicy(fixtureRoot);
    const greenCoverage = deriveCadenceCoverage(
      greenInventory,
      loadAssuranceManifest(fixtureRoot),
      greenPolicy,
    );
    greenInventory.cadenceCoverage = greenCoverage.kind === "accepted" ? greenCoverage.records : [];
    const green = validateToolingContract(greenInventory, greenPolicy);
    const checks = [
      ["uncovered audit is refused", catchesUncovered],
      ["exact phase-close coverage clears the control", green.length === 0],
    ];
    for (const [name, ok] of checks) {
      console.log(`[self-test] ${ok ? "ok" : "FAIL"} - ${name}`);
    }
    const failed = checks.filter(([, ok]) => !ok);
    if (failed.length > 0) {
      console.log(`[self-test] FAIL - ${failed.length} check(s) failed`);
      process.exit(1);
    }
    console.log("[self-test] PASS - refusal and clean-control directions proven");
    process.exit(0);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

if (selfTest) runSelfTest();

let inventory;
let violations;
try {
  inventory = discoverTooling(root);
  const policy = loadToolingPolicy(root);
  const coverage = deriveCadenceCoverage(inventory, loadAssuranceManifest(root), policy);
  if (coverage.kind !== "accepted") throw Object.assign(new Error(coverage.detail), { code: coverage.code });
  inventory.cadenceCoverage = coverage.records;
  inventory.legacyConsumers = coverage.legacyConsumers;
  inventory.directPhaseClose = coverage.records
    .filter((record) => record.directEntryIds.length > 0)
    .map((record) => record.tool);
  violations = [...new Map(
    [...coverage.violations, ...validateToolingContract(inventory, policy)]
      .map((item) => [JSON.stringify([item.code, item.subject]), item]),
  ).values()];
} catch (error) {
  violations = [{
    code: error.code ?? "TOOLING-CONTRACT-INDETERMINATE",
    subject: "tooling-policy.json",
    detail: error.message,
  }];
  inventory = {
    packages: [],
    tools: [],
    directPhaseClose: [],
    ciCommands: [],
    externalTests: [],
  };
}

const report = {
  tool: "tooling-contract",
  schemaVersion: 1,
  ok: violations.length === 0,
  totals: {
    packages: inventory.packages.length,
    tools: inventory.tools.length,
    phaseCloseCommands: inventory.directPhaseClose.length,
    ciCommands: inventory.ciCommands.length,
    fixtureEvidence: inventory.externalTests.length,
    violations: violations.length,
  },
  violations,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("# Galerina tooling contract");
  console.log(
    `packages ${report.totals.packages} | tools ${report.totals.tools}`
    + ` | violations ${report.totals.violations}`,
  );
  for (const item of violations) {
    console.error(`${item.code} ${item.subject}: ${item.detail}`);
  }
  console.log(`VIOLATIONS: ${violations.length}`);
}

process.exit(Math.min(violations.length, 250));
