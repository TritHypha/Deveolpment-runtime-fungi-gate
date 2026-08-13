import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const AUDIT = join(import.meta.dirname, "..", "audit-conversion-slice-close.mjs");

function fixture(body, name = "candidate-fungi-conversion-2026-08-12.md") {
  const root = mkdtempSync(join(tmpdir(), "galerina-slice-close-"));
  const path = join(root, "docs", "reports", name);
  mkdirSync(dirname(path), { recursive: true });
  const baseline = join(root, "governance", "conversion-slice-close-baseline.json");
  mkdirSync(dirname(baseline), { recursive: true });
  writeFileSync(baseline, '{"schemaVersion":1,"legacyReports":[]}\n');
  writeFileSync(path, body);
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [AUDIT, "--root", root], { encoding: "utf8" });
}

const base = `# Candidate Fungi Conversion Report

## Slice-close receipt

Skill disposition: SKILL_UPDATE aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
Threadability: PARALLEL_PURE
Source classification: CANDIDATE
Bounded closure: COMPLETE
`;

const forward = `# Slice 323 Candidate Fungi conversion adjudication

Scope: \`packages-galerina/example/src/index.ts#Candidate\`.

Evidence: source build point \`aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\`;
source SHA-256 \`BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\`;

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: translating skill already covers this boundary
Authoring skill disposition: NO_SKILL_UPDATE: no Fungi candidate was authorized
Threadability: UNKNOWN
Source classification: BLOCKED
Bounded closure: COMPLETE
`;

const qualifiedScript = forward
  .replace(
    "packages-galerina/example/src/index.ts#Candidate",
    "packages-galerina/example/scripts/run-tests.mjs#SearchGraph.setFile",
  );

test("complete exact slice-close receipt passes", () => {
  const result = run(fixture(base));
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("missing, duplicate and vague skill dispositions refuse", () => {
  for (const body of [
    base.replace(/Skill disposition:.*\n/u, ""),
    `${base}\nSkill disposition: NO_SKILL_UPDATE: duplicate\n`,
    base.replace(/SKILL_UPDATE [a-f0-9]{40}/u, "NO_SKILL_UPDATE:"),
  ]) {
    assert.equal(run(fixture(body)).status, 1);
  }
});

test("unknown and non-runtime threadability are valid fail-closed receipts", () => {
  assert.equal(run(fixture(base.replace("PARALLEL_PURE", "UNKNOWN"))).status, 0);
  assert.equal(run(fixture(base.replace("PARALLEL_PURE", "N/A"))).status, 0);
});

test("unrecognised threadability and incomplete closure refuse", () => {
  assert.equal(run(fixture(base.replace("PARALLEL_PURE", "MAYBE"))).status, 1);
  assert.equal(run(fixture(base.replace("COMPLETE", "INCOMPLETE"))).status, 1);
});

test("forward slice receipts require both skills and exact source identity", () => {
  const name = "slice-323-candidate-fungi-conversion-2026-08-13.md";
  const complete = run(fixture(forward, name));
  assert.equal(complete.status, 0, complete.stderr || complete.stdout);
  for (const body of [
    forward.replace(/Authoring skill disposition:.*\n/u, ""),
    forward.replace(/Scope:.*\n/u, ""),
    forward.replace(/Evidence: source build point.*\n/u, ""),
    forward.replace(/source SHA-256.*\n/u, ""),
  ]) {
    assert.equal(run(fixture(body, name)).status, 1);
  }
});

test("forward scopes accept scripts and qualified methods", () => {
  const name = "slice-448-qualified-script-fungi-conversion-2026-08-13.md";
  const result = run(fixture(qualifiedScript, name));
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("forward scopes refuse traversal and empty path segments", () => {
  const name = "slice-448-noncanonical-scope-fungi-conversion-2026-08-13.md";
  for (const scope of [
    "packages-galerina/example/scripts/../src/index.ts#Candidate",
    "packages-galerina/example/scripts/./run-tests.mjs#module",
    "packages-galerina/example/scripts//run-tests.mjs#module",
  ]) {
    const body = forward.replace(
      "packages-galerina/example/src/index.ts#Candidate",
      scope,
    );
    assert.equal(run(fixture(body, name)).status, 1);
  }
});

test("a frozen legacy report is exempt but cannot hide a new report", () => {
  const root = fixture(base);
  const legacy = join(root, "docs", "reports", "legacy-fungi-conversion-2026-08-11.md");
  writeFileSync(legacy, "# Legacy report without a receipt\n");
  writeFileSync(
    join(root, "governance", "conversion-slice-close-baseline.json"),
    '{"schemaVersion":1,"legacyReports":["legacy-fungi-conversion-2026-08-11.md"]}\n',
  );
  assert.equal(run(root).status, 0);
  writeFileSync(join(root, "docs", "reports", "new-fungi-conversion-2026-08-12.md"), "# Missing receipt\n");
  assert.equal(run(root).status, 1);
});
