import { after, test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
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
  for (const [relativePath, contents] of Object.entries(files)) {
    write(root, relativePath, contents);
  }
  return root;
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
  return api.validateToolingContract(
    api.discoverTooling(root),
    api.loadToolingPolicy(root),
  );
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
    "scripts/run-phase-close.mjs":
      'run("audit:covered", "node", ["scripts/audit-covered.mjs"]);\n',
  });

  assert.deepEqual(validate(root), []);
});

test("an unregistered package directory is a blocking violation", () => {
  const root = fixture({
    "packages-galerina/hidden/package.json": JSON.stringify({
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
      packages: ["packages-galerina/missing"],
    }),
  });

  assert.ok(validate(root).some((violation) =>
    violation.code === "TOOLING-PACKAGE-MISSING"
    && violation.subject === "galerina-missing"));
});

test("a registered package without a test requires an exact exception", () => {
  const root = fixture({
    "galerina.workspace.json": JSON.stringify({
      packages: ["packages-galerina/empty"],
    }),
    "packages-galerina/empty/package.json":
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
        packages: ["packages-galerina/empty"],
      }),
      "packages-galerina/empty/package.json":
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
