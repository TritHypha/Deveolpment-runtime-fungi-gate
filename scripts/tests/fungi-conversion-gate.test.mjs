import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  CHAIN_STAGES,
  GATE_ROSTER,
  assertGateOutputPath,
  atomicWriteRunCard,
  buildRunCard,
  chainFromSandboxReceipt,
  collectConversionGateRun,
  inspectSourceRequest,
  npmRunInvocation,
  runConversionGateSelfTest,
  validateGateManifest,
} from "../lib/fungi-conversion-gate/index.mjs";

const digest = (character) => `sha256:${character.repeat(64)}`;
const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));

function request(index = 0) {
  return {
    file: `packages-galerina/example/src/constants-${index}.ts`,
    symbol: `VALUE_${index}`,
    sourceSha256: digest(String(index % 10)),
  };
}

function manifest(count = 1, overrides = {}) {
  return {
    schema: "galerina.fungi-conversion-gate.manifest.v1",
    runId: "pilot-2026-08-18-a",
    graphProject: "Galerina-detached-scalar-phase1-20260818-e5bda2c0",
    sandboxOutput: "build/ts-to-fungi-sandbox/pilot-2026-08-18-a",
    requests: Array.from({ length: count }, (_, index) => request(index)),
    ...overrides,
  };
}

function owners() {
  return ["galerina", "slide", "vok", "lyth"].map((ownerKey) => ({
    ownerKey,
    status: "ALLOW",
    code: "READY",
    buildPoint: "a".repeat(40),
    locator: `owner:${ownerKey}`,
  }));
}

function checks(overrides = {}) {
  return GATE_ROSTER.map((id) => ({
    id,
    status: overrides[id] ?? "ALLOW",
    code: overrides[id] === "REFUSED" ? "CONTROL_REFUSED" : "READY",
    locator: `check:${id}`,
  }));
}

function convertedResult(source = digest("0")) {
  return {
    scope: "packages-galerina/example/src/constants-0.ts#VALUE_0",
    outcome: "CONVERTED",
    reasonCode: "CONVERSION_PROVED",
    sourceRetained: true,
    receiptLocator: "sandbox:records/value-0.json",
    chain: Object.fromEntries(
      CHAIN_STAGES.map((stage, index) => [
        stage,
        { digest: stage === "source" ? source : digest(String((index + 1) % 10)), verified: true },
      ]),
    ),
  };
}

function commitPolicy(overrides = {}) {
  return {
    addedFungi: 0,
    reports: 0,
    reportOnlyStreak: 0,
    finalTailException: false,
    precedingQualifyingBatch: false,
    corpusComplete: true,
    exactDuplicates: 0,
    normalizedShadows: 0,
    ...overrides,
  };
}

function card(overrides = {}) {
  return buildRunCard({
    manifest: validateGateManifest(manifest()),
    owners: owners(),
    checks: checks(),
    requests: [convertedResult()],
    commitPolicy: commitPolicy(),
    ...overrides,
  });
}

test("the roster has exactly the twelve declared owners and gates", () => {
  assert.deepEqual(GATE_ROSTER, [
    "constellation-preflight",
    "source-graph-identity",
    "semantic-classifier",
    "candidate-compiler",
    "duplicate-shadow",
    "real-source-output-path",
    "typescript-retained",
    "checked-snapshot-gir",
    "slide-physical-package",
    "vok-readmission",
    "lyth-proof-work",
    "commit-policy",
  ]);
});

test("Windows npm scripts run through Node instead of an unspawnable cmd shim", () => {
  const windows = npmRunInvocation("verify:detached-scalar", {
    platform: "win32",
    nodePath: "C:/Program Files/nodejs/node.exe",
  });
  assert.equal(windows.executable, "C:/Program Files/nodejs/node.exe");
  assert.deepEqual(windows.args, [
    resolve("C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"),
    "run",
    "--silent",
    "verify:detached-scalar",
  ]);
  assert.doesNotMatch(windows.executable, /\.cmd$/iu);

  assert.deepEqual(npmRunInvocation("verify:detached-scalar", { platform: "linux" }), {
    executable: "npm",
    args: ["run", "--silent", "verify:detached-scalar"],
  });
});

