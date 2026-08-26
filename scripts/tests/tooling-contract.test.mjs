import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  existsSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(TEST_DIR, "..");
const AUDIT = join(SCRIPTS, "audit-tooling-contract.mjs");
const DEV_INDEX = join(SCRIPTS, "dev-tool-index.mjs");
const MODULE_URL = new URL("../lib/tooling-inventory.mjs", import.meta.url);
const api = await import(MODULE_URL).catch(() => ({}));
const roots = [];

after(() => {
  for (const root of roots) {
    rmSync(root, { recursive: true, force: true });
  }
});

function write(root, relativePath, contents) {
  const absolutePath = join(root, ...relativePath.split("/"));
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents);
}

function validEmptyPolicy(overrides = {}) {
  return {
    schemaVersion: 1,
    packageNoTest: {},
    toolExceptions: {},
    generators: {},
    ...overrides,
  };
}

function fixture(files, policy = validEmptyPolicy()) {
  const root = mkdtempSync(join(tmpdir(), "galerina-tooling-contract-"));
  roots.push(root);
  write(root, "galerina.workspace.json", JSON.stringify({ packages: [] }));
  write(root, "governance/tooling-policy.json", JSON.stringify(policy));
  write(root, "scripts/fixture-runner.mjs", "process.exit(0);\n");
  write(root, "governance/phase-close-commands.json", JSON.stringify({
    schemaVersion: 1,
    entries: [manifestEntry("fixture:runner", "scripts/fixture-runner.mjs")],
  }));
  for (const [relativePath, contents] of Object.entries(files)) {
    write(root, relativePath, contents);
  }
  return root;
}

function manifestEntry(id, script) {
  const requirementId = `REQ-${id.toUpperCase().replace(/[^A-Z0-9]/g, "-")}`;
  return {
    id, requirementId, satisfies: [requirementId],
    execution: { kind: "process", command: ["node", script] },
    acceptedExitCodes: [0], leasePolicy: "none", cwd: ".",
    toolClass: "analyzer", authorityClass: "blocking", cadences: ["normal"],
    outcomePolicy: "blocking",
    subjects: { kind: "requirements", values: [requirementId], expectedCount: 1 },
    timeoutMs: 30_000, maxOutputBytes: 1_048_576,
    generatedOutputs: [], nestedTools: [], mutationPolicy: "read-only",
    platforms: [process.platform], selfTest: { kind: "absent", reason: "fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical", retirement: "active",
      evidence: { kind: "absent", reason: "active" },
    },
  };
}

function validate(root) {
  assert.equal(
    typeof api.discoverTooling,
    "function",
    "discoverTooling must be implemented",
  );
  assert.equal(
    typeof api.loadToolingPolicy,
    "function",
    "loadToolingPolicy must be implemented",
  );
  assert.equal(
    typeof api.validateToolingContract,
    "function",
    "validateToolingContract must be implemented",
  );
  const inventory = api.discoverTooling(root);
  const policy = api.loadToolingPolicy(root);
  if (existsSync(join(root, "governance", "phase-close-commands.json"))) {
    const coverage = api.deriveCadenceCoverage(inventory, api.loadAssuranceManifest(root), policy);
    assert.equal(coverage.kind, "accepted", coverage.detail);
    inventory.cadenceCoverage = coverage.records;
  }
  return api.validateToolingContract(inventory, policy);
}

test("an undisposed audit is a blocking violation", () => {
  const root = fixture({
    "scripts/audit-new-control.mjs":
      'if (process.argv.includes("--self-test")) console.log("[self-test] PASS");\nprocess.exit(0);\n',
  });

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-AUDIT-UNCOVERED"
    && violation.subject === "audit-new-control.mjs"));
});

test("a cadence-tested blocking meta-gate covers the self-tests it executes", () => {
  const root = fixture({
    "scripts/audit-covered-by-meta.mjs":
      'if (process.argv.includes("--self-test")) console.log("[self-test] PASS");\nprocess.exit(0);\n',
    "scripts/audit-gate-selftests.mjs": [
      'const SELFTEST_VIA_TEST = {',
      '  "audit-gate-selftests.mjs": { test: "scripts/tests/gate-selftests.test.mjs" },',
      "};",
      'const declaresSelfTest = (src) => src.includes(\'"--self-test"\');',
      'const none = { status: "NO_SELFTEST", violation: true };',
      'const vacuous = { status: "SELFTEST_VACUOUS", violation: true };',
      "void SELFTEST_VIA_TEST;",
      "void declaresSelfTest;",
      "void none;",
      "void vacuous;",
    ].join("\n"),
    "scripts/tests/gate-selftests.test.mjs":
      'const tool = "audit-gate-selftests.mjs";\nconst required = "ZERO audit/lint proofs are missing, broken, or vacuous";\n',
  });

  assert.deepEqual(validate(root), []);
});

test("a phase-close command disposes the exact audit", () => {
  const root = fixture({
    "scripts/audit-covered.mjs": "process.exit(0);\n",
    "governance/phase-close-commands.json": JSON.stringify({
      schemaVersion: 1,
      entries: [manifestEntry("audit:covered", "scripts/audit-covered.mjs")],
    }),
  });

  assert.deepEqual(validate(root), []);
});

