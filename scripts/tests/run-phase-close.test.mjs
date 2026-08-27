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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const RUNNER = join(TEST_DIR, "..", "run-phase-close.mjs");
const LEGACY_RUNNER = join(TEST_DIR, "..", "run-phase-close-legacy.mjs");
const require = createRequire(import.meta.url);
const { acquireSuiteLease } = require("../lib/suite-run-lease.cjs");
const RESULT_MODULE = new URL("../lib/phase-close-result.mjs", import.meta.url);
const resultApi = await import(RESULT_MODULE).catch(() => ({}));
const runnerSource = readFileSync(RUNNER, "utf8");
const legacyRunnerSource = readFileSync(LEGACY_RUNNER, "utf8");
const liveManifest = JSON.parse(readFileSync(resolve("governance/phase-close-commands.json"), "utf8"));
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

function manifestEntry(entry, cadences) {
  const requirementId = `REQ-${entry.name.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
  return {
    id: entry.name,
    requirementId,
    satisfies: [requirementId],
    execution: { kind: "process", command: entry.command },
    acceptedExitCodes: [0],
    leasePolicy: "none",
    cwd: entry.cwd ?? ".",
    toolClass: "legacy-oracle",
    authorityClass: "blocking",
    cadences,
    outcomePolicy: "blocking",
    subjects: { kind: "requirements", values: [requirementId], expectedCount: 1 },
    timeoutMs: entry.timeoutMs ?? 30_000,
    maxOutputBytes: 1_048_576,
    generatedOutputs: [],
    nestedTools: [],
    mutationPolicy: "read-only",
    platforms: ["win32", "linux", "darwin"],
    selfTest: { kind: "absent", reason: "runner fixture" },
    predecessors: [],
    lifecycle: {
      replacementId: { kind: "absent", reason: "not replaced" },
      overlap: "canonical",
      retirement: "active",
      evidence: { kind: "absent", reason: "active fixture" },
    },
  };
}

function fixture({ phaseClose = [], exhaustive = [], entries, useManifest = true }) {
  const root = mkdtempSync(join(tmpdir(), "galerina-phase-close-"));
  roots.push(root);
  if (useManifest) {
    write(root, "governance/phase-close-commands.json", JSON.stringify({
      schemaVersion: 1,
      entries: entries ?? [
        ...phaseClose.map((entry) => manifestEntry(entry, ["normal", "exhaustive"])),
        ...exhaustive.map((entry) => manifestEntry(entry, ["exhaustive"])),
      ],
    }));
  }
  return root;
}

function run(root, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args, "--json"],
    { encoding: "utf8", timeout: 30_000 },
  );
}

function runWithEnvironment(root, environment, ...args) {
  return spawnSync(
    process.execPath,
    [RUNNER, "--root", root, ...args, "--json"],
    { encoding: "utf8", timeout: 30_000, env: { ...process.env, ...environment } },
  );
}

test("one failed child makes phase-close exit non-zero", () => {
  const root = fixture({
    phaseClose: [
      { name: "green", command: ["node", "green.mjs"] },
      { name: "red", command: ["node", "red.mjs"] },
    ],
  });
  write(root, "green.mjs", "process.exit(0);\n");
  write(root, "red.mjs", "process.exit(7);\n");

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.deepEqual(report.failed, ["red"]);
  assert.equal(report.results[1].exitCode, 7);
  assert.deepEqual(report.results[0].processControl, {
    ownedTree: true,
    cleanupAttempted: false,
    cleanupAcknowledged: false,
    timedOut: false,
    outputLimitExceeded: false,
  });
});

test("each phase-close child has an observable start and end heartbeat", () => {
  const root = fixture({
    phaseClose: [{ name: "visible-gate", command: ["node", "visible.mjs"] }],
  });
  write(root, "visible.mjs", "process.exit(0);\n");

  const result = run(root);

  assert.equal(result.status, 0);
  assert.match(result.stderr, /PHASE-CLOSE START visible-gate/);
  assert.match(result.stderr, /PHASE-CLOSE END visible-gate PASS/);
});

test("the branded plan supplies the exact cadence to child wrappers", () => {
  const root = fixture({
    phaseClose: [{ name: "cadence", command: ["node", "cadence.mjs"] }],
  });
  write(root, "cadence.mjs", [
    'if (process.env.GALERINA_ASSURANCE_CADENCE !== "normal") process.exit(9);',
    'console.log(`SUMMARY: ${process.env.GALERINA_ASSURANCE_CADENCE}`);',
  ].join("\n"));

  const result = run(root, "--cadence", "normal");

  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).results[0].detail, "normal");
});

test("phase-close supplies explicit absolute KB and SLIDE roots to governed children", () => {
  const root = fixture({
    phaseClose: [{ name: "external-roots", command: ["node", "external-roots.mjs"] }],
  });
  const kb = join(root, "kb");
  const slide = join(root, "slide");
  mkdirSync(kb);
  mkdirSync(slide);
  write(root, "external-roots.mjs", [
    `if (process.env.GALERINA_KB_DIR !== ${JSON.stringify(kb)}) process.exit(8);`,
    `if (process.env.GALERINA_SLIDE_DIR !== ${JSON.stringify(slide)}) process.exit(9);`,
  ].join("\n"));

  const result = runWithEnvironment(root, {
    GALERINA_KB_DIR: kb,
    GALERINA_SLIDE_DIR: slide,
  });

  assert.equal(result.status, 0, result.stderr);
});

test("phase-close refuses relative external repository roots before child execution", () => {
  const root = fixture({
    phaseClose: [{ name: "must-not-run", command: ["node", "must-not-run.mjs"] }],
  });
  write(root, "must-not-run.mjs", 'import { writeFileSync } from "node:fs"; writeFileSync("ran.txt", "yes");\n');

  const result = runWithEnvironment(root, { GALERINA_SLIDE_DIR: "relative-slide" });

  assert.notEqual(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REFUSED");
  assert.match(report.detail, /GALERINA_SLIDE_DIR requires an absolute path/u);
  assert.equal(existsSync(join(root, "ran.txt")), false);
});

test("phase-close supplies a bounded Go cache outside the repository", () => {
  const root = fixture({
    phaseClose: [{ name: "go-cache", command: ["node", "go-cache.mjs"] }],
  });
  write(root, "go-cache.mjs", [
    'import { isAbsolute, relative } from "node:path";',
    'const cache = process.env.GOCACHE ?? "";',
    'if (!isAbsolute(cache)) process.exit(8);',
    'if (!relative(process.cwd(), cache).startsWith("..")) process.exit(9);',
    'if (!cache.endsWith("galerina-go-build-cache")) process.exit(10);',
  ].join("\n"));

  const result = run(root);

  assert.equal(result.status, 0, result.stderr);
});

test("--report-only cannot describe a failed run as green", () => {
  const root = fixture({
    phaseClose: [{ name: "red", command: ["node", "red.mjs"] }],
  });
  write(root, "red.mjs", "process.exit(9);\n");

  const result = run(root, "--report-only");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REPORT_ONLY_FAILED");
  assert.equal(report.authorizing, false);
  assert.deepEqual(report.failed, ["red"]);
});

test("exhaustive includes both phase-close and exhaustive commands", () => {
  const root = fixture({
    phaseClose: [{ name: "base", command: ["node", "base.mjs"] }],
    exhaustive: [{ name: "heavy", command: ["node", "heavy.mjs"] }],
  });
  write(root, "base.mjs", "process.exit(0);\n");
  write(root, "heavy.mjs", "process.exit(0);\n");

  const result = run(root, "--tier", "exhaustive");

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "PASS");
  assert.deepEqual(
    report.results.map((item) => item.name),
    ["base", "heavy"],
  );
});

test("a missing or malformed command result fails closed", () => {
  const root = fixture({
    phaseClose: [{
      name: "missing",
      command: ["node-command-that-does-not-exist", "x"],
    }],
  });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "FAIL");
  assert.equal(report.results[0].ok, false);
  assert.match(report.results[0].detail, /spawn|status|missing/i);
});

test("a Node test child uses its final pass summary instead of an unrelated total", () => {
  const root = fixture({
    phaseClose: [{ name: "tests:tooling", command: ["node", "tooling.mjs"] }],
  });
  write(root, "tooling.mjs", [
    `console.log("fixture total debt: 999");`,
    `console.log("pass 3");`,
    `console.log("fail 0");`,
  ].join("\n") + "\n");

  const result = run(root);

  assert.equal(result.status, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.results[0].detail, "3 tests pass");
});

test("malformed governance-diff JSON is an explicit failed result", () => {
  assert.equal(typeof resultApi.parseGovernanceDiff, "function");

  const malformed = resultApi.parseGovernanceDiff("{", {
    status: 0,
    signal: null,
    error: undefined,
  });
  assert.equal(malformed.ok, false);
  assert.equal(malformed.code, "GOVERNANCE-DIFF-UNPARSEABLE");

  const clean = resultApi.parseGovernanceDiff(
    JSON.stringify({ changeClass: "neutral", summary: "no .fungi changes" }),
    { status: 0, signal: null, error: undefined },
  );
  assert.equal(clean.ok, true);
  assert.equal(clean.changeClass, "neutral");
});

test("the preserved legacy oracle retains the former generated-evidence checks", () => {
  assert.doesNotMatch(
    legacyRunnerSource,
    /spawnSync\(/,
    "every phase-close child must use the owned process-tree boundary",
  );
  assert.match(
    legacyRunnerSource,
    /run\("audit:node-floor", "node", \["scripts\/audit-node-dependencies\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("graph:all", "node", \["scripts\/graph-all\.mjs", "--quiet", "--check", "--json"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /runSemanticCoverageFromGraphAll\(graphAll\)/,
  );
  assert.match(legacyRunnerSource, /if \(options\.staticOracle\) return null/);
  assert.equal(
    (legacyRunnerSource.match(/^runSemanticCoverageFromGraphAll\(graphAll\);$/gm) ?? []).length,
    1,
    "semantic coverage must be one exact blocking phase-close gate",
  );
  assert.equal(
    (legacyRunnerSource.match(/run\("semantic:coverage"/g) ?? []).length,
    0,
    "the named semantic gate must consume exactly one graph-all result rather than launch a second owner",
  );
  assert.match(
    legacyRunnerSource,
    /run\("remote-shell-install", "node", \["scripts\/audit-remote-shell-install\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-index", "node", \["scripts\/code-index\.mjs", "--check"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("audit:canonical-test-counts", "node", \["scripts\/audit-canonical-test-counts\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-registry", "node", \["scripts\/gen-code-registry\.mjs", "--check"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-catalog-coverage:selftest", "node", \["scripts\/audit-code-catalog-coverage\.mjs", "--self-test"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("code-catalog-coverage", "node", \["scripts\/audit-code-catalog-coverage\.mjs"\]\)/,
  );
  assert.match(
    legacyRunnerSource,
    /run\("r4-twin-hashes", "node", \["scripts\/gather-r4-twin-hashes\.mjs", "--verify-ledger"\]\)/,
  );
  for (const [name, mode] of [
    ["tests:patterns", "patterns"],
    ["audit:security", "security"],
    ["audit:naming", "naming"],
    ["manifest:cbor", "cbor"],
    ["governance:diff", "governance-diff"],
  ]) {
    assert.match(
      legacyRunnerSource,
      new RegExp(`runStaticOracleSpecial\\("${name}", "${mode}"\\)`),
      `${name} must use the same owned special-check process in the static oracle`,
    );
  }
});

test("composed phase-close invokes semantic coverage once and blocks its refusal", () => {
  const graphEntry = manifestEntry({
    name: "graph:all",
    command: ["node", "scripts/graph-all.mjs", "--quiet", "--check", "--json"],
  }, ["normal"]);
  const semanticEntry = {
    ...manifestEntry({ name: "semantic:coverage", command: ["node", "unused.mjs"] }, ["normal"]),
    toolClass: "verifier",
    execution: {
      kind: "predecessor-receipt",
      predecessorId: "graph:all",
      verifierId: "graph-all-semantic-v1",
    },
    predecessors: ["graph:all"],
  };
  const root = fixture({ entries: [graphEntry, semanticEntry] });
  write(root, "scripts/graph-all.mjs", readFileSync(resolve("scripts/graph-all.mjs"), "utf8"));
  const graphChildren = [
    "package-graph-generator.mjs",
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "dev-tool-index.mjs",
    "fungi-source-capability-inventory.mjs",
  ];
  for (const name of graphChildren) {
    write(root, `scripts/${name}`, "process.exit(0);\\n");
  }
  write(root, "scripts/gen-assurance-semantic-graph.mjs", [
    'import { appendFileSync } from "node:fs";',
    'appendFileSync("semantic-calls.log", "semantic\\n");',
    'process.exit(7);',
  ].join("\n"));

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  const semantic = report.results.find((entry) => entry.name === "semantic:coverage");
  assert.equal(semantic?.ok, false);
  assert.equal(semantic?.exitCode, 1);
  assert.equal(semantic?.detail, "predecessor receipt refused");
  assert.deepEqual(readFileSync(join(root, "semantic-calls.log"), "utf8").trim().split(/\r?\n/), ["semantic"]);
});

test("composed phase-close accepts semantic coverage from the complete graph receipt", () => {
  const graphEntry = manifestEntry({
    name: "graph:all",
    command: ["node", "scripts/graph-all.mjs", "--quiet", "--check", "--json"],
  }, ["normal"]);
  const semanticEntry = {
    ...manifestEntry({ name: "semantic:coverage", command: ["node", "unused.mjs"] }, ["normal"]),
    toolClass: "verifier",
    execution: {
      kind: "predecessor-receipt",
      predecessorId: "graph:all",
      verifierId: "graph-all-semantic-v1",
    },
    predecessors: ["graph:all"],
  };
  const root = fixture({ entries: [graphEntry, semanticEntry] });
  write(root, "scripts/graph-all.mjs", readFileSync(resolve("scripts/graph-all.mjs"), "utf8"));
  for (const name of [
    "package-graph-generator.mjs",
    "project-graph-generator.mjs",
    "audit-graph-integrity.mjs",
    "kb-graph-generator.mjs",
    "dev-tool-index.mjs",
    "fungi-source-capability-inventory.mjs",
    "ts-retirement-graph.mjs",
    "gen-assurance-semantic-graph.mjs",
    "gen-roadmap.mjs",
  ]) {
    write(root, `scripts/${name}`, "process.exit(0);\n");
  }

  const result = run(root, "--tier", "phase-close");

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const semantic = report.results.find((entry) => entry.name === "semantic:coverage");
  assert.equal(semantic?.ok, true);
  assert.equal(semantic?.detail, "semantic coverage validated from exact graph-all result");
});

test("a held checkout lease refuses phase-close before any child starts", () => {
  const root = fixture({
    phaseClose: [{ name: "must-not-run", command: ["node", "must-not-run.mjs"] }],
  });
  write(
    root,
    "must-not-run.mjs",
    "import { writeFileSync } from 'node:fs'; writeFileSync('ran.txt', 'bad');\n",
  );
  const lease = acquireSuiteLease({ root, commandClass: "all-tests" });

  const result = run(root);

  assert.equal(result.status, 1);
  const report = JSON.parse(result.stdout);
  assert.equal(report.verdict, "REFUSED");
  assert.equal(report.code, "SUITE-LEASE-HELD");
  assert.equal(existsSync(join(root, "ran.txt")), false);
  assert.equal(lease.release(), true);
});

test("the public runner has no source-coded cadence or missing-manifest fallback", () => {
  assert.match(legacyRunnerSource, /run\("audit:node-floor"/);
  assert.doesNotMatch(runnerSource, /run\("audit:node-floor"/);
  assert.doesNotMatch(runnerSource, /if \(!existsSync\(manifestPath\)\) return null/);
  assert.match(runnerSource, /validateAssuranceManifest/);
  assert.match(runnerSource, /buildCadencePlan/);
});

test("the live example diagnostic gate admits the measured Windows runtime envelope", () => {
  const entry = liveManifest.entries.find((candidate) => candidate.id === "example-diagnostics");
  assert.deepEqual(entry?.execution?.command, ["node", "scripts/audit-example-diagnostics.mjs"]);
  assert.equal(Number.isSafeInteger(entry?.timeoutMs), true);
  assert.equal(entry.timeoutMs >= 180_000, true);
});

test("owner-selected phase-close gates retain the 130-second Windows timeout floor", () => {
  for (const [id, minimumTimeoutMs] of [
    ["compiler-stage-twins", 130_000],
    ["kernel-fungi-twins", 130_000],
    ["governance:diff", 130_000],
  ]) {
    const entry = liveManifest.entries.find((candidate) => candidate.id === id);
    assert.equal(Number.isSafeInteger(entry?.timeoutMs), true, `${id} must declare a finite timeout`);
    assert.equal(entry.timeoutMs >= minimumTimeoutMs, true, `${id} timeout is below the owner-selected floor`);
  }
});
