import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const TOOL = join(import.meta.dirname, "..", "conversion-queue.mjs");
const digest = "a".repeat(64);

function makeRoot(decisions = []) {
  const root = mkdtempSync(join(tmpdir(), "galerina-conversion-queue-"));
  const paths = ["packages/a/src/a.ts", "packages/a/src/b.mjs", "packages/b/src/c.ts", "packages/b/src/d.js"];
  const ledger = paths.map((path, index) => ({
    path,
    package: index < 2 ? "a" : "b",
    dependencyTranche: index === 0 ? "T0-compiler" : "T3-package-graph",
    declaredFloor: index === 1 ? "bounded-bootstrap-floor" : null,
  }));
  const retirement = { allTrackedExecutablePaths: paths, retirementLedger: ledger, twinnedPairs: [paths[2]] };
  const retirementPath = join(root, "build", "ts-retirement", "ts-retirement.json");
  const decisionsPath = join(root, "governance", "conversion-queue-decisions.json");
  mkdirSync(dirname(retirementPath), { recursive: true });
  mkdirSync(dirname(decisionsPath), { recursive: true });
  writeFileSync(retirementPath, `${JSON.stringify(retirement)}\n`);
  writeFileSync(decisionsPath, `${JSON.stringify({ schemaVersion: 2, decisions })}\n`);
  return root;
}

function run(root, mode) {
  return spawnSync(process.execPath, [TOOL, mode, "--root", root], { encoding: "utf8" });
}

test("queue conserves every executable-family path and fails closed by default", () => {
  const root = makeRoot();
  assert.equal(run(root, "--write").status, 0);
  const queue = JSON.parse(readFileSync(join(root, "build", "conversion-queue", "queue.json"), "utf8"));
  assert.equal(queue.counts.total, 4);
  assert.equal(queue.counts.BOOTSTRAP_FLOOR, 2);
  assert.equal(queue.counts.BLOCKED, 2);
  assert.equal(queue.counts.CANDIDATE, 0);
  assert.equal(queue.entries[2].reason, "EXISTING_FUNGI_NOT_CONSUMER_AUTHORITY");
  assert.equal(run(root, "--check").status, 0);
});

test("an exact evidence-bound decision can admit a candidate", () => {
  const root = makeRoot([{
    path: "packages/b/src/d.js",
    scope: "WHOLE_FILE",
    symbols: [],
    classification: "CANDIDATE",
    reason: "BOUNDED_PURE_LEAF_DOSSIER",
    evidenceDigest: digest,
  }]);
  assert.equal(run(root, "--write").status, 0);
  const queue = JSON.parse(readFileSync(join(root, "build", "conversion-queue", "queue.json"), "utf8"));
  assert.equal(queue.counts.CANDIDATE, 1);
});

test("a symbol-scoped candidate preserves the file denominator and authorizes only named symbols", () => {
  const root = makeRoot();
  const decisionsPath = join(root, "governance", "conversion-queue-decisions.json");
  writeFileSync(decisionsPath, `${JSON.stringify({
    schemaVersion: 2,
    decisions: [{
      path: "packages/b/src/d.js",
      scope: "SYMBOLS",
      symbols: ["alphaDecision", "betaDecision"],
      classification: "CANDIDATE",
      reason: "BOUNDED_PURE_LEAF_DOSSIER",
      evidenceDigest: digest,
    }],
  })}\n`);

  assert.equal(run(root, "--write").status, 0);
  const queue = JSON.parse(readFileSync(join(root, "build", "conversion-queue", "queue.json"), "utf8"));
  assert.equal(queue.counts.total, 4);
  assert.equal(queue.counts.CANDIDATE, 0);
  assert.equal(queue.counts.BLOCKED, 2);
  assert.equal(queue.scopedCandidateCount, 2);
  assert.equal(queue.scopedCandidateFileCount, 1);
  assert.equal(queue.entries[3].classification, "BLOCKED");
  assert.equal(queue.entries[3].reason, "SCOPED_CANDIDATES_ONLY");
  assert.deepEqual(queue.scopedCandidates, [
    {
      path: "packages/b/src/d.js",
      symbol: "alphaDecision",
      reason: "BOUNDED_PURE_LEAF_DOSSIER",
      evidenceDigest: digest,
    },
    {
      path: "packages/b/src/d.js",
      symbol: "betaDecision",
      reason: "BOUNDED_PURE_LEAF_DOSSIER",
      evidenceDigest: digest,
    },
  ]);
});

test("unknown, duplicate and bootstrap-floor overrides refuse", () => {
  const candidate = { scope: "WHOLE_FILE", symbols: [], classification: "CANDIDATE", reason: "DOSSIER", evidenceDigest: digest };
  for (const decisions of [
    [{ path: "missing.ts", ...candidate }],
    [{ path: "packages/b/src/d.js", ...candidate }, { path: "packages/b/src/d.js", ...candidate }],
    [{ path: "packages/a/src/a.ts", ...candidate }],
  ]) {
    assert.equal(run(makeRoot(decisions), "--write").status, 1);
  }
});

test("malformed symbol scopes and scope widening refuse", () => {
  const base = {
    path: "packages/b/src/d.js",
    scope: "SYMBOLS",
    symbols: ["alphaDecision"],
    classification: "CANDIDATE",
    reason: "DOSSIER",
    evidenceDigest: digest,
  };
  for (const decision of [
    { ...base, symbols: [] },
    { ...base, symbols: ["betaDecision", "alphaDecision"] },
    { ...base, symbols: ["alphaDecision", "alphaDecision"] },
    { ...base, symbols: ["not-a-symbol"] },
    { ...base, classification: "BLOCKED" },
    { ...base, scope: "WHOLE_FILE" },
    { ...base, path: "packages/a/src/a.ts" },
  ]) {
    assert.equal(run(makeRoot([decision]), "--write").status, 1);
  }
});
