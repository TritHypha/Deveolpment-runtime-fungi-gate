import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
  assert.equal(report.results[0].built, true);
  assert.equal(report.results[0].tests, 1);
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
