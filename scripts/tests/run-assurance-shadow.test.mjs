import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { after, describe, it } from "node:test";
import {
  compareResultSets,
  normalizeLegacyReport,
} from "../lib/assurance-fabric/differential.mjs";
import {
  RESULT_TAG,
  SOURCE_CLASS,
  TRIT,
  makeAssuranceResult,
} from "../lib/assurance-fabric/result-model.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const cli = join(repositoryRoot, "scripts", "run-assurance-shadow.mjs");
const temporaryRoots = [];
after(() => {
  for (const root of temporaryRoots) rmSync(root, { recursive: true, force: true });
});

function git(root, ...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function candidateEntry(id, script, overrides = {}) {
  return {
    id,
    requirementId: `REQ-${id.toUpperCase()}`,
    command: ["node", script],
    cwd: ".",
    toolClass: "legacy-oracle",
    authorityClass: "blocking",
    cadences: ["normal"],
    outcomePolicy: "blocking",
    subjects: { kind: "files", values: [script], expectedCount: 1 },
    timeoutMs: 5_000,
    maxOutputBytes: 4096,
    generatedOutputs: [],
    mutationPolicy: "read-only",
    platforms: [process.platform],
    selfTest: { kind: "absent", reason: "fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "overlap",
      retirement: "shadow",
    },
    ...overrides,
  };
}

function writeCandidate(root, name, entries) {
  const relativePath = join("governance", name);
  writeFileSync(
    join(root, relativePath),
    JSON.stringify({ schemaVersion: 1, entries }, null, 2),
  );
  return relativePath;
}

function fixture(options = {}) {
  const root = mkdtempSync(join(tmpdir(), "galerina-assurance-shadow-"));
  temporaryRoots.push(root);
  mkdirSync(join(root, "governance"), { recursive: true });
  writeFileSync(join(root, "green.mjs"), "process.exit(0)\n");
  writeFileSync(join(root, "red.mjs"), "process.exit(7)\n");
  writeFileSync(join(root, "drift.mjs"), [
    'import { spawnSync } from "node:child_process";',
    'const result = spawnSync("git", ["commit", "--allow-empty", "-m", "fixture drift"], { encoding: "utf8" });',
    'process.exit(result.status ?? 1);',
    "",
  ].join("\n"));

  const legacyEntries = options.drift
    ? [{ name: "drift", command: ["node", "drift.mjs"], timeoutMs: 5_000 }]
    : [
      { name: "green", command: ["node", "green.mjs"], timeoutMs: 5_000 },
      { name: "red", command: ["node", "red.mjs"], timeoutMs: 5_000 },
    ];
  if (options.malformedLegacy) {
    writeFileSync(join(root, "governance", "phase-close-commands.json"), "{");
  } else {
    writeFileSync(
      join(root, "governance", "phase-close-commands.json"),
      JSON.stringify({ schemaVersion: 1, phaseClose: legacyEntries, exhaustive: [] }, null, 2),
    );
  }

  const agreementEntries = options.drift
    ? [candidateEntry("drift", "drift.mjs")]
    : [candidateEntry("green", "green.mjs"), candidateEntry("red", "red.mjs")];
  const agreement = writeCandidate(root, "candidate-agreement.json", agreementEntries);
  const missing = writeCandidate(root, "candidate-missing.json", [candidateEntry("green", "green.mjs")]);
  const mismatch = writeCandidate(root, "candidate-mismatch.json", [
    candidateEntry("green", "green.mjs"),
    candidateEntry("red", "green.mjs", {
      subjects: { kind: "files", values: ["green.mjs"], expectedCount: 1 },
    }),
  ]);

  git(root, "init");
  git(root, "config", "user.email", "assurance-fixture@example.invalid");
  git(root, "config", "user.name", "Assurance Fixture");
  git(root, "add", "--all");
  git(root, "commit", "-m", "fixture");
  return { root, agreement, missing, mismatch };
}

function runShadow(root, manifest) {
  return spawnSync(process.execPath, [
    cli,
    "--root", root,
    "--manifest", manifest,
    "--cadence", "normal",
    "--json",
  ], { cwd: repositoryRoot, encoding: "utf8", timeout: 30_000 });
}

function parseReport(run) {
  assert.notEqual(run.stdout.trim(), "", run.stderr);
  return JSON.parse(run.stdout);
}

function legacyReport(results, authorizing = true) {
  return {
    tool: "run-phase-close",
    schemaVersion: 1,
    root: "fixture-root",
    tier: "phase-close",
    verdict: "PASS",
    authorizing,
    failed: [],
    totals: { checks: results.length, passed: results.length, failed: 0 },
    profile: { accountedDurationMs: results.length, slowest: [] },
    results,
  };
}

function legacyResult(name, exitCode = 0, signal = null) {
  return {
    name,
    ok: exitCode === 0,
    durationMs: 1,
    exitCode,
    signal,
    detail: "fixture",
    processControl: { ownedTree: true, cleanupAttempted: false },
  };
}

function candidateRecord(id, exit = 0, trit = TRIT.UNKNOWN) {
  return {
    id,
    result: makeAssuranceResult({
      tag: trit === TRIT.ASSURED ? RESULT_TAG.BLOCKING_PASS : RESULT_TAG.LEGACY_EXIT,
      sourceClass: trit === TRIT.ASSURED ? SOURCE_CLASS.HOST : SOURCE_CLASS.LEGACY_EXIT,
      subjectId: id,
      detail: "fixture",
      trit,
    }),
    exitStatus: { kind: "present", value: exit },
    signalStatus: { kind: "absent", reason: "process signal was not observed" },
    processControl: {
      ownedTree: true,
      cleanupAttempted: false,
      cleanupAcknowledged: false,
      timedOut: false,
      outputLimitExceeded: false,
    },
  };
}

describe("assurance differential model", () => {
  it("normalizes legacy null variants and retains its authority Boolean only as a claim", () => {
    const normalized = normalizeLegacyReport(legacyReport([legacyResult("green")]));
    assert.equal(normalized.legacyClaim, "asserted");
    assert.equal(normalized.authorizing, false);
    assert.deepEqual(normalized.results[0].signalStatus, {
      kind: "absent",
      reason: "legacy signal was absent",
    });
  });

  it("compares exact result identities and refuses duplicates or candidate +1", () => {
    const legacy = normalizeLegacyReport(legacyReport([legacyResult("green")])).results;
    assert.equal(compareResultSets(legacy, [candidateRecord("green")]).verdict, "SHADOW_AGREEMENT_NON_AUTHORIZING");
    assert.throws(() => compareResultSets(legacy, [candidateRecord("green"), candidateRecord("green")]), /duplicate/);
    assert.throws(() => compareResultSets(legacy, [candidateRecord("green", 0, TRIT.ASSURED)]), /positive authority/);
    assert.throws(() => normalizeLegacyReport(legacyReport([
      legacyResult("green"),
      legacyResult("green"),
    ])), /duplicate/);
  });
});

describe("assurance shadow CLI", () => {
  it("reports agreement, omission and mismatch without authority", () => {
    const current = fixture();
    const agreement = runShadow(current.root, current.agreement);
    assert.equal(agreement.status, 0, agreement.stderr);
    const agreementReport = parseReport(agreement);
    assert.equal(agreementReport.verdict, "SHADOW_AGREEMENT_NON_AUTHORIZING");
    assert.equal(agreementReport.authorizing, false);
    assert.equal(JSON.stringify(agreementReport).includes('"authorizing":true'), false);

    const missing = runShadow(current.root, current.missing);
    assert.equal(missing.status, 3, missing.stderr);
    const missingReport = parseReport(missing);
    assert.equal(missingReport.verdict, "SHADOW_UNKNOWN");
    assert.deepEqual(missingReport.missingCandidateIds, ["red"]);

    const mismatch = runShadow(current.root, current.mismatch);
    assert.equal(mismatch.status, 1, mismatch.stderr);
    assert.equal(parseReport(mismatch).verdict, "SHADOW_MISMATCH");
  });

  it("refuses a non-Git root, root escape and malformed legacy output", () => {
    const nonGit = mkdtempSync(join(tmpdir(), "galerina-assurance-nongit-"));
    temporaryRoots.push(nonGit);
    mkdirSync(join(nonGit, "governance"), { recursive: true });
    const candidate = writeCandidate(nonGit, "candidate.json", [candidateEntry("green", "green.mjs")]);
    const nonGitRun = runShadow(nonGit, candidate);
    assert.equal(nonGitRun.status, 3);
    assert.equal(parseReport(nonGitRun).verdict, "SHADOW_UNKNOWN");

    const current = fixture();
    const escaped = runShadow(current.root, "../outside.json");
    assert.equal(escaped.status, 3);
    assert.equal(parseReport(escaped).verdict, "SHADOW_UNKNOWN");

    const malformed = fixture({ malformedLegacy: true });
    const malformedRun = runShadow(malformed.root, malformed.agreement);
    assert.equal(malformedRun.status, 3);
    assert.equal(parseReport(malformedRun).verdict, "SHADOW_UNKNOWN");
  });

  it("reports build-point drift as unknown, never agreement", () => {
    const current = fixture({ drift: true });
    const drift = runShadow(current.root, current.agreement);
    assert.equal(drift.status, 3, drift.stderr);
    const report = parseReport(drift);
    assert.equal(report.verdict, "SHADOW_UNKNOWN");
    assert.equal(report.reason, "BUILD_POINT_DRIFT");
  });
});
