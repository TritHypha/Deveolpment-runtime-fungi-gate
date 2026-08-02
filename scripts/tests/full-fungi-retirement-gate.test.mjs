import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const SCRIPT = resolve("scripts/ts-retirement-graph.mjs");
const SELFHOST_SCRIPT = resolve("scripts/audit-selfhost-readiness.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function command(root, executable, args) {
  return spawnSync(executable, args, {
    cwd: root,
    encoding: "utf8",
  });
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "full-fungi-retirement-"));
  write(
    root,
    "packages-galerina/galerina-core/src/index.ts",
    "export const value = 1;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/src/index.fungi",
    "pure flow value() -> Int { return 1 }\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/tests/index.test.ts",
    "export const testValue = true;\n",
  );
  write(
    root,
    "packages-galerina/galerina-core/host/bridge.ts",
    "export const bridge = true;\n",
  );
  write(
    root,
    "docs/security/rd0528-compiler-authoritative-stages.json",
    JSON.stringify({ twins: [] }),
  );
  write(
    root,
    "docs/security/rd0361-authoritative-twins.json",
    JSON.stringify({ twins: [] }),
  );
  assert.equal(command(root, "git", ["init"]).status, 0);
  assert.equal(
    command(root, "git", ["add", "--", "packages-galerina", "docs"]).status,
    0,
  );
  return root;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function postSlideFixture({
  authorizeFungi = true,
  candidateFungi = false,
  crlfSource = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "full-fungi-post-slide-"));
  const source = "pure flow value() -> Int { return 1 }\n";
  const storedSource = crlfSource ? source.replaceAll("\n", "\r\n") : source;
  const evidence = `${JSON.stringify({
    schema: "galerina.slide.checked-decision-frontend.v1",
    frontendId: "@galerina/core-compiler",
    frontendVersion: "1.0.0-beta.2",
    languageEdition: 1,
    packageId: "@galerina/core",
    profileId: "galerina.package.test.v1",
    sourceNormalization: "UTF8_LF_V1",
    sourceByteLength: Buffer.byteLength(source),
    sourceDigest: sha256(source),
    flowName: "value",
    parameters: [{ index: 0, name: "admitted", typeName: "Bool" }],
    returnType: "Int",
    k3Sensitive: false,
    semanticTokenDigest: "b".repeat(64),
    mappings: [{ instructionId: 0, kind: "BOOLEAN_ALLOW", startByte: 0, endByte: 1 }],
    decisionGraphCanonical: "[\"BOOLEAN_ALL\",[0],1,-1]",
    decisionGraphDigest: "a".repeat(64),
    instructionCount: 1,
    diagnosticDigest: "c".repeat(64),
    memoryPlanDigest: "d".repeat(64),
    effectPlanDigest: "e".repeat(64),
    failurePlanDigest: "f".repeat(64),
    capabilityPlanDigest: "1".repeat(64),
    producerGIRDigest: "2".repeat(64),
    deterministic: true,
    referenceOnly: true,
  }, null, 2)}\n`;
  write(
    root,
    "packages-galerina/galerina-core/src/index.fungi",
    storedSource,
  );
  write(
    root,
    "packages-galerina/galerina-core/package.fungi.json",
    JSON.stringify({ name: "galerina-core", version: "1.0.0" }),
  );
  write(root, "evidence/index.txt", evidence);
  write(
    root,
    "docs/security/rd0528-compiler-authoritative-stages.json",
    JSON.stringify({ twins: [] }),
  );
  write(
    root,
    "docs/security/rd0361-authoritative-twins.json",
    JSON.stringify({ twins: [] }),
  );
  write(
    root,
    "docs/security/post-slide-execution-authority.json",
    `${JSON.stringify({
      schemaVersion: 3,
      minimumReceiptSerial: 1,
      verificationTime: null,
      candidates: candidateFungi
        ? [{
          path: "packages-galerina/galerina-core/src/index.fungi",
          ownerPackage: "galerina-core",
          tranche: "core",
          profileId: "galerina.package.test.v1",
          state: "candidate",
          sourceSha256: sha256(source),
          graphSha256: "a".repeat(64),
          evidencePath: "evidence/index.txt",
          evidenceSha256: sha256(evidence),
        }]
        : [],
      fungiSources: authorizeFungi
        ? [{
          path: "packages-galerina/galerina-core/src/index.fungi",
          ownerPackage: "galerina-core",
          tranche: "core",
          authority: "executed",
          sourceSha256: sha256(source),
          evidencePath: "evidence/index.txt",
          evidenceSha256: sha256(evidence),
        }]
        : [],
      hostBridges: [],
    }, null, 2)}\n`,
  );
  write(
    root,
    "scripts/flat-package-topology-baseline.json",
    JSON.stringify({ schemaVersion: 1, legacyNestedNativeManifests: [] }),
  );
  assert.equal(command(root, "git", ["init"]).status, 0);
  assert.equal(command(root, "git", ["add", "-A"]).status, 0);
  return root;
}

