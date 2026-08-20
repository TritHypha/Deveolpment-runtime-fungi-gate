import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import test from "node:test";

import { auditDetachedAuthorityPath } from "../audit-detached-slide-authority-path.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = "scripts/tests/fixtures/detached-authority";
const GRAPH_PROJECT = "Galerina-detached-authority-detectors";
const REPOSITORY_HEAD = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

process.env.GALERINA_DETACHED_AUTHORITY_GRAPH_PROJECT = GRAPH_PROJECT;

function auditFixture(name, overrides = {}) {
  return auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [`${FIXTURES}/${name}/entry.ts`],
    expectedHead: REPOSITORY_HEAD,
    ...overrides,
  });
}

function assertRepositoryRelativeLocator(locator) {
  assert.equal(typeof locator, "string");
  assert.equal(isAbsolute(locator), false);
  assert.equal(locator.includes(":"), false);

  const resolved = resolve(ROOT, locator);
  const canonical = relative(ROOT, resolved).replaceAll("\\", "/");
  assert.notEqual(canonical, "");
  assert.equal(canonical === ".." || canonical.startsWith("../"), false);
  assert.equal(locator, canonical);
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== "object") return;
  assert.equal(Object.isFrozen(value), true);
  for (const member of Object.values(value)) assertDeepFrozen(member);
}

function assertNoFixtureSourceBody(value, source) {
  if (typeof value === "string") {
    const jsonEscapedSource = JSON.stringify(source).slice(1, -1);
    assert.equal(value.includes(source), false);
    assert.equal(value.includes(jsonEscapedSource), false);
    return;
  }

  if (Array.isArray(value)) {
    for (const member of value) assertNoFixtureSourceBody(member, source);
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const member of Object.values(value)) assertNoFixtureSourceBody(member, source);
  }
}

function assertDetachedAuthorityAuditV1(result, fixture) {
  assert.deepEqual(Object.keys(result).sort(), [
    "entryFiles",
    "failureId",
    "graphBuildPoint",
    "graphFreshness",
    "inspectedEdges",
    "inspectedFiles",
    "repositoryHead",
    "rulesetDigest",
    "schema",
    "status",
    "toolVersion",
    "violations",
  ]);
  assert.equal(result.schema, "DetachedAuthorityAuditV1");
  assert.match(result.toolVersion, /^[0-9]+\.[0-9]+\.[0-9]+$/u);
  assert.match(result.rulesetDigest, /^[a-f0-9]{64}$/u);
  assert.equal(result.repositoryHead, REPOSITORY_HEAD);
  assert.equal(result.graphBuildPoint, REPOSITORY_HEAD);
  assert.equal(result.graphFreshness, "FRESH");
  assert.deepEqual([...result.entryFiles].sort(), result.entryFiles);

  for (const entryFile of result.entryFiles) assertRepositoryRelativeLocator(entryFile);
  for (const file of result.inspectedFiles) {
    assert.deepEqual(Object.keys(file).sort(), ["digest", "locator"]);
    assertRepositoryRelativeLocator(file.locator);
    assert.match(file.digest, /^[a-f0-9]{64}$/u);
  }
  for (const edge of result.inspectedEdges) {
    assert.deepEqual(Object.keys(edge).sort(), ["from", "id", "to"]);
    assertRepositoryRelativeLocator(edge.from);
    assertRepositoryRelativeLocator(edge.to);
    assert.equal(typeof edge.id, "string");
  }
  for (const violation of result.violations) {
    assert.deepEqual(Object.keys(violation).sort(), ["edgeId", "file", "id"]);
    assertRepositoryRelativeLocator(violation.file);
    assert.equal(typeof violation.edgeId, "string");
    assert.equal(typeof violation.id, "string");
  }

  const fixtureSource = readFileSync(resolve(ROOT, `${FIXTURES}/${fixture}/entry.ts`), "utf8");
  assertNoFixtureSourceBody(result, fixtureSource);
  assertDeepFrozen(result);
}

