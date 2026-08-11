#!/usr/bin/env node
// audit-generator-contract.mjs — executes every declared generator contract
// and refuses empty coverage, invalid policy, or any failing child.
// Version: 1.0.0 · Task 7 generator governance.
// Related: governance/tooling-policy.json; scripts/lib/generator-contract.mjs.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

import {
  loadGeneratorPolicy,
  verifyGenerator,
} from "./lib/generator-contract.mjs";

const POLICY_PATH = "governance/tooling-policy.json";
const VALID_TIERS = new Set(["phase-close", "exhaustive"]);

/**
 * Read the policy registry without weakening per-entry validation.
 *
 * @param {string} root repository root
 * @returns {readonly string[]} sorted generator paths
 */
function generatorNames(root) {
  const parsed = JSON.parse(readFileSync(join(root, POLICY_PATH), "utf8"));
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof parsed.generators !== "object" ||
    parsed.generators === null ||
    Array.isArray(parsed.generators)
  ) {
    throw new Error("tooling policy generators must be an object");
  }
  return Object.keys(parsed.generators).sort();
}

/**
 * Execute all selected generator contracts and aggregate exact child results.
 *
 * @param {string} rootPath repository root
 * @param {{ tier?: "phase-close" | "exhaustive" }} options selection options
 */
export async function auditGenerators(rootPath, { tier } = {}) {
  const root = resolve(rootPath);
  let names;
  try {
    names = generatorNames(root);
  } catch (error) {
    return {
      ok: false,
      code: "GENERATOR-POLICY-INVALID",
      detail: error instanceof Error ? error.message : String(error),
      total: 0,
      passed: 0,
      failed: 1,
      results: [],
    };
  }
  if (names.length === 0) {
    return {
      ok: false,
      code: "GENERATOR-POLICY-EMPTY",
      detail: "no generators are declared; coverage would be vacuous",
      total: 0,
      passed: 0,
      failed: 1,
      results: [],
    };
  }

  const selected = [];
  for (const generator of names) {
    try {
      const policy = loadGeneratorPolicy(root, generator);
      if (tier === "phase-close" && policy.tier !== "phase-close") continue;
      selected.push(generator);
    } catch (error) {
      selected.push(generator);
    }
  }
  if (selected.length === 0) {
    return {
      ok: false,
      code: "GENERATOR-TIER-EMPTY",
      detail: `no generators are declared for tier ${tier}`,
      total: 0,
      passed: 0,
      failed: 1,
      results: [],
    };
  }

  const results = [];
  for (const generator of selected) {
    results.push({
      generator,
      ...await verifyGenerator(root, generator),
    });
  }
  const passed = results.filter((result) => result.ok).length;
  const ok = passed === results.length;
  return {
    ok,
    code: ok ? "GENERATOR-CONTRACT-PASS" : "GENERATOR-CONTRACT-FAILED",
    detail: `${passed}/${results.length} generator contracts passed`,
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}

/**
 * Write one self-test fixture file and create its parent directories.
 *
 * @param {string} root fixture root
 * @param {string} relativePath fixture-relative path
 * @param {string} content exact content
 */
function writeFixture(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Build a hermetic generator fixture for the audit's negative/control proof.
 *
 * @param {boolean} hiddenWrite whether the generator writes an undeclared file
 */
function selfTestFixture(hiddenWrite) {
  const root = mkdtempSync(join(tmpdir(), "generator-audit-selftest-"));
  const generator = "scripts/selftest-generator.mjs";
  writeFixture(root, "input/source.txt", "stable\n");
  writeFixture(
    root,
    generator,
    `import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
if (process.argv.includes("--check")) process.exit(0);
const outputs = ["build/value.json", "build/provenance.json"${hiddenWrite ? ', "build/hidden.json"' : ""}];
for (const output of outputs) {
  const path = join(process.cwd(), output);
  mkdirSync(dirname(path), { recursive: true });
  const value = output.endsWith("provenance.json")
    ? {
        tool: "selftest-generator",
        authority: "NONE",
        gitCommit: "a".repeat(40),
        builtAt: "2026-07-29T10:00:00.000Z",
        node: process.version,
      }
    : { value: "stable" };
  writeFileSync(path, JSON.stringify(value, null, 2) + "\\n");
}
`,
  );
  writeFixture(
    root,
    POLICY_PATH,
    JSON.stringify({
      schemaVersion: 1,
      packageNoTest: {},
      toolExceptions: {},
      generators: {
        [generator]: {
          inputs: ["input/source.txt"],
          outputs: ["build/value.json", "build/provenance.json"],
          tracked: true,
          generate: ["node", generator],
          check: ["node", generator, "--check"],
          provenance: "required",
          tier: "phase-close",
        },
      },
    }, null, 2),
  );
  return root;
}

/**
 * Prove that the umbrella audit detects a planted violation and accepts a
 * governed control. Any missing direction fails the self-test.
 */
async function runSelfTest() {
  const negativeRoot = selfTestFixture(true);
  const controlRoot = selfTestFixture(false);
  try {
    const negative = await auditGenerators(negativeRoot);
    const control = await auditGenerators(controlRoot);
    const negativeDetected =
      negative.ok === false &&
      negative.results[0]?.code === "GENERATOR-UNDECLARED-WRITE";
    const controlPassed = control.ok === true;
    return {
      ok: negativeDetected && controlPassed,
      code: negativeDetected && controlPassed
        ? "GENERATOR-SELFTEST-PASS"
        : "GENERATOR-SELFTEST-FAILED",
      negativeDetected,
      controlPassed,
    };
  } finally {
    rmSync(negativeRoot, { recursive: true, force: true });
    rmSync(controlRoot, { recursive: true, force: true });
  }
}

/**
 * Print the report without mixing human text into JSON mode.
 *
 * @param {Record<string, unknown>} report audit report
 * @param {boolean} asJson emit machine-readable JSON
 */
function printReport(report, asJson) {
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  console.log(`generator-contract: ${report.ok ? "PASS" : "FAIL"} · ${report.code}`);
  if ("detail" in report) console.log(`  ${report.detail}`);
  if (Array.isArray(report.results)) {
    for (const result of report.results) {
      console.log(`  ${result.ok ? "PASS" : "FAIL"} ${result.generator}: ${result.code}`);
    }
  }
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
let report;
if (args.includes("--self-test")) {
  report = await runSelfTest();
} else {
  const rootIndex = args.indexOf("--root");
  const tierIndex = args.indexOf("--tier");
  const root = rootIndex === -1 ? process.cwd() : args[rootIndex + 1];
  const tier = tierIndex === -1 ? undefined : args[tierIndex + 1];
  if (root === undefined || (tier !== undefined && !VALID_TIERS.has(tier))) {
    report = {
      ok: false,
      code: "GENERATOR-CLI-INVALID",
      detail: "expected --root <path> and --tier phase-close|exhaustive",
    };
  } else {
    report = await auditGenerators(root, { tier });
  }
}
printReport(report, asJson);
if (!report.ok) process.exitCode = 1;