test("manifests admit one to ten unique real-package TypeScript scopes", () => {
  assert.equal(validateGateManifest(manifest(1)).requests.length, 1);
  assert.equal(validateGateManifest(manifest(10)).requests.length, 10);
  assert.throws(() => validateGateManifest(manifest(0)), /1\.\.10/u);
  assert.throws(() => validateGateManifest(manifest(11)), /1\.\.10/u);
  const duplicate = manifest(2);
  duplicate.requests[1] = { ...duplicate.requests[0] };
  assert.throws(() => validateGateManifest(duplicate), /duplicate scope/u);
});

test("absolute escaping symlink-shaped and test-overlay output identities refuse", () => {
  for (const file of [
    "C:/outside.ts",
    "/outside.ts",
    "../outside.ts",
    "packages-galerina/example/src/../outside.ts",
    "packages-galerina/example/src\\outside.ts",
    "packages-galerina/galerina-test/src/conversion-overlays/fake.ts",
    "packages-galerina/example/tests/fake.ts",
  ]) {
    assert.throws(
      () => validateGateManifest(manifest(1, { requests: [{ ...request(), file }] })),
      /source path|real package/u,
      file,
    );
  }
  for (const sandboxOutput of [
    "C:/outside",
    "../outside",
    "build/ts-to-fungi-sandbox/../outside",
    "packages-galerina/galerina-test/src/self-hosted/output",
  ]) {
    assert.throws(() => validateGateManifest(manifest(1, { sandboxOutput })), /sandbox output/u);
  }
});

test("a converted request requires every verified digest in the physical chain", () => {
  assert.equal(card().status, "ALLOW");
  for (const stage of CHAIN_STAGES) {
    const result = convertedResult();
    result.chain[stage] = { ...result.chain[stage], verified: false };
    assert.equal(card({ requests: [result] }).status, "REFUSED", stage);
  }
});

test("sandbox receipt chain extraction detects every missing or tampered stage", () => {
  const receipt = {
    source: { sourceSha256: digest("0") },
    candidate: { sha256: digest("1") },
    evidence: {
      logicAnalysis: { status: "SUPPORTED" },
      compiler: {
        green: true,
        checkedSnapshotSha256: digest("2"),
        girHashFirst: digest("3"),
        girHashSecond: digest("3"),
      },
      physical: {
        green: true,
        artifactSha256: digest("4"),
        profileSha256: digest("5"),
        vokReceiptDigests: [digest("6")],
        authorityReleased: false,
      },
    },
  };
  const green = chainFromSandboxReceipt(receipt, { expectedSourceSha256: digest("0"), receiptValid: true });
  assert.equal(Object.values(green).every((entry) => entry.verified), true);
  for (const stage of CHAIN_STAGES) {
    const changed = structuredClone(receipt);
    if (stage === "source") changed.source.sourceSha256 = digest("9");
    if (stage === "candidate") delete changed.candidate.sha256;
    if (stage === "checkedSnapshot") delete changed.evidence.compiler.checkedSnapshotSha256;
    if (stage === "gir") changed.evidence.compiler.girHashSecond = digest("9");
    if (stage === "physicalPackage") delete changed.evidence.physical.artifactSha256;
    if (stage === "profile") delete changed.evidence.physical.profileSha256;
    if (stage === "vokReceipt") changed.evidence.physical.vokReceiptDigests = [];
    const chain = chainFromSandboxReceipt(changed, { expectedSourceSha256: digest("0"), receiptValid: true });
    assert.equal(chain[stage].verified, false, stage);
  }
  assert.equal(
    chainFromSandboxReceipt(receipt, { expectedSourceSha256: digest("0"), receiptValid: false }).vokReceipt.verified,
    false,
  );
  for (const logicAnalysis of [undefined, { status: "BLOCKED" }, { status: "MANUAL_REVIEW" }]) {
    const changed = structuredClone(receipt);
    if (logicAnalysis === undefined) delete changed.evidence.logicAnalysis;
    else changed.evidence.logicAnalysis = logicAnalysis;
    const chain = chainFromSandboxReceipt(changed, { expectedSourceSha256: digest("0"), receiptValid: true });
    assert.equal(chain.candidate.verified, false);
    assert.equal(chain.checkedSnapshot.verified, false);
    assert.equal(chain.gir.verified, false);
  }
});

test("source digest drift and TypeScript removal refuse", () => {
  assert.equal(card({ requests: [convertedResult(digest("9"))] }).status, "REFUSED");
  assert.equal(
    card({ requests: [{ ...convertedResult(), sourceRetained: false }] }).status,
    "REFUSED",
  );
});

