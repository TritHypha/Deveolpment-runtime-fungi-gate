import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import test from "node:test";

import { auditDetachedSlideAuthorityPath } from "../audit-detached-slide-authority-path.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = "scripts/tests/fixtures/detached-authority";
const REPOSITORY_HEAD = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: ROOT,
  encoding: "utf8",
}).trim();

function auditFixture(name) {
  return auditDetachedSlideAuthorityPath({
    repositoryRoot: ROOT,
    entry: `${FIXTURES}/${name}/entry.ts`,
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

function assertNoFixtureSourceBody(value, source) {
  if (typeof value === "string") {
    const jsonEscapedSource = JSON.stringify(source).slice(1, -1);
    assert.equal(value.includes(source), false);
    assert.equal(value.includes(jsonEscapedSource), false);
    return;
  }

  if (Array.isArray(value)) {
    for (const member of value) {
      assertNoFixtureSourceBody(member, source);
    }
    return;
  }

  if (value !== null && typeof value === "object") {
    for (const member of Object.values(value)) {
      assertNoFixtureSourceBody(member, source);
    }
  }
}

function assertReceiptContainsOnlyLocatorsAndMetadata(receipt, fixture) {
  assert.deepEqual(Object.keys(receipt).sort(), ["edges", "files", "freshness", "schema"]);
  assert.equal(typeof receipt.schema, "string");
  assert.deepEqual(Object.keys(receipt.freshness).sort(), [
    "indexed_head_sha",
    "repository_head_sha",
    "state",
  ]);
  assert.match(receipt.freshness.indexed_head_sha, /^[a-f0-9]{40}$/u);
  assert.match(receipt.freshness.repository_head_sha, /^[a-f0-9]{40}$/u);
  assert.equal(receipt.freshness.state, "FRESH");
  assert.equal(receipt.freshness.repository_head_sha, REPOSITORY_HEAD);
  assert.equal(receipt.freshness.indexed_head_sha, REPOSITORY_HEAD);

  for (const file of receipt.files) {
    assert.deepEqual(Object.keys(file).sort(), ["digest", "locator"]);
    assertRepositoryRelativeLocator(file.locator);
    assert.match(file.digest, /^[a-f0-9]{64}$/u);
  }

  for (const edge of receipt.edges) {
    assert.deepEqual(Object.keys(edge).sort(), ["from", "id", "to"]);
    assertRepositoryRelativeLocator(edge.from);
    assertRepositoryRelativeLocator(edge.to);
    assert.equal(typeof edge.id, "string");
  }

  const fixtureSource = readFileSync(resolve(ROOT, `${FIXTURES}/${fixture}/entry.ts`), "utf8");
  assertNoFixtureSourceBody(receipt, fixtureSource);
}

test("green closure accepts snapshot bytes and typed GIR/refusal only", () => {
  const result = auditFixture("green");

  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(result.violations, []);
  assertReceiptContainsOnlyLocatorsAndMetadata(result.receipt, "green");
});

for (const { fixture, identifier, expectedViolations } of [
  { fixture: "red-ast", identifier: "AST_REENTRY", expectedViolations: 5 },
  { fixture: "red-typescript", identifier: "TYPESCRIPT_REENTRY", expectedViolations: 4 },
  { fixture: "red-wasm", identifier: "LEGACY_EXECUTION_REENTRY", expectedViolations: 5 },
  { fixture: "red-component", identifier: "COMPONENT_AUTHORITY_BLEED", expectedViolations: 4 },
  { fixture: "red-unresolved", identifier: "UNRESOLVED_CLOSURE", expectedViolations: 3 },
]) {
  test(`${identifier} fixture exits non-zero with its exact failure identifier`, () => {
    const result = auditFixture(fixture);

    assert.notEqual(result.exitCode, 0, JSON.stringify(result));
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      Array.from({ length: expectedViolations }, () => identifier),
    );
    assertReceiptContainsOnlyLocatorsAndMetadata(result.receipt, fixture);
  });
}
