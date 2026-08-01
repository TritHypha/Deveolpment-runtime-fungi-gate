import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  linkSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import test from "node:test";

import { verifyPlatformDurabilityEvidence } from "../verify-platform-durability-evidence.mjs";

const GALERINA_COMMIT = "a".repeat(64);
const SLIDE_COMMIT = "b".repeat(64);
const BOUNDARIES = Object.freeze([
  "stage-opened",
  "bytes-written",
  "file-flushed",
  "stage-closed",
  "published",
  "reopened-verified",
  "directory-flushed",
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonical(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeCanonical(path, value) {
  writeFileSync(path, canonical(value), { encoding: "utf8", flag: "wx" });
}

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "galerina-platform-evidence-"));
  const reportsDirectory = join(root, "reports");
  mkdirSync(reportsDirectory);
  const base = `ubuntu-desktop-linux-adapter-2026-08-01-${GALERINA_COMMIT.slice(0, 12)}`;
  const report = join(reportsDirectory, `${base}.md`);
  const staticReceipt = join(reportsDirectory, `${base}.receipt.json`);
  const platformReceipt = join(reportsDirectory, `${base}.slide-platform.json`);
  const nativeReceipt = join(reportsDirectory, `${base}.native-evidence.json`);

  const staticValue = {
    schema: "galerina-registry-durability-static-link-proof/v1",
    verdict: "CANDIDATE",
    productionAuthorizing: false,
    platform: "linux",
    architecture: "x64",
    executableSha256: "1".repeat(64),
    adapterSourceSha256: "2".repeat(64),
    fungiContractSha256: "3".repeat(64),
    abi: "galerina.registry.durability.abi.v1",
    buildProfile: "release",
    pollutedWorkingDirectoryInvariant: true,
  };
  const platformValue = {
    schema: "slide.reference-platform-report.v1",
    status: "MATCH",
    failureId: "NONE",
    evidenceKind: "LOCAL_SELF_OBSERVATION",
    authenticated: false,
    executionEvidence: "UNVERIFIED",
    authorityReleased: false,
    productionAuthorizing: false,
    observation: {
      schema: "slide.reference-platform-observation.v1",
      platform: "linux",
      architecture: "x64",
      distributionId: "ubuntu",
      osRelease: "24.04",
      runtimeKind: "node-bootstrap",
      runtimeVersion: "22.17.0",
    },
    decision: {
      schema: "slide.reference-platform-decision.v1",
      compatibilityVerdict: 1,
      status: "MATCH",
      failureId: "NONE",
      profileId: "slide.reference.ubuntu-x64.v1",
      executionEvidence: "UNVERIFIED",
      authorityReleased: false,
      productionAuthorizing: false,
    },
  };
  const nativeBase = {
    schema: "galerina.platform-native-evidence.v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: SLIDE_COMMIT,
    platform: "linux",
    distributionId: "ubuntu",
    architecture: "x64",
    filesystem: "ext4",
    pureTests: 10,
    liveTests: 4,
    faultRefusals: 9,
    processTerminationBoundaries: [...BOUNDARIES],
    failedTests: 0,
    skippedTests: 0,
    controlledReboot: false,
    controlledPowerLoss: false,
    authenticated: false,
    authorityReleased: false,
    productionAuthorizing: false,
  };
  const nativeValue = {
    ...nativeBase,
    selfSha256: sha256(Buffer.from(canonical(nativeBase), "utf8")),
  };
  writeCanonical(staticReceipt, staticValue);
  writeCanonical(platformReceipt, platformValue);
  writeCanonical(nativeReceipt, nativeValue);
  const binding = {
    schema: "galerina.platform-durability-report-binding.v1",
    galerinaCommit: GALERINA_COMMIT,
    slideCommit: SLIDE_COMMIT,
    staticReceiptSha256: sha256(readFileSync(staticReceipt)),
    platformReceiptSha256: sha256(readFileSync(platformReceipt)),
    nativeReceiptSha256: sha256(readFileSync(nativeReceipt)),
    productionAuthorizing: false,
  };
  const reportText = [
    "# Ubuntu Desktop platform evidence report",
    "",
    "Observed public evidence only. No private values.",
    "",
    "<!-- GALERINA_PLATFORM_DURABILITY_BINDING_BEGIN -->",
    "```json",
    JSON.stringify(binding, null, 2),
    "```",
    "<!-- GALERINA_PLATFORM_DURABILITY_BINDING_END -->",
    "",
  ].join("\n");
  writeFileSync(report, reportText, { encoding: "utf8", flag: "wx" });

  return {
    root,
    reportsDirectory,
    report,
    staticReceipt,
    platformReceipt,
    nativeReceipt,
    values: { staticValue, platformValue, nativeBase, nativeValue, binding },
  };
}

function verify(fixture, overrides = {}) {
  return verifyPlatformDurabilityEvidence({
    reportPath: fixture.report,
    staticReceiptPath: fixture.staticReceipt,
    platformReceiptPath: fixture.platformReceipt,
    nativeReceiptPath: fixture.nativeReceipt,
    reportsDirectory: fixture.reportsDirectory,
    expectedGalerinaCommit: GALERINA_COMMIT,
    expectedSlideCommit: SLIDE_COMMIT,
    ...overrides,
  });
}