test("blocked and manual-review requests remain terminal but hold aggregate authority", () => {
  for (const outcome of ["BLOCKED", "MANUAL_REVIEW"]) {
    const result = {
      ...convertedResult(),
      outcome,
      reasonCode: outcome === "BLOCKED" ? "SEMANTICS_BLOCKED" : "OWNER_REVIEW_REQUIRED",
      chain: { source: convertedResult().chain.source },
    };
    assert.equal(card({ requests: [result] }).status, "HOLD", outcome);
  }
});

test("report-bearing batches enforce 39/40/50 and the report toggle", () => {
  assert.equal(card({ commitPolicy: commitPolicy({ reports: 1, addedFungi: 39 }) }).status, "REFUSED");
  assert.equal(card({ commitPolicy: commitPolicy({ reports: 1, addedFungi: 40 }) }).status, "ALLOW");
  assert.equal(card({ commitPolicy: commitPolicy({ reports: 1, addedFungi: 50 }) }).status, "ALLOW");
  assert.equal(card({ commitPolicy: commitPolicy({ reports: 2, addedFungi: 50 }) }).status, "REFUSED");
});

test("only one final report-only tail is allowed after a qualifying batch", () => {
  assert.equal(card({ commitPolicy: commitPolicy({ reports: 1, reportOnlyStreak: 2 }) }).status, "REFUSED");
  assert.equal(
    card({
      commitPolicy: commitPolicy({
        reports: 1,
        reportOnlyStreak: 1,
        finalTailException: true,
        precedingQualifyingBatch: true,
      }),
    }).status,
    "ALLOW",
  );
});

test("incomplete corpus comparison and exact or normalized twins refuse", () => {
  for (const policy of [
    commitPolicy({ corpusComplete: false }),
    commitPolicy({ exactDuplicates: 1 }),
    commitPolicy({ normalizedShadows: 1 }),
  ]) {
    assert.equal(card({ commitPolicy: policy }).status, "REFUSED");
  }
});

test("a controlled failing child proves the roster can turn red", () => {
  const result = runConversionGateSelfTest();
  assert.deepEqual(result, { green: "ALLOW", red: "REFUSED", passed: true });
  assert.equal(card({ checks: checks({ "candidate-compiler": "REFUSED" }) }).status, "REFUSED");
});

test("the run card is body-free and denies switch retirement commit push and production grant", () => {
  const result = card();
  assert.deepEqual(result.actions, {
    consumerSwitched: false,
    typescriptRetired: false,
    committed: false,
    pushed: false,
    productionAuthorityReleased: false,
  });
  const text = JSON.stringify(result);
  assert.doesNotMatch(text, /sourceBody|privateSkillText|BEGIN PRIVATE KEY/u);
  assert.doesNotMatch(text, /[A-Za-z]:[\\/]/u);
});

