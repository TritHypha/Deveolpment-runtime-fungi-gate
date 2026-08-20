import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import test from "node:test";

import { auditDetachedSlideAuthorityPath } from "../audit-detached-slide-authority-path.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const FIXTURES = "scripts/tests/fixtures/detached-authority";

function auditFixture(name) {
  return auditDetachedSlideAuthorityPath({
    repositoryRoot: ROOT,
    entry: `${FIXTURES}/${name}/entry.ts`,
  });
}

function assertReceiptContainsOnlyLocatorsAndMetadata(receipt, fixture) {
  assert.deepEqual(Object.keys(receipt).sort(), ["edges", "files", "freshness", "schema"]);
  assert.equal(typeof receipt.schema, "string");
  assert.equal(typeof receipt.freshness, "object");

  for (const file of receipt.files) {
    assert.deepEqual(Object.keys(file).sort(), ["digest", "locator"]);
    assert.equal(file.locator.startsWith("/"), false);
    assert.equal(file.locator.includes(":"), false);
    assert.equal(file.locator, relative(ROOT, resolve(ROOT, file.locator)));
    assert.match(file.digest, /^[a-f0-9]{64}$/u);
  }

  for (const edge of receipt.edges) {
    assert.deepEqual(Object.keys(edge).sort(), ["from", "id", "to"]);
    assert.equal(edge.from.startsWith("/"), false);
    assert.equal(edge.to.startsWith("/"), false);
    assert.equal(typeof edge.id, "string");
  }

  const fixtureSource = readFileSync(resolve(ROOT, `${FIXTURES}/${fixture}/entry.ts`), "utf8");
  assert.equal(JSON.stringify(receipt).includes(fixtureSource), false);
}

test("green closure accepts snapshot bytes and typed GIR/refusal only", () => {
  const result = auditFixture("green");

  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.deepEqual(result.violations, []);
  assertReceiptContainsOnlyLocatorsAndMetadata(result.receipt, "green");
});

for (const { fixture, identifier } of [
  { fixture: "red-ast", identifier: "AST_REENTRY" },
  { fixture: "red-typescript", identifier: "TYPESCRIPT_REENTRY" },
  { fixture: "red-wasm", identifier: "LEGACY_EXECUTION_REENTRY" },
  { fixture: "red-component", identifier: "COMPONENT_AUTHORITY_BLEED" },
  { fixture: "red-unresolved", identifier: "UNRESOLVED_CLOSURE" },
]) {
  test(`${identifier} fixture exits non-zero with its exact failure identifier`, () => {
    const result = auditFixture(fixture);

    assert.notEqual(result.exitCode, 0, JSON.stringify(result));
    assert.deepEqual(result.violations.map((violation) => violation.id), [identifier]);
    assertReceiptContainsOnlyLocatorsAndMetadata(result.receipt, fixture);
  });
}
