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
  discoverTooling,
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

    write(
      fixtureRoot,
      "scripts/run-phase-close.mjs",
      'run("audit:uncovered", "node", ["scripts/audit-uncovered.mjs"]);\n',
    );
    const green = validateToolingContract(
      discoverTooling(fixtureRoot),
      loadToolingPolicy(fixtureRoot),
    );
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
  violations = validateToolingContract(inventory, loadToolingPolicy(root));
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