test("run cards publish atomically and refuse an existing destination", async () => {
  const directory = join(tmpdir(), `fungi-conversion-gate-${process.pid}-${Date.now()}`);
  const output = join(directory, "run-card.json");
  try {
    await atomicWriteRunCard(output, card());
    const published = JSON.parse(await readFile(output, "utf8"));
    assert.equal(published.status, "ALLOW");
    await assert.rejects(() => atomicWriteRunCard(output, card()), /already exists/u);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

test("source inspection refuses dirty and untracked TypeScript while retaining exact bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "fungi-gate-source-"));
  const file = "packages-galerina/example/src/value.ts";
  const path = join(root, ...file.split("/"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Gate Test"]);
    git(root, ["config", "user.email", "gate@invalid.example"]);
    await mkdir(join(root, "packages-galerina", "example", "src"), { recursive: true });
    await writeFile(path, "export const VALUE = 1;\n");
    git(root, ["add", file]);
    git(root, ["commit", "-q", "-m", "baseline"]);
    const sourceSha256 = `sha256:${(await import("node:crypto")).createHash("sha256").update(await readFile(path)).digest("hex")}`;
    const resolveIdentity = async () => ({ sourceSha256, sourceBuildPoint: git(root, ["rev-parse", "HEAD"]) });
    const inspected = await inspectSourceRequest({ root, request: { file, symbol: "VALUE", sourceSha256 }, graphProject: "fixture", resolveIdentity });
    assert.equal(inspected.sourceRetained, true);
    await writeFile(path, "export const VALUE = 2;\n");
    await assert.rejects(() => inspectSourceRequest({ root, request: { file, symbol: "VALUE", sourceSha256 }, graphProject: "fixture", resolveIdentity }), /dirty|digest/u);
    git(root, ["restore", file]);
    const untracked = "packages-galerina/example/src/untracked.ts";
    await writeFile(join(root, ...untracked.split("/")), "export const OTHER = 1;\n");
    await assert.rejects(() => inspectSourceRequest({ root, request: { file: untracked, symbol: "OTHER", sourceSha256 }, graphProject: "fixture", resolveIdentity }), /tracked/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("an output path with a junction ancestor is refused", async () => {
  const root = await mkdtemp(join(tmpdir(), "fungi-gate-output-"));
  const outside = await mkdtemp(join(tmpdir(), "fungi-gate-outside-"));
  try {
    await mkdir(join(root, "build", "ts-to-fungi-sandbox"), { recursive: true });
    await symlink(outside, join(root, "build", "ts-to-fungi-sandbox", "redirect"), "junction");
    await assert.rejects(
      () => assertGateOutputPath(root, "build/ts-to-fungi-sandbox/redirect/run"),
      /redirected|symlink/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("the collector composes one body-free converted chain from bounded owner tools", async () => {
  const root = await mkdtemp(join(tmpdir(), "fungi-gate-collector-"));
  const file = "packages-galerina/example/src/value.ts";
  const path = join(root, ...file.split("/"));
  try {
    git(root, ["init", "-q"]);
    git(root, ["config", "user.name", "Gate Test"]);
    git(root, ["config", "user.email", "gate@invalid.example"]);
    await mkdir(join(root, "packages-galerina", "example", "src"), { recursive: true });
    await writeFile(path, "export const VALUE = 1;\n");
    git(root, ["add", file]);
    git(root, ["commit", "-q", "-m", "baseline"]);
    const sourceSha256 = `sha256:${(await import("node:crypto")).createHash("sha256").update(await readFile(path)).digest("hex")}`;
    const head = git(root, ["rev-parse", "HEAD"]);
    const gateManifest = manifest(1, {
      graphProject: "fixture-project",
      sandboxOutput: "build/ts-to-fungi-sandbox/fixture-run",
      requests: [{ file, symbol: "VALUE", sourceSha256 }],
    });
    const makeIdentity = (ownerKey) => ({ requiredHead: head, project: `${ownerKey}-fixture` });
    const collectPreflight = async () => ({
      status: "ALLOW",
      owners: ["galerina", "slide", "vok", "lyth"].map((ownerKey) => ({ ownerKey, status: "ALLOW", code: "READY", identity: makeIdentity(ownerKey) })),
    });
    const runSandbox = async ({ out }) => {
      await mkdir(join(out, "records"), { recursive: true });
      const receipt = {
        receiptSha256: digest("8"),
        source: { sourceSha256 },
        outcome: "CONVERTED",
        candidate: { sha256: digest("1") },
        evidence: {
          logicAnalysis: { status: "SUPPORTED" },
          compiler: { green: true, checkedSnapshotSha256: digest("2"), girHashFirst: digest("3"), girHashSecond: digest("3") },
          physical: { green: true, artifactSha256: digest("4"), profileSha256: digest("5"), vokReceiptDigests: [digest("6")], authorityReleased: false },
        },
      };
      await writeFile(join(out, "records", "value.json"), JSON.stringify(receipt));
      return { records: [{ outcome: "CONVERTED", receiptPath: "records/value.json" }] };
    };
    const result = await collectConversionGateRun({
      root,
      slideRoot: root,
      lythRoot: root,
      outputRoot: root,
      manifest: gateManifest,
      dependencies: {
        collectPreflight,
        resolveIdentity: async () => ({ sourceSha256, sourceBuildPoint: head }),
        runSandbox,
        verifySandboxReceipt: async () => ({ valid: true }),
        runLythProofWork: async () => ({ status: "ALLOW", code: "EVIDENCE_READY", digest: digest("7") }),
        inspectCommitPolicy: async () => commitPolicy(),
      },
    });
    assert.equal(result.status, "ALLOW");
    assert.equal(result.requests[0].chain.vokReceipt.verified, true);
    assert.equal(result.actions.productionAuthorityReleased, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the CLI self-test proves green and red controls before any real run", () => {
  const result = spawnSync(process.execPath, ["scripts/fungi-conversion-gate.mjs", "--self-test"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { green: "ALLOW", passed: true, red: "REFUSED" });
});

test("the CLI refuses an incomplete invocation without publishing", () => {
  const result = spawnSync(process.execPath, ["scripts/fungi-conversion-gate.mjs", "--manifest", "missing.json"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /CLI_ARGUMENT_INVALID/u);
});
