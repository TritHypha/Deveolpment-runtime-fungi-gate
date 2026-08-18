import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  DRIFT_SCHEMA,
  evaluateDriftReport,
} from "../lib/ts-fungi-drift/core.mjs";

const BASELINE_CLI = join(import.meta.dirname, "..", "audit-real-fungi-conversion-baseline.mjs");
const DRIFT_CLI = join(import.meta.dirname, "..", "audit-ts-fungi-drift.mjs");

const digest = (character) => `sha256:${character.repeat(64)}`;
const chain = (changedName) => ["source", "candidate", "snapshot", "gir", "physical", "profile", "vok"].map((name) => ({
  name,
  expectedSha256: digest("e"),
  actualSha256: digest(name === changedName ? "f" : "e"),
}));

function run(root, command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8" });
}

function git(root, args) {
  const result = run(root, "git", args);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

function write(root, path, content) {
  const target = join(root, ...path.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

function binding(path, overrides = {}) {
  return {
    path,
    sourcePath: `packages-galerina/example/src/${path}.ts`,
    symbol: path.toUpperCase().replace(/[^A-Z0-9_$]+/gu, "_"),
    provenance: "RECONSTRUCTED",
    candidateRecordedSha256: digest("a"),
    candidateCurrentSha256: digest("a"),
    sourceRecordedSha256: digest("b"),
    sourceCurrentSha256: digest("b"),
    symbolRecordedFingerprint: digest("c"),
    symbolCurrentFingerprint: digest("c"),
    symbolPresent: true,
    chain: [],
    ...overrides,
  };
}

test("the drift core distinguishes source, symbol, candidate, chain and unbound states", () => {
  const report = evaluateDriftReport({
    head: "f".repeat(40),
    bindings: [
      binding("no-drift"),
      binding("source-byte", { sourceCurrentSha256: digest("d") }),
      binding("symbol", { symbolCurrentFingerprint: digest("d") }),
      binding("candidate", { candidateCurrentSha256: digest("d") }),
      binding("chain", {
        provenance: "RUN_CARD",
        chain: chain("gir"),
      }),
      binding("unbound", { symbolPresent: false, symbolRecordedFingerprint: undefined, symbolCurrentFingerprint: undefined }),
    ],
  });

  assert.equal(report.schema, DRIFT_SCHEMA);
  assert.deepEqual(report.counts, {
    total: 6,
    NO_DRIFT: 1,
    SOURCE_BYTE_DRIFT: 1,
    SYMBOL_DRIFT: 1,
    CANDIDATE_BYTE_DRIFT: 1,
    CHAIN_DRIFT: 1,
    UNBOUND: 1,
    ERROR: 0,
  });
  assert.deepEqual(
    Object.fromEntries(report.entries.map((entry) => [entry.path, entry.status])),
    {
      candidate: "CANDIDATE_BYTE_DRIFT",
      chain: "CHAIN_DRIFT",
      "no-drift": "NO_DRIFT",
      "source-byte": "SOURCE_BYTE_DRIFT",
      symbol: "SYMBOL_DRIFT",
      unbound: "UNBOUND",
    },
  );
  assert.equal(report.entries.find((entry) => entry.path === "source-byte").symbolChanged, false);
  assert.equal(report.entries.find((entry) => entry.path === "chain").chain[0].name, "candidate");
  assert.equal(JSON.stringify(report).includes("source body"), false);
});

test("every exact run-card chain digest can independently turn the drift gate red", () => {
  for (const name of ["source", "candidate", "snapshot", "gir", "physical", "profile", "vok"]) {
    const report = evaluateDriftReport({
      head: "f".repeat(40),
      bindings: [binding(name, { provenance: "RUN_CARD", chain: chain(name) })],
    });
    assert.equal(report.entries[0].status, "CHAIN_DRIFT", name);
  }
  const green = evaluateDriftReport({
    head: "f".repeat(40),
    bindings: [binding("green-run-card", { provenance: "RUN_CARD", chain: chain(undefined) })],
  });
  assert.equal(green.entries[0].status, "NO_DRIFT");
  assert.throws(
    () => evaluateDriftReport({
      head: "f".repeat(40),
      bindings: [binding("incomplete", { provenance: "RUN_CARD", chain: chain(undefined).slice(0, 6) })],
    }),
    /require source, candidate, snapshot, GIR, physical, profile and VOK/u,
  );
});

test("a source-byte change does not silently become semantic equivalence", () => {
  const report = evaluateDriftReport({
    head: "f".repeat(40),
    bindings: [binding("same-symbol", { sourceCurrentSha256: digest("d") })],
  });
  assert.equal(report.entries[0].status, "SOURCE_BYTE_DRIFT");
  assert.equal(report.entries[0].symbolChanged, false);
  assert.equal(report.entries[0].semanticEquivalenceClaimed, false);
});

test("drift reports are stable and reject malformed digest or absolute path inputs", () => {
  const entries = [binding("z"), binding("a")];
  const forward = evaluateDriftReport({ head: "f".repeat(40), bindings: entries });
  const reverse = evaluateDriftReport({ head: "f".repeat(40), bindings: [...entries].reverse() });
  assert.deepEqual(forward, reverse);
  assert.throws(
    () => evaluateDriftReport({ head: "f".repeat(40), bindings: [binding("C:/absolute")] }),
    /repository-relative/u,
  );
  assert.throws(
    () => evaluateDriftReport({ head: "f".repeat(40), bindings: [binding("bad-digest", { sourceCurrentSha256: "sha256:no" })] }),
    /digest/u,
  );
});

test("the CLI detects source-file drift while refusing to claim symbol equivalence", () => {
  const root = mkdtempSync(join(tmpdir(), "galerina-ts-fungi-drift-"));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Galerina Test"]);
  git(root, ["config", "user.email", "test@invalid.example"]);
  const sourcePath = write(root, "packages-galerina/example/src/constants.ts", "export const VALUE = \"A\";\n");
  write(root, "packages-galerina/example/src/self-hosted/value.fungi", `@version 1
/// Non-authorizing sandbox candidate; TypeScript remains the oracle.
/// TypeScript oracle: packages-galerina/example/src/constants.ts#VALUE
pure flow value() -> String { return "A" }
`);
  git(root, ["add", "--", "packages-galerina"]);
  git(root, ["commit", "-q", "-m", "candidate"]);
  appendFileSync(sourcePath, "export const UNRELATED = 1;\n");
  git(root, ["add", "--", "packages-galerina/example/src/constants.ts"]);
  git(root, ["commit", "-q", "-m", "unrelated source edit"]);

  const baselinePath = "build/baseline.json";
  const baseline = run(root, process.execPath, [BASELINE_CLI, "--root", root, "--out", baselinePath]);
  assert.equal(baseline.status, 1, baseline.stderr || baseline.stdout);
  const selfTest = run(root, process.execPath, [DRIFT_CLI, "--self-test"]);
  assert.equal(selfTest.status, 0, selfTest.stderr || selfTest.stdout);

  const driftPath = "build/drift.json";
  const result = run(root, process.execPath, [DRIFT_CLI, "--root", root, "--baseline", baselinePath, "--out", driftPath]);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(readFileSync(join(root, ...driftPath.split("/")), "utf8"));
  assert.equal(report.counts.SOURCE_BYTE_DRIFT, 1);
  assert.equal(report.entries[0].symbolChanged, false);
  assert.equal(report.entries[0].semanticEquivalenceClaimed, false);
  assert.equal(JSON.stringify(report).includes(root), false);

  const check = run(root, process.execPath, [DRIFT_CLI, "--root", root, "--baseline", baselinePath, "--out", driftPath, "--check"]);
  assert.equal(check.status, 1, check.stderr || check.stdout);
  assert.match(check.stdout, /report current/u);

  git(root, ["add", "--", baselinePath, driftPath]);
  git(root, ["commit", "-q", "-m", "record drift reports"]);
  const committedCheck = run(root, process.execPath, [DRIFT_CLI, "--root", root, "--baseline", baselinePath, "--out", driftPath, "--check"]);
  assert.equal(committedCheck.status, 1, committedCheck.stderr || committedCheck.stdout);
  assert.match(committedCheck.stdout, /report current/u);
});
