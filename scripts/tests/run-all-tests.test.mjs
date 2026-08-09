import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(TEST_DIR, "..", "run-all-tests.cjs");
const require = createRequire(import.meta.url);
const { acquireSuiteLease } = require("../lib/suite-run-lease.cjs");
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

function workspaceFixture(packageName, packageJson, files = {}) {
  const root = mkdtempSync(join(tmpdir(), "galerina-run-all-"));
  roots.push(root);
  write(root, "galerina.workspace.json", JSON.stringify({
    packages: [`packages-galerina/${packageName}`],
  }));
  write(root, "governance/tooling-policy.json", JSON.stringify({
    schemaVersion: 1,
    packageNoTest: {},
    toolExceptions: {},
    generators: {},
  }));
  write(
    root,
    `packages-galerina/${packageName}/package.json`,
    JSON.stringify(packageJson),
  );
  for (const [relativePath, contents] of Object.entries(files)) {
    write(root, `packages-galerina/${packageName}/${relativePath}`, contents);
  }
  return root;
}

function parallelWorkspaceFixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-run-all-parallel-"));
  roots.push(root);
  const packageNames = ["parallel-a", "parallel-b"];
  write(root, "galerina.workspace.json", JSON.stringify({
    packages: packageNames.map((name) => `packages-galerina/${name}`),
  }));
  write(root, "governance/tooling-policy.json", JSON.stringify({
    schemaVersion: 1,
    packageNoTest: {},
    toolExceptions: {},
    generators: {},
  }));
  for (const packageName of packageNames) {
    const peerName = packageName === "parallel-a" ? "parallel-b" : "parallel-a";
    write(root, `packages-galerina/${packageName}/package.json`, JSON.stringify({
      name: `@galerina/${packageName}`,
      scripts: { test: "node concurrent-proof.cjs" },
    }));
    write(root, `packages-galerina/${packageName}/concurrent-proof.cjs`, [
      `const fs = require("node:fs");`,
      `const path = require("node:path");`,
      `const root = path.resolve(__dirname, "..", "..");`,
      `const own = path.join(root, "${packageName}.ready");`,
      `const peer = path.join(root, "${peerName}.ready");`,
      `fs.writeFileSync(own, "ready");`,
      `const deadline = Date.now() + 5000;`,
      `const waitCell = new Int32Array(new SharedArrayBuffer(4));`,
      `while (!fs.existsSync(peer) && Date.now() < deadline) Atomics.wait(waitCell, 0, 0, 25);`,
      `if (!fs.existsSync(peer)) process.exit(2);`,
      `console.log("tests 1\\npass 1\\nfail 0");`,
    ].join("\n") + "\n");
  }
  return root;
}

function compilerIsolationFixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-run-all-isolation-"));
  roots.push(root);
  write(root, "galerina.workspace.json", JSON.stringify({
    packages: [
      "packages-galerina/galerina-core-compiler",
      "packages-galerina/galerina-dependent",
    ],
  }));
  write(root, "governance/tooling-policy.json", JSON.stringify({
    schemaVersion: 1,
    packageNoTest: {},
    toolExceptions: {},
    generators: {},
  }));
  write(root, "packages-galerina/galerina-core-compiler/package.json", JSON.stringify({
    name: "@galerina/core-compiler",
    scripts: { test: "node isolation-proof.cjs" },
  }));
  write(root, "packages-galerina/galerina-core-compiler/isolation-proof.cjs", [
    `const fs = require("node:fs");`,
    `const path = require("node:path");`,
    `const root = path.resolve(__dirname, "..", "..");`,
    `const active = path.join(root, "compiler.active");`,
    `const done = path.join(root, "compiler.done");`,
    `const waitCell = new Int32Array(new SharedArrayBuffer(4));`,
    `fs.writeFileSync(active, "active");`,
    `Atomics.wait(waitCell, 0, 0, 500);`,
    `fs.rmSync(active);`,
    `fs.writeFileSync(done, "done");`,
    `console.log("tests 1\\npass 1\\nfail 0");`,
  ].join("\n") + "\n");
  write(root, "packages-galerina/galerina-dependent/package.json", JSON.stringify({
    name: "@galerina/dependent",
    scripts: { test: "node isolation-proof.cjs" },
  }));
  write(root, "packages-galerina/galerina-dependent/isolation-proof.cjs", [
    `const fs = require("node:fs");`,
    `const path = require("node:path");`,
    `const root = path.resolve(__dirname, "..", "..");`,
    `const active = path.join(root, "compiler.active");`,
    `const done = path.join(root, "compiler.done");`,
    `const deadline = Date.now() + 3000;`,
    `const waitCell = new Int32Array(new SharedArrayBuffer(4));`,
    `while (!fs.existsSync(active) && !fs.existsSync(done) && Date.now() < deadline) Atomics.wait(waitCell, 0, 0, 25);`,
    `if (fs.existsSync(active) || !fs.existsSync(done)) process.exit(2);`,
    `console.log("tests 1\\npass 1\\nfail 0");`,
  ].join("\n") + "\n");
  return root;
}

function run(root, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args],
    { encoding: "utf8", timeout: 30_000 },
  );
}

test("full discovery includes every registered package with a test script", () => {
  const root = workspaceFixture("custom", {
    name: "@galerina/custom",
    scripts: { test: "node scripts/run-tests.mjs" },
  }, {
    "scripts/run-tests.mjs":
      "console.log('tests 1\\npass 1\\nfail 0');\n",
  });

  const result = run(root, "--list");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /custom/);
  assert.match(result.stdout, /Test-bearing packages \(1\)/);
});