test("one exact public Ubuntu round-two fixture admits only the non-authorizing gate", () => {
  const fixture = makeFixture();
  try {
    const result = verify(fixture);
    assert.equal(result.verdict, 1);
    assert.equal(result.productionAuthorizing, false);
    assert.equal(result.authorityReleased, false);
    assert.equal(result.authenticated, false);
    const output = JSON.stringify(result);
    assert.doesNotMatch(output, /[A-Za-z]:\\|\/Users\/|private.?key|secret/iu);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

for (const [name, mutate, refusal] of [
  ["stale Galerina commit", (f) => ({ expectedGalerinaCommit: "c".repeat(64) }), "EVIDENCE_COMMIT_MISMATCH"],
  ["omitted live test", (f) => {
    const value = { ...f.values.nativeBase, liveTests: 3 };
    value.selfSha256 = sha256(Buffer.from(canonical({ ...f.values.nativeBase, liveTests: 3 }), "utf8"));
    writeFileSync(f.nativeReceipt, canonical(value));
    return {};
  }, "EVIDENCE_NATIVE_SEMANTICS_REFUSED"],
  ["zero executed tests", (f) => {
    const base = { ...f.values.nativeBase, pureTests: 0 };
    writeFileSync(f.nativeReceipt, canonical({ ...base, selfSha256: sha256(Buffer.from(canonical(base))) }));
    return {};
  }, "EVIDENCE_NATIVE_SEMANTICS_REFUSED"],
  ["duplicate process boundary", (f) => {
    const base = { ...f.values.nativeBase, processTerminationBoundaries: [...BOUNDARIES.slice(0, 6), "stage-opened"] };
    writeFileSync(f.nativeReceipt, canonical({ ...base, selfSha256: sha256(Buffer.from(canonical(base))) }));
    return {};
  }, "EVIDENCE_NATIVE_SEMANTICS_REFUSED"],
  ["missing SLIDE observation", (f) => {
    writeFileSync(f.platformReceipt, canonical({ ...f.values.platformValue, observation: null }));
    return {};
  }, "EVIDENCE_PLATFORM_SEMANTICS_REFUSED"],
  ["authorizing child receipt", (f) => {
    writeFileSync(f.staticReceipt, canonical({ ...f.values.staticValue, productionAuthorizing: true }));
    return {};
  }, "EVIDENCE_STATIC_SEMANTICS_REFUSED"],
  ["recomputed self-hash semantic forgery", (f) => {
    const base = { ...f.values.nativeBase, controlledPowerLoss: true };
    writeFileSync(f.nativeReceipt, canonical({ ...base, selfSha256: sha256(Buffer.from(canonical(base))) }));
    return {};
  }, "EVIDENCE_NATIVE_SEMANTICS_REFUSED"],
]) {
  test(`${name} is refused`, () => {
    const fixture = makeFixture();
    try {
      const overrides = mutate(fixture);
      assert.throws(() => verify(fixture, overrides), new RegExp(refusal, "u"));
    } finally {
      rmSync(fixture.root, { recursive: true });
    }
  });
}

test("surplus report content after the binding is refused", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(fixture.report, `${readFileSync(fixture.report, "utf8")}changed\n`);
    assert.throws(() => verify(fixture), /EVIDENCE_REPORT_FORMAT_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a semantically valid receipt changed after report binding is refused", () => {
  const fixture = makeFixture();
  try {
    writeFileSync(
      fixture.staticReceipt,
      canonical({ ...fixture.values.staticValue, executableSha256: "9".repeat(64) }),
    );
    assert.throws(() => verify(fixture), /EVIDENCE_REPORT_BINDING_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("duplicate JSON keys are refused by canonical materialization", () => {
  const fixture = makeFixture();
  try {
    const text = canonical(fixture.values.staticValue).replace(
      '  "verdict": "CANDIDATE",',
      '  "verdict": "CANDIDATE",\n  "verdict": "CANDIDATE",',
    );
    writeFileSync(fixture.staticReceipt, text);
    assert.throws(() => verify(fixture), /EVIDENCE_STATIC_FORMAT_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("the verifier contains no child-process or shell execution surface", () => {
  const source = readFileSync(
    new URL("../verify-platform-durability-evidence.mjs", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /node:child_process|execFile|spawn|\bshell\b/iu);
});

test("a report containing a local path or secret-shaped record is refused", () => {
  const fixture = makeFixture();
  try {
    const report = readFileSync(fixture.report, "utf8");
    writeFileSync(
      fixture.report,
      report.replace(
        "Observed public evidence only. No private values.",
        "password: not-permitted",
      ),
    );
    assert.throws(() => verify(fixture), /EVIDENCE_REPORT_SENSITIVE_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a hard-linked receipt is refused before decode", () => {
  const fixture = makeFixture();
  try {
    const linked = join(fixture.reportsDirectory, "linked-native.json");
    linkSync(fixture.nativeReceipt, linked);
    assert.throws(() => verify(fixture), /EVIDENCE_FILE_IDENTITY_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a symlinked receipt is refused before decode when the host permits symlinks", (context) => {
  const fixture = makeFixture();
  try {
    const target = join(fixture.reportsDirectory, "native-target.json");
    const link = join(fixture.reportsDirectory, basename(fixture.nativeReceipt));
    rmSync(fixture.nativeReceipt);
    writeCanonical(target, fixture.values.nativeValue);
    try {
      symlinkSync(target, link, "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host policy does not permit creating a file symlink");
        return;
      }
      throw error;
    }
    assert.throws(() => verify(fixture), /EVIDENCE_FILE_IDENTITY_REFUSED/u);
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});

test("a path outside the exact reports directory is refused", () => {
  const fixture = makeFixture();
  try {
    const outside = join(fixture.root, "outside.md");
    writeFileSync(outside, readFileSync(fixture.report));
    assert.throws(
      () => verify(fixture, { reportPath: outside }),
      /EVIDENCE_PATH_SCOPE_REFUSED/u,
    );
  } finally {
    rmSync(fixture.root, { recursive: true });
  }
});