function run(root, args = []) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

function runSelfhost(root, args = []) {
  return spawnSync(process.execPath, [SELFHOST_SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
  });
}

test("terminal retirement refuses every tracked package TypeScript path", () => {
  const root = fixture();
  try {
    const result = run(root, ["--terminal-check", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.allTrackedTs, 3);
    assert.deepEqual(evidence.allTrackedTsPaths, [
      "packages-galerina/galerina-core/host/bridge.ts",
      "packages-galerina/galerina-core/src/index.ts",
      "packages-galerina/galerina-core/tests/index.test.ts",
    ]);
    assert.equal(evidence.terminalReady, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("retirement gate refuses a missing root argument", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--root", "--post-slide"], {
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--root requires a value/);
});

test("moving TypeScript outside src cannot hide retirement debt", () => {
  const root = fixture();
  try {
    const source = join(
      root,
      "packages-galerina",
      "galerina-core",
      "src",
      "index.ts",
    );
    const hidden = join(
      root,
      "packages-galerina",
      "galerina-core",
      "legacy",
      "index.ts",
    );
    mkdirSync(dirname(hidden), { recursive: true });
    renameSync(source, hidden);
    assert.equal(
      command(root, "git", ["add", "-A", "--", "packages-galerina"]).status,
      0,
    );

    const result = run(root, ["--terminal-check", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.allTrackedTs, 3);
    assert.ok(
      evidence.allTrackedTsPaths.includes(
        "packages-galerina/galerina-core/legacy/index.ts",
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE refuses text evidence claimed as production execution", () => {
  const root = postSlideFixture();
  try {
    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.postSlideReady, false);
    assert.equal(evidence.totals.unexecutedFungi, 1);
    assert.equal(evidence.totals.unownedHostBridges, 0);
    assert.ok(evidence.postSlideViolations.some(
      (item) => item.includes("requires one canonical verificationTime"),
    ));
    const readiness = runSelfhost(root, ["--post-slide", "--json"]);
    assert.equal(readiness.status, 0);
    const sourceOnly = JSON.parse(readiness.stdout);
    assert.equal(sourceOnly.authority, "post-slide-source-readiness-gate");
    assert.equal(sourceOnly.ready, true);
    assert.notEqual(sourceOnly.authority, "post-slide-execution-authority");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE records an exact candidate without counting it as executed", () => {
  const root = postSlideFixture({ authorizeFungi: false, candidateFungi: true });
  try {
    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.candidateFungi, 1);
    assert.deepEqual(evidence.candidateFungiPaths, [
      "packages-galerina/galerina-core/src/index.fungi",
    ]);
    assert.equal(evidence.totals.executedFungi, 0);
    assert.equal(evidence.totals.unexecutedFungi, 1);
    assert.equal(evidence.postSlideReady, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE candidate identity is stable across an admitted CRLF checkout", () => {
  const root = postSlideFixture({
    authorizeFungi: false,
    candidateFungi: true,
    crlfSource: true,
  });
  try {
    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.totals.candidateFungi, 1);
    assert.equal(evidence.totals.executedFungi, 0);
    assert.ok(!evidence.postSlideViolations.some(
      (item) => item.includes("source digest does not match"),
    ));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("self-host readiness post-SLIDE profile refuses implementation TypeScript", () => {
  const root = fixture();
  try {
    const result = runSelfhost(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.equal(evidence.ready, false);
    assert.ok(evidence.violations.some((item) => item.includes("TypeScript")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE refuses an unexecuted Fungi source", () => {
  const root = postSlideFixture({ authorizeFungi: false });
  try {
    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.deepEqual(evidence.unexecutedFungiPaths, [
      "packages-galerina/galerina-core/src/index.fungi",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE refuses nested package identities and package node_modules", () => {
  const root = postSlideFixture();
  try {
    write(
      root,
      "packages-galerina/galerina-core/plugins/copied/package.fungi.json",
      JSON.stringify({ name: "copied", version: "1.0.0" }),
    );
    write(root, "packages-galerina/galerina-core/node_modules/x/index.js", "x\n");
    assert.equal(command(root, "git", ["add", "-A"]).status, 0);

    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.ok(evidence.postSlideViolations.some((item) => item.includes("nested native")));
    assert.ok(evidence.postSlideViolations.some((item) => item.includes("node_modules")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE refuses a host bridge without digest-bound ownership", () => {
  const root = postSlideFixture();
  try {
    write(
      root,
      "packages-galerina/galerina-core/host/bridge.mjs",
      "export const opaqueHostAdapter = 1;\n",
    );
    assert.equal(command(root, "git", ["add", "-A"]).status, 0);

    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.deepEqual(evidence.unownedHostBridgePaths, [
      "packages-galerina/galerina-core/host/bridge.mjs",
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE refuses stale or substituted execution evidence", () => {
  const root = postSlideFixture({ authorizeFungi: false, candidateFungi: true });
  try {
    write(root, "evidence/index.txt", "substituted evidence\n");
    assert.equal(command(root, "git", ["add", "-A"]).status, 0);

    const result = run(root, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.ok(evidence.postSlideViolations.some((item) => item.includes("evidence digest")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("post-SLIDE authority ledger requires bounded canonical JSON", () => {
  const canonicalRoot = postSlideFixture({
    authorizeFungi: false,
    candidateFungi: true,
  });
  try {
    const ledgerPath = join(
      canonicalRoot,
      "docs/security/post-slide-execution-authority.json",
    );
    const canonical = readFileSync(ledgerPath, "utf8");
    writeFileSync(ledgerPath, `${canonical.trimEnd()}  \n`);
    assert.equal(command(canonicalRoot, "git", ["add", "-A"]).status, 0);
    const result = run(canonicalRoot, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.ok(evidence.postSlideViolations.some(
      (item) => item.includes("canonical JSON"),
    ));
  } finally {
    rmSync(canonicalRoot, { recursive: true, force: true });
  }

  const duplicateRoot = postSlideFixture({ authorizeFungi: false });
  try {
    write(
      duplicateRoot,
      "docs/security/post-slide-execution-authority.json",
      '{"schemaVersion":3,"schemaVersion":3,"minimumReceiptSerial":1,"verificationTime":null,"candidates":[],"fungiSources":[],"hostBridges":[]}\n',
    );
    assert.equal(command(duplicateRoot, "git", ["add", "-A"]).status, 0);
    const result = run(duplicateRoot, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.ok(evidence.postSlideViolations.some(
      (item) => item.includes("repeats decoded key"),
    ));
  } finally {
    rmSync(duplicateRoot, { recursive: true, force: true });
  }

  const oversizedRoot = postSlideFixture({ authorizeFungi: false });
  try {
    write(
      oversizedRoot,
      "docs/security/post-slide-execution-authority.json",
      " ".repeat((1024 * 1024) + 1),
    );
    assert.equal(command(oversizedRoot, "git", ["add", "-A"]).status, 0);
    const result = run(oversizedRoot, ["--post-slide", "--json"]);
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(result.stdout);
    assert.ok(evidence.postSlideViolations.some(
      (item) => item.includes("byte limit"),
    ));
  } finally {
    rmSync(oversizedRoot, { recursive: true, force: true });
  }
});