async function withTemporaryFixture(files, callback) {
  const base = resolve(ROOT, FIXTURES, ".task-2-");
  const temporaryRoot = mkdtempSync(base);
  try {
    for (const [name, source] of Object.entries(files)) {
      writeFileSync(resolve(temporaryRoot, name), source, "utf8");
    }
    const locator = relative(ROOT, temporaryRoot).replaceAll("\\", "/");
    return await callback(locator);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function runCli(entry) {
  return spawnSync(process.execPath, [
    resolve(ROOT, "scripts/audit-detached-slide-authority-path.mjs"),
    "--repo-root", ROOT,
    "--entry", entry,
    "--expected-head", REPOSITORY_HEAD,
    "--graph-project", GRAPH_PROJECT,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 30_000,
    windowsHide: true,
  });
}

test("green closure accepts snapshot bytes and typed GIR/refusal only", async () => {
  const result = await auditFixture("green");

  assert.equal(result.status, "PASS", JSON.stringify(result));
  assert.equal(result.failureId, null);
  assert.deepEqual(result.violations, []);
  assertDetachedAuthorityAuditV1(result, "green");
});

for (const { fixture, identifier, expectedViolations, status } of [
  { fixture: "red-ast", identifier: "AST_REENTRY", expectedViolations: 5, status: "FAIL" },
  { fixture: "red-typescript", identifier: "TYPESCRIPT_REENTRY", expectedViolations: 4, status: "FAIL" },
  { fixture: "red-wasm", identifier: "LEGACY_EXECUTION_REENTRY", expectedViolations: 5, status: "FAIL" },
  { fixture: "red-component", identifier: "COMPONENT_AUTHORITY_BLEED", expectedViolations: 4, status: "FAIL" },
  { fixture: "red-unresolved", identifier: "UNRESOLVED_CLOSURE", expectedViolations: 3, status: "REFUSED" },
]) {
  test(`${identifier} fixture returns its exact failure identifier`, async () => {
    const result = await auditFixture(fixture);

    assert.equal(result.status, status, JSON.stringify(result));
    assert.equal(result.failureId, identifier);
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      Array.from({ length: expectedViolations }, () => identifier),
    );
    assertDetachedAuthorityAuditV1(result, fixture);
  });
}

test("static imports, re-exports and literal dynamic imports close transitively", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { a } from './a.ts'; export { b } from './b.ts'; export const c = import('./c.ts'); export const total = a;\n",
    "a.ts": "export const a = 1;\n",
    "b.ts": "export const b = 2;\n",
    "c.ts": "export const c = 3;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
    assert.equal(result.inspectedFiles.length, 4);
    assert.equal(result.inspectedEdges.length, 3);
  });
});

test("renamed imports and namespace calls cannot hide forbidden symbols", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { emitGIR as lower } from './helper.ts'; import * as legacy from './helper.ts'; export const first = lower({}, {}); export const second = legacy.emitGIR({}, {});\n",
    "helper.ts": "export function emitGIR() { return new Uint8Array(); }\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "FAIL", JSON.stringify(result));
    assert.equal(result.failureId, "AST_REENTRY");
    assert.deepEqual(result.violations.map((violation) => violation.id), ["AST_REENTRY", "AST_REENTRY"]);
  });
});

test("forbidden module rules do not match benign substring collisions", async () => {
  await withTemporaryFixture({
    "entry.ts": "import { forecast } from './forecast.ts'; export const value = forecast;\n",
    "forecast.ts": "export const forecast = 1;\n",
  }, async (locator) => {
    const result = await auditDetachedAuthorityPath({
      repoRoot: ROOT,
      entryFiles: [`${locator}/entry.ts`],
      expectedHead: REPOSITORY_HEAD,
    });

    assert.equal(result.status, "PASS", JSON.stringify(result));
  });
});

test("case-variant entry duplicates refuse before traversal", async () => {
  const lower = `${FIXTURES}/green/entry.ts`;
  const result = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [lower, lower.toUpperCase()],
    expectedHead: REPOSITORY_HEAD,
  });

  assert.equal(result.status, "REFUSED", JSON.stringify(result));
  assert.equal(result.failureId, "DETACHED_AUTHORITY_CASE_COLLISION");
});

test("file and edge ceilings refuse rather than returning partial PASS", async () => {
  const fileLimited = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [
      `${FIXTURES}/green/entry.ts`,
      `${FIXTURES}/red-wasm/entry.ts`,
    ],
    expectedHead: REPOSITORY_HEAD,
    maximumFiles: 1,
  });
  const edgeLimited = await auditFixture("red-typescript", { maximumEdges: 1 });

  assert.equal(fileLimited.status, "REFUSED", JSON.stringify(fileLimited));
  assert.equal(fileLimited.failureId, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
  assert.equal(edgeLimited.status, "REFUSED", JSON.stringify(edgeLimited));
  assert.equal(edgeLimited.failureId, "DETACHED_AUTHORITY_ANALYSIS_TRUNCATED");
});

test("ruleset digest is stable across entry order", async () => {
  const entries = [
    `${FIXTURES}/green/entry.ts`,
    `${FIXTURES}/red-wasm/entry.ts`,
  ];
  const forward = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: entries,
    expectedHead: REPOSITORY_HEAD,
  });
  const reverse = await auditDetachedAuthorityPath({
    repoRoot: ROOT,
    entryFiles: [...entries].reverse(),
    expectedHead: REPOSITORY_HEAD,
  });

  assert.equal(forward.rulesetDigest, reverse.rulesetDigest);
});

test("CLI preserves exit algebra 0 for PASS, 1 for findings and 2 for refusal", () => {
  const pass = runCli(`${FIXTURES}/green/entry.ts`);
  const finding = runCli(`${FIXTURES}/red-wasm/entry.ts`);
  const refusal = runCli(`${FIXTURES}/red-unresolved/entry.ts`);

  assert.equal(pass.status, 0, pass.stderr || pass.stdout);
  assert.equal(JSON.parse(pass.stdout).status, "PASS");
  assert.equal(finding.status, 1, finding.stderr || finding.stdout);
  assert.equal(JSON.parse(finding.stdout).failureId, "LEGACY_EXECUTION_REENTRY");
  assert.equal(refusal.status, 2, refusal.stderr || refusal.stdout);
  assert.equal(JSON.parse(refusal.stdout).failureId, "UNRESOLVED_CLOSURE");
});