test("an existing dist directory never bypasses the declared test and build chain", () => {
  const root = workspaceFixture("build-current", {
    name: "@galerina/build-current",
    scripts: {
      test: "node build.mjs && node --test tests/current.test.mjs",
    },
  }, {
    "build.mjs":
      "import { writeFileSync } from 'node:fs'; writeFileSync('dist/marker.txt', 'fresh');\n",
    "dist/marker.txt": "stale",
    "tests/current.test.mjs":
      "import test from 'node:test'; test('current build', () => {});\n",
  });

  const result = run(root, "--json");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(
    readFileSync(
      join(root, "packages-galerina", "build-current", "dist", "marker.txt"),
      "utf8",
    ),
    "fresh",
  );
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.controls, {
    testConcurrency: 2,
    packageConcurrency: 2,
    processIsolation: "process",
  });
  assert.match(result.stderr, /START galerina-build-current.*test-file ceiling 2/);
  assert.match(result.stderr, /END galerina-build-current.*pass/);
  assert.equal(report.results[0].built, true);
  assert.equal(report.results[0].tests, 1);
  assert.deepEqual(report.results[0].processControl, {
    ownedTree: true,
    cleanupAttempted: false,
  });
});

test("a caller may lower but never raise the test concurrency ceiling", () => {
  const root = workspaceFixture("bounded", {
    name: "@galerina/bounded",
    scripts: { test: "node --test tests/bounded.test.mjs" },
  }, {
    "tests/bounded.test.mjs":
      "import test from 'node:test'; test('bounded', () => {});\n",
  });

  const lowered = run(root, "--json", "--test-concurrency", "2");
  assert.equal(lowered.status, 0, lowered.stderr || lowered.stdout);
  assert.equal(JSON.parse(lowered.stdout).controls.testConcurrency, 2);

  const raised = run(root, "--json", "--test-concurrency", "5");
  assert.equal(raised.status, 3);
  assert.match(raised.stderr, /TEST-CONCURRENCY-INVALID|one through four/i);
});

test("package concurrency is bounded and overlaps independent package tests", () => {
  const root = parallelWorkspaceFixture();

  const result = run(
    root,
    "--json",
    "--package-concurrency",
    "2",
    "--test-concurrency",
    "1",
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.controls.packageConcurrency, 2);
  assert.equal(report.controls.testConcurrency, 1);
  assert.equal(report.totals.passed, 2);
  assert.deepEqual(
    report.results.map((item) => item.package),
    ["galerina-parallel-a", "galerina-parallel-b"],
    "completion order must not change report order",
  );

  const refused = run(root, "--json", "--package-concurrency", "3");
  assert.equal(refused.status, 3);
  assert.match(refused.stderr, /PACKAGE-CONCURRENCY-INVALID|one or two/i);
});

test("compiler build authority is isolated before dependent package tests", () => {
  const root = compilerIsolationFixture();

  const result = run(root, "--json", "--package-concurrency", "2");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.totals.passed, 2);
  assert.deepEqual(
    report.results.map((item) => item.package),
    ["galerina-core-compiler", "galerina-dependent"],
  );
});

test("a zero exit with no parseable non-zero test summary is refused", () => {
  const root = workspaceFixture("silent", {
    name: "@galerina/silent",
    scripts: { test: "node silent-pass.mjs" },
  }, {
    "silent-pass.mjs": "process.exit(0);\n",
  });

  const result = run(root, "--json");

  assert.equal(result.status, 1);
  assert.equal(existsSync(join(root, "version.json")), false);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].status, "fail");
  assert.equal(report.results[0].failureCode, "TEST-SUMMARY-UNPARSEABLE");
});

test("a zero-test summary is refused rather than treated as an empty pass", () => {
  const root = workspaceFixture("empty", {
    name: "@galerina/empty",
    scripts: { test: "node empty-pass.mjs" },
  }, {
    "empty-pass.mjs":
      "console.log('tests 0\\npass 0\\nfail 0');\n",
  });

  const result = run(root, "--json");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].failureCode, "TEST-SUMMARY-EMPTY");
});

test("--emit-counts replaces stale package-count narrative with derived scope", () => {
  const root = workspaceFixture("counted", {
    name: "@galerina/counted",
    scripts: { test: "node counted.mjs" },
  }, {
    "counted.mjs": "console.log('tests 1\\npass 1\\nfail 0');\n",
  });
  write(root, "version.json", JSON.stringify({
    testCount: 99,
    packageCount: 53,
    packageCountNote: "All 53 workspace packages are test-bearing.",
    testCountByPackage: {},
  }));

  const result = run(root, "--emit-counts", "--json");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const version = JSON.parse(readFileSync(join(root, "version.json"), "utf8"));
  assert.equal(version.packageCount, 1);
  assert.equal(
    version.packageCountNote,
    "Derived from the complete governed package inventory: 1/1 test-bearing packages passed their declared build-current test chains; see testCountByPackage.",
  );
});

test("a held checkout lease refuses before a package child starts", () => {
  const root = workspaceFixture("must-not-run", {
    name: "@galerina/must-not-run",
    scripts: { test: "node must-not-run.mjs" },
  }, {
    "must-not-run.mjs":
      "import { writeFileSync } from 'node:fs'; writeFileSync('ran.txt', 'bad'); console.log('tests 1\\npass 1\\nfail 0');\n",
  });
  const lease = acquireSuiteLease({ root, commandClass: "phase-close" });

  const result = run(root, "--json");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.ok, false);
  assert.equal(report.violations[0].code, "SUITE-LEASE-HELD");
  assert.equal(
    existsSync(join(root, "packages-galerina", "must-not-run", "ran.txt")),
    false,
  );
  assert.equal(lease.release(), true);
});