test("a manifest self-test command is the fixture-evidence source of truth", () => {
  const entry = manifestEntry("audit:covered-by-test", "scripts/audit-covered-by-test.mjs");
  entry.selfTest = {
    kind: "present",
    command: ["node", "--test", "scripts/tests/audit-covered-by-test.test.mjs"],
    plantedDefectId: "missing-required-field",
  };
  const root = fixture({
    "scripts/audit-covered-by-test.mjs": "process.exit(0);\n",
    "scripts/tests/audit-covered-by-test.test.mjs":
      'const tool = "audit-covered-by-test.mjs";\nvoid tool;\n',
    "governance/phase-close-commands.json": JSON.stringify({
      schemaVersion: 1,
      entries: [entry],
    }),
  });

  const inventory = api.discoverTooling(root);
  assert.deepEqual(
    inventory.externalTests.filter((item) => item.tool === "audit-covered-by-test.mjs"),
    [{
      tool: "audit-covered-by-test.mjs",
      test: "scripts/tests/audit-covered-by-test.test.mjs",
      plantedDefectId: "missing-required-field",
      via: "governance/phase-close-commands.json",
    }],
  );
});

test("an unregistered package directory is a blocking violation", () => {
  const root = fixture({
    "packages-ts/hidden/package.json": JSON.stringify({
      name: "@galerina/hidden",
      scripts: { test: "node --test" },
    }),
  });

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-PACKAGE-UNREGISTERED"
    && violation.subject === "galerina-hidden"));
});

test("a missing workspace package target is a blocking violation", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({
      packages: ["packages-ts/missing"],
    }),
  });

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-PACKAGE-MISSING"
    && violation.subject === "galerina-missing"));
});

test("a registered package without a test requires an exact exception", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({
      packages: ["packages-ts/empty"],
    }),
    "packages-ts/empty/package.json":
      JSON.stringify({ name: "@galerina/empty" }),
  });

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-PACKAGE-NO-TEST"
    && violation.subject === "galerina-empty"));
});

test("an exact no-test exception disposes only its discovered package", () => {
  const root = fixture(
    {
      "galerina.workspace.json": JSON.stringify({
        packages: ["packages-ts/empty"],
      }),
      "packages-ts/empty/package.json":
        JSON.stringify({ name: "@galerina/empty" }),
    },
    validEmptyPolicy({
      packageNoTest: {
        "galerina-empty": {
          reason: "The fixture package deliberately has no executable surface.",
          owner: "fixture",
          reviewWhen: "An executable source file is added.",
        },
      },
    }),
  );

  assert.deepEqual(validate(root), []);
});

test("a stale or unknown exception is refused", () => {
  const root = fixture(
    {},
    validEmptyPolicy({
      toolExceptions: {
        "audit-deleted.mjs": {
          class: "external",
          reason: "Covered outside this fixture.",
          owner: "fixture",
          reviewWhen: "The tool returns.",
        },
      },
    }),
  );

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-POLICY-STALE"
    && violation.subject === "audit-deleted.mjs"));
});

test("malformed policy records are refused rather than treated as exceptions", () => {
  const root = fixture(
    {
      "scripts/audit-external.mjs": "process.exit(0);\n",
    },
    validEmptyPolicy({
      toolExceptions: {
        "audit-external.mjs": {
          class: "external",
          reason: "",
          owner: "fixture",
          reviewWhen: "Never.",
        },
      },
    }),
  );

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-POLICY-MALFORMED"
    && violation.subject === "audit-external.mjs"));
});

test("the audit CLI emits machine-readable violations and exits non-zero", () => {
  const root = fixture({
    "scripts/audit-new-control.mjs": "process.exit(0);\n",
  });
  const result = spawnSync(
    process.execPath,
    [AUDIT, "--root", root, "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.notEqual(
    result.stdout.trim(),
    "",
    "audit CLI must emit a JSON report on stdout",
  );
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.ok(report.violations.some((violation) =>
    violation.code === "TOOLING-AUDIT-UNCOVERED"
    && violation.subject === "audit-new-control.mjs"));
});

test("the audit CLI self-test proves both refusal and clean-control directions", () => {
  const result = spawnSync(
    process.execPath,
    [AUDIT, "--self-test"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /self-test.*PASS/i);
});

test("dev-tool-index --check rejects the same uncovered audit contract", () => {
  const root = fixture({
    "scripts/audit-index-gap.mjs": "process.exit(0);\n",
  });
  const result = spawnSync(
    process.execPath,
    [DEV_INDEX, "--root", root, "--check", "--json"],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 1);
  assert.notEqual(result.stdout.trim(), "", "dev-tool index must emit JSON");
  const report = JSON.parse(result.stdout);
  assert.ok(report.contractViolations.some((violation) =>
    violation.code === "TOOLING-AUDIT-UNCOVERED"
    && violation.subject === "audit-index-gap.mjs"));
});

test("test fixtures are isolated from the real repository", () => {
  assert.ok(TEST_DIR.endsWith(join("scripts", "tests")));
  assert.ok(roots.every((root) => root.startsWith(tmpdir())));
});
