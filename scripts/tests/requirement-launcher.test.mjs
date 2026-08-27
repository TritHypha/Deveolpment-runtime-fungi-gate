import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  decodeCanonicalFrame,
  encodeCanonicalFrame,
} from "../../packages-ts/galerina-core-compiler/dist/index.js";

const ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));
const BUILD_SCRIPT = join(ROOT, "scripts", "build-requirement-launcher.mjs");
const OUTPUT = join(ROOT, "build", "rd0858-requirement-launcher");
const BINARY = join(OUTPUT, "galerina-requirement-launcher.exe");
const WORKER_BINARY = join(OUTPUT, "galerina-requirement-worker-launcher.exe");
const BAD_READY_BINARY = join(OUTPUT, "galerina-bad-ready-launcher.exe");
const BUILD_RECEIPT = join(
  OUTPUT,
  "build-receipt.json",
);
const REGISTRY = join(OUTPUT, "test-registry.json");
const WORKER_REGISTRY = join(OUTPUT, "worker-registry.json");
const BAD_READY_REGISTRY = join(OUTPUT, "bad-ready-registry.json");
const BAD_READY_MARKER = join(OUTPUT, "bad-ready-request-received.txt");
const PROTOCOL_TAMPER_MARKER = join(OUTPUT, "protocol-tamper-executed.txt");
const CHECKED_ARTIFACT = join(
  ROOT,
  "packages",
  "fungi",
  "products",
  "galerina",
  "rd0858-unit4-scalar-oracle",
  "scalar-oracle.checked.json",
);
const SCALAR_SOURCE = join(dirname(CHECKED_ARTIFACT), "scalar-oracle.fungi");

const BOOTSTRAP_ARGUMENT = Buffer.from(
  '{"operation":"bootstrap-probe","requestedEffects":[]}',
  "utf8",
);

const PROCESS_OWNER_POLICY =
  "galerina.windows-job-policy.v1\0active-process=1\0kill-on-close=true";

function packageGraphDigest(workerDigest, protocolDigest) {
  return createHash("sha256")
    .update("galerina.requirement-worker-package.v1\0")
    .update(workerDigest)
    .update("\0")
    .update(protocolDigest)
    .digest("hex");
}

const request = (flowLocator = "rd0858/unit4/scalar-oracle") => ({
  schemaVersion: 1,
  nonce: "00112233445566778899aabbccddeeff",
  runtimeProfile: "scalar-1",
  subjectDigest: "0".repeat(64),
  flowLocator,
  flowDigest: "1".repeat(64),
  argumentDigest: "2".repeat(64),
  argumentBytes: "eyJzdWJqZWN0Ijp0cnVlfQ==",
});

const bootstrapRequest = () => ({
  ...request("rd0858/unit4/bootstrap-probe"),
  argumentDigest: createHash("sha256").update(BOOTSTRAP_ARGUMENT).digest("hex"),
  argumentBytes: BOOTSTRAP_ARGUMENT.toString("base64"),
});

function buildLauncher() {
  return spawnSync(process.execPath, [BUILD_SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
}

function runLauncher(input, args = ["--decode-only"], env = process.env) {
  return spawnSync(BINARY, args, {
    cwd: ROOT,
    input,
    encoding: null,
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
    env,
  });
}

function runWorkerLauncher(input, args = ["--registry", WORKER_REGISTRY], env = process.env) {
  return spawnSync(WORKER_BINARY, args, {
    cwd: ROOT,
    input,
    encoding: null,
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
    env,
  });
}

function runBadReadyLauncher(input, args = ["--registry", BAD_READY_REGISTRY]) {
  return spawnSync(BAD_READY_BINARY, args, {
    cwd: ROOT,
    input,
    encoding: null,
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
    env: process.env,
  });
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function registryFixture(mutate, source = REGISTRY) {
  const directory = mkdtempSync(join(OUTPUT, "registry-fixture-"));
  const value = JSON.parse(readFileSync(source, "utf8"));
  mutate(value, directory);
  const path = join(directory, "registry.json");
  writeFileSync(path, canonicalJson(value), "utf8");
  return { directory, path };
}

function directFileRecord(path) {
  const resolved = realpathSync.native(path);
  const stat = statSync(resolved, { bigint: true });
  return {
    path: resolved,
    digest: createHash("sha256").update(readFileSync(resolved)).digest("hex"),
    volumeSerial: BigInt.asUintN(32, stat.dev).toString(10),
    fileIndex: BigInt.asUintN(64, stat.ino).toString(10),
    byteLength: stat.size.toString(10),
  };
}

function rawFrame(body, declaredLength = body.length) {
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(declaredLength));
  return Buffer.concat([prefix, Buffer.from(body)]);
}

function splitFrames(bytes) {
  const frames = [];
  let offset = 0;
  while (offset < bytes.byteLength) {
    assert.ok(bytes.byteLength - offset >= 8, "frame prefix must be complete");
    const bodyLength = Number(bytes.readBigUInt64BE(offset));
    const end = offset + 8 + bodyLength;
    assert.ok(end <= bytes.byteLength, "frame body must be complete");
    frames.push(bytes.subarray(offset, end));
    offset = end;
  }
  return frames;
}

function scalarExecutionFrame(subject) {
  const artifactBytes = readFileSync(CHECKED_ARTIFACT);
  const artifactDigest = createHash("sha256").update(artifactBytes).digest("hex");
  const argument = Buffer.from(`{"subject":${subject}}`, "utf8");
  const argumentDigest = createHash("sha256").update(argument).digest("hex");
  const launcherRequest = encodeCanonicalFrame("launcher-request", {
    schemaVersion: 1,
    nonce: "00112233445566778899aabbccddeeff",
    runtimeProfile: "scalar-1",
    subjectDigest: argumentDigest,
    flowLocator: "rd0858/unit4/scalar-oracle",
    flowDigest: artifactDigest,
    argumentDigest,
    argumentBytes: argument.toString("base64"),
  });
  return encodeCanonicalFrame("worker-execution", {
    schemaVersion: 1,
    nonce: "00112233445566778899aabbccddeeff",
    artifactDigest,
    artifactBytes: artifactBytes.toString("base64"),
    requestDigest: createHash("sha256").update(launcherRequest).digest("hex"),
    requestBytes: Buffer.from(launcherRequest).toString("base64"),
  });
}

function refusalReceipt(child, expectedState = "REFUSED") {
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1, child.stderr?.toString("utf8"));
  const receipt = decodeCanonicalFrame("receipt", child.stdout);
  assert.equal(receipt.authorizing, false);
  assert.equal(receipt.executionState, expectedState);
  return receipt;
}

describe("RD-0858 Unit 4 native launcher skeleton", () => {
  before(() => {
    const build = buildLauncher();
    assert.equal(build.error, undefined);
    assert.equal(build.status, 0, build.stderr);
  });

  it("builds one dependency-free launcher with a bounded receipt", () => {
    assert.equal(existsSync(BINARY), true);
    const evidence = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8"));
    assert.equal(evidence.schemaVersion, 1);
    assert.equal(evidence.verdict, "BUILT_NON_AUTHORIZING");
    assert.match(evidence.binarySha256, /^[0-9a-f]{64}$/);
    const receipt = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8"));
    assert.equal(receipt.verdict, "BUILT_NON_AUTHORIZING");
    assert.match(receipt.gitHead, /^[0-9a-f]{40}$/);
    assert.match(receipt.rustcVersion, /^rustc /);
    assert.deepEqual(receipt.command, ["cargo", "build", "--release", "--locked"]);
    assert.deepEqual(receipt.compileCfg, ["test_contract"]);
    assert.equal(receipt.binarySha256, evidence.binarySha256);
    assert.equal(Object.keys(receipt.inputs).length, 12);
  });

  it("builds a separately pinned single-use worker launcher and registry", () => {
    assert.equal(existsSync(WORKER_BINARY), true);
    assert.equal(existsSync(WORKER_REGISTRY), true);
    const evidence = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8"));
    const registry = JSON.parse(readFileSync(WORKER_REGISTRY, "utf8"));
    assert.match(evidence.workerLauncherBinarySha256, /^[0-9a-f]{64}$/u);
    assert.match(evidence.workerRegistrySha256, /^[0-9a-f]{64}$/u);
    assert.equal(registry.launcher.digest, evidence.workerLauncherBinarySha256);
    assert.equal(registry.worker.digest, evidence.compilePins.requirementWorkerDigest);
    assert.match(registry.worker.path, /requirement-process-worker\.js$/u);
    assert.equal(registry.protocol.digest, evidence.compilePins.requirementProtocolDigest);
    assert.match(registry.protocol.path, /requirement-process-protocol\.js$/u);
    assert.equal(
      registry.packageRootDigest,
      packageGraphDigest(registry.worker.digest, registry.protocol.digest),
    );
    assert.equal(registry.timeoutMs, 1_500);
  });

  it("executes the admitted scalar artifact in the distributed clean worker", () => {
    const registry = JSON.parse(readFileSync(WORKER_REGISTRY, "utf8"));
    const child = spawnSync(process.execPath, [registry.worker.path], {
      cwd: ROOT,
      input: scalarExecutionFrame(1),
      encoding: null,
      timeout: 10_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GALERINA_UNIT4_NONCE: "00112233445566778899aabbccddeeff" },
    });
    assert.equal(child.error, undefined);
    assert.equal(child.signal, null);
    assert.equal(child.status, 1, child.stderr?.toString("utf8"));
    const frames = splitFrames(child.stdout);
    assert.equal(frames.length, 2);
    const ready = decodeCanonicalFrame("worker-ready", frames[0]);
    const result = decodeCanonicalFrame("worker-result", frames[1]);
    assert.equal(ready.nonce, "00112233445566778899aabbccddeeff");
    assert.equal(result.executionState, "COMPLETE");
    assert.equal(result.boundedValue.decision, "allow");
    assert.equal(result.boundedAudit.executionTier, "tree");
    assert.equal(result.boundedAudit.authorizing, false);
  });

  it("binds both registries to the exact checked scalar artifact and complete identity", () => {
    const evidence = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8"));
    const artifact = JSON.parse(readFileSync(CHECKED_ARTIFACT, "utf8"));
    for (const registryPath of [REGISTRY, WORKER_REGISTRY]) {
      const registry = JSON.parse(readFileSync(registryPath, "utf8"));
      assert.deepEqual(registry.checkedArtifact, directFileRecord(CHECKED_ARTIFACT));
      assert.equal(registry.checkedArtifactSchema, artifact.schema);
      assert.equal(registry.checkedCompilerPackageGraphDigest, artifact.compilerPackageGraphDigest);
      assert.equal(registry.checkedFlowLocator, artifact.flowLocator);
      assert.equal(registry.checkedFlowName, artifact.flowName);
      assert.equal(registry.checkedPackageId, artifact.packageId);
      assert.equal(registry.checkedProductId, artifact.productId);
      assert.equal(registry.checkedRuntimeProfile, artifact.runtimeProfile);
    }
    assert.equal(evidence.compilePins.checkedArtifactDigest, directFileRecord(CHECKED_ARTIFACT).digest);
    assert.equal(evidence.checkedArtifactIdentity.productId, "galerina");
    assert.ok(Object.hasOwn(evidence.inputs, "packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json"));
    assert.ok(Object.hasOwn(evidence.inputs, "scripts/generate-rd0858-scalar-oracle-artifact.mjs"));
  });

  it("refuses every registry-to-artifact identity neighbour before process authority", () => {
    for (const [field, value] of [
      ["checkedArtifactSchema", "galerina.rd0858.checked-flow.v2"],
      ["checkedCompilerPackageGraphDigest", `sha256:${"f".repeat(64)}`],
      ["checkedFlowLocator", "rd0858/unit4/other"],
      ["checkedFlowName", "otherOracle"],
      ["checkedPackageId", "other-package"],
      ["checkedProductId", "trametes"],
      ["checkedRuntimeProfile", "scalar-32"],
    ]) {
      const fixture = registryFixture((registry) => {
        registry[field] = value;
      });
      try {
        const receipt = refusalReceipt(runLauncher(
          encodeCanonicalFrame("launcher-request", request()),
          ["--registry", fixture.path],
        ));
        assert.match(receipt.refusalCode, /^CHECKED_ARTIFACT_(?:IDENTITY|SCHEMA|TOOLCHAIN)$/u);
      } finally {
        rmSync(fixture.directory, { recursive: true, force: true });
      }
    }
  });

  it("refuses a forged artifact digest and a runtime registry row pointing at .fungi", () => {
    const digest = registryFixture((registry) => {
      registry.checkedArtifact.digest = "f".repeat(64);
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", digest.path],
      ));
      assert.equal(receipt.refusalCode, "CHECKED_ARTIFACT_DIGEST");
    } finally {
      rmSync(digest.directory, { recursive: true, force: true });
    }

    const source = registryFixture((registry) => {
      registry.checkedArtifact = directFileRecord(SCALAR_SOURCE);
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", source.path],
      ));
      assert.equal(receipt.refusalCode, "CHECKED_ARTIFACT_PATH");
    } finally {
      rmSync(source.directory, { recursive: true, force: true });
    }
  });

  it("refuses artifact hard links, case aliases, junctions and replaced files", () => {
    const hardLinked = registryFixture((registry, directory) => {
      const path = join(directory, "scalar-oracle.checked.json");
      linkSync(CHECKED_ARTIFACT, path);
      registry.checkedArtifact = { ...directFileRecord(CHECKED_ARTIFACT), path };
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", hardLinked.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_LINK_COUNT");
    } finally {
      rmSync(hardLinked.directory, { recursive: true, force: true });
    }

    const caseAliased = registryFixture((registry) => {
      registry.checkedArtifact.path = registry.checkedArtifact.path.toUpperCase();
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", caseAliased.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_PATH_CASE");
    } finally {
      rmSync(caseAliased.directory, { recursive: true, force: true });
    }

    const junction = registryFixture((registry, directory) => {
      const junctionPath = join(directory, "artifact-junction");
      symlinkSync(dirname(CHECKED_ARTIFACT), junctionPath, "junction");
      registry.checkedArtifact = {
        ...directFileRecord(CHECKED_ARTIFACT),
        path: join(junctionPath, "scalar-oracle.checked.json"),
      };
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", junction.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_REPARSE");
    } finally {
      rmSync(junction.directory, { recursive: true, force: true });
    }

    const replaced = registryFixture((registry, directory) => {
      const path = join(directory, "scalar-oracle.checked.json");
      copyFileSync(CHECKED_ARTIFACT, path);
      registry.checkedArtifact = directFileRecord(path);
      const bytes = readFileSync(path);
      bytes[0] ^= 1;
      writeFileSync(path, bytes);
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", replaced.path],
      ));
      assert.match(receipt.refusalCode, /^(?:FILE_IDENTITY|CHECKED_ARTIFACT_DIGEST)$/u);
    } finally {
      rmSync(replaced.directory, { recursive: true, force: true });
    }
  });

  it("exchanges READY -> one bootstrap request -> one non-authorizing REFUSED result", () => {
    const admittedRequest = bootstrapRequest();
    const child = runWorkerLauncher(
      encodeCanonicalFrame("launcher-request", admittedRequest),
    );
    const receipt = refusalReceipt(child);
    const registry = JSON.parse(readFileSync(WORKER_REGISTRY, "utf8"));
    assert.equal(receipt.refusalCode, "BOOTSTRAP_PROBE_ONLY");
    assert.equal(receipt.executionState, "REFUSED");
    assert.equal(receipt.authorizing, false);
    assert.equal(receipt.workerDigest, registry.worker.digest);
    assert.equal(receipt.runtimeDigest, registry.runtime.digest);
    assert.equal(
      receipt.registryDigest,
      createHash("sha256").update(readFileSync(WORKER_REGISTRY)).digest("hex"),
    );
    assert.equal(
      receipt.processOwnerDigest,
      createHash("sha256").update(PROCESS_OWNER_POLICY).digest("hex"),
    );
    assert.equal(receipt.subjectDigest, admittedRequest.subjectDigest);
    assert.equal(receipt.flowDigest, admittedRequest.flowDigest);
    assert.equal(receipt.argumentDigest, admittedRequest.argumentDigest);
    assert.notEqual(receipt.responseDigest, "0".repeat(64));
    assert.notEqual(receipt.valueDigest, "0".repeat(64));
    assert.notEqual(receipt.auditDigest, "0".repeat(64));
    assert.equal(receipt.partial, false);
    assert.equal(receipt.truncated, false);
    assert.deepEqual(receipt.missingEvidence, []);
  });

  it("refuses changed imported protocol bytes before worker bootstrap", () => {
    const registry = JSON.parse(readFileSync(WORKER_REGISTRY, "utf8"));
    const protocolPath = registry.protocol?.path
      ?? join(dirname(registry.worker.path), "requirement-process-protocol.js");
    const originalProtocol = readFileSync(protocolPath);
    rmSync(PROTOCOL_TAMPER_MARKER, { force: true });
    try {
      const markerStatement = Buffer.from(
        `\nglobalThis.process.getBuiltinModule("node:fs").writeFileSync(${JSON.stringify(PROTOCOL_TAMPER_MARKER)}, "executed");\n`,
        "utf8",
      );
      writeFileSync(protocolPath, Buffer.concat([originalProtocol, markerStatement]));
      const receipt = refusalReceipt(runWorkerLauncher(
        encodeCanonicalFrame("launcher-request", bootstrapRequest()),
      ));
      assert.match(receipt.refusalCode, /^(?:FILE_IDENTITY|FILE_SIZE|PROTOCOL_DIGEST)$/u);
      assert.equal(receipt.responseDigest, "0".repeat(64));
      assert.equal(existsSync(PROTOCOL_TAMPER_MARKER), false);
    } finally {
      writeFileSync(protocolPath, originalProtocol);
      rmSync(PROTOCOL_TAMPER_MARKER, { force: true });
    }
  });

  it("refuses a changed worker digest before the READY exchange", () => {
    const fixture = registryFixture((value) => {
      value.worker.digest = "f".repeat(64);
    }, WORKER_REGISTRY);
    try {
      const receipt = refusalReceipt(runWorkerLauncher(
        encodeCanonicalFrame("launcher-request", bootstrapRequest()),
        ["--registry", fixture.path],
      ));
      assert.equal(receipt.refusalCode, "WORKER_DIGEST");
      assert.equal(receipt.responseDigest, "0".repeat(64));
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it("validates WorkerReady before disclosing the one launcher request", () => {
    rmSync(BAD_READY_MARKER, { force: true });
    const receipt = refusalReceipt(runBadReadyLauncher(
      encodeCanonicalFrame("launcher-request", bootstrapRequest()),
    ));
    assert.equal(receipt.refusalCode, "WORKER_SCHEMA_VERSION");
    assert.equal(existsSync(BAD_READY_MARKER), false);
  });

  it("decodes the TypeScript request vector and refuses absent worker admission", () => {
    const frame = encodeCanonicalFrame("launcher-request", request());
    const child = runLauncher(frame);
    const receipt = refusalReceipt(child);
    assert.equal(receipt.nonce, request().nonce);
    assert.equal(receipt.requestDigest, createHash("sha256").update(frame).digest("hex"));
    assert.equal(receipt.refusalCode, "WORKER_NOT_ADMITTED");
    assert.match(child.stderr.toString("utf8"), /UNIT4_REFUSED:WORKER_NOT_ADMITTED/);
  });

  it("accepts only an absolute registry locator outside the test-only decode mode", () => {
    const input = encodeCanonicalFrame("launcher-request", request());
    const absent = refusalReceipt(runLauncher(input, []));
    assert.equal(absent.refusalCode, "WORKER_NOT_ADMITTED");
    const relative = refusalReceipt(runLauncher(input, ["--registry", "registry.json"]));
    assert.equal(relative.refusalCode, "REGISTRY_PATH");
    const missingAbsolute = refusalReceipt(runLauncher(input, [
      "--registry",
      join(ROOT, "build", "does-not-exist", "registry.json"),
    ]));
    assert.equal(missingAbsolute.refusalCode, "REGISTRY_OPEN");
  });

  it("admits one registry-bound sentinel process but never authorizes it", () => {
    assert.equal(existsSync(REGISTRY), true);
    const child = runLauncher(
      encodeCanonicalFrame("launcher-request", request()),
      ["--registry", REGISTRY],
    );
    const receipt = refusalReceipt(child);
    assert.equal(receipt.refusalCode, "SENTINEL_REFUSED");
    assert.notEqual(receipt.runtimeDigest, "0".repeat(64));
    assert.notEqual(receipt.workerDigest, "0".repeat(64));
    assert.notEqual(receipt.environmentPolicyDigest, "0".repeat(64));
    assert.equal(receipt.processPolicyEvidenceLocator, "evidence/process/owned-worker-v1");
  });

  it("refuses registry runtime identity mismatch before process authority", () => {
    const fixture = registryFixture((value) => {
      value.runtime.digest = "f".repeat(64);
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", fixture.path],
      ));
      assert.equal(receipt.refusalCode, "RUNTIME_DIGEST");
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it("refuses a hard-linked worker and case-shadowed locator", () => {
    const linked = registryFixture((value, directory) => {
      const path = join(directory, "sentinel-hardlink.mjs");
      linkSync(value.worker.path, path);
      value.worker.path = path;
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", linked.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_LINK_COUNT");
    } finally {
      rmSync(linked.directory, { recursive: true, force: true });
    }

    const shadowed = registryFixture((value) => {
      value.worker.path = value.worker.path.toUpperCase();
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", shadowed.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_PATH_CASE");
    } finally {
      rmSync(shadowed.directory, { recursive: true, force: true });
    }
  });

  it("refuses a worker path through a junction before hashing", () => {
    const fixture = registryFixture((value, directory) => {
      const junction = join(directory, "worker-junction");
      symlinkSync(OUTPUT, junction, "junction");
      value.worker.path = join(junction, "sentinel-worker.mjs");
    });
    try {
      const receipt = refusalReceipt(runLauncher(
        encodeCanonicalFrame("launcher-request", request()),
        ["--registry", fixture.path],
      ));
      assert.equal(receipt.refusalCode, "FILE_REPARSE");
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

  it("ignores ambient execution variables and binds one environment digest", () => {
    const hostile = {
      ...process.env,
      PATH: join(OUTPUT, "hostile-path"),
      NODE_OPTIONS: "--inspect=0.0.0.0:9229",
      NODE_PATH: join(OUTPUT, "hostile-node-path"),
      GALERINA_PRELOAD: join(OUTPUT, "hostile-preload.mjs"),
    };
    const clean = refusalReceipt(runLauncher(
      encodeCanonicalFrame("launcher-request", request()),
      ["--registry", REGISTRY],
    ));
    const spoofed = refusalReceipt(runLauncher(
      encodeCanonicalFrame("launcher-request", request()),
      ["--registry", REGISTRY],
      hostile,
    ));
    assert.equal(spoofed.refusalCode, "SENTINEL_REFUSED");
    assert.equal(spoofed.environmentPolicyDigest, clean.environmentPolicyDigest);
  });

  it("closes the owned process tree on timeout", () => {
    const receipt = refusalReceipt(runLauncher(
      encodeCanonicalFrame("launcher-request", request("rd0858/unit4/timeout")),
      ["--registry", REGISTRY],
    ), "ERROR");
    const registryDigest = createHash("sha256").update(readFileSync(REGISTRY)).digest("hex");
    assert.equal(receipt.refusalCode, "WORKER_TIMEOUT");
    assert.equal(receipt.timedOut, true);
    assert.equal(receipt.registryDigest, registryDigest);
    assert.equal(
      receipt.processOwnerDigest,
      createHash("sha256").update(PROCESS_OWNER_POLICY).digest("hex"),
    );
    assert.ok(receipt.monotonicDurationMs >= 1);
    assert.equal(receipt.exitCode, 126);
    assert.deepEqual(receipt.missingEvidence, [
      "evidence/audit",
      "evidence/response",
      "evidence/value",
    ]);
  });

  it("blocks an extra child inside the owned Job Object", () => {
    const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
    const unowned = spawnSync(registry.runtime.path, [registry.worker.path, "extra-child"], {
      cwd: ROOT,
      env: process.env,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    assert.equal(unowned.status, 88, unowned.stderr);
    const receipt = refusalReceipt(runLauncher(
      encodeCanonicalFrame("launcher-request", request("rd0858/unit4/extra-child")),
      ["--registry", REGISTRY],
    ));
    assert.equal(receipt.refusalCode, "CHILD_BLOCKED");
    assert.equal(receipt.authorizing, false);
  });

  for (const [name, input, code] of [
    ["zero frame", Buffer.alloc(8), "FRAME_TRUNCATED"],
    ["declared truncation", rawFrame("{}", 3), "FRAME_LENGTH"],
    ["invalid UTF-8", rawFrame(Buffer.from([0xc3, 0x28])), "UTF8_INVALID"],
    [
      "duplicate field",
      rawFrame(JSON.stringify(request()).replace('"schemaVersion":1', '"schemaVersion":1,"schemaVersion":1')),
      "DUPLICATE_KEY",
    ],
    ["non-canonical whitespace", rawFrame(JSON.stringify(request(), null, 2)), "JSON_NON_CANONICAL"],
    ["oversized frame", rawFrame(Buffer.alloc(262_145, 0x20)), "FRAME_BOUND"],
    ["trailing bytes", Buffer.concat([encodeCanonicalFrame("launcher-request", request()), Buffer.from("x")]), "FRAME_LENGTH"],
    ["unknown field", rawFrame(JSON.stringify({ ...request(), unexpected: true })), "UNKNOWN_FIELD"],
    ["depth beyond 32", rawFrame(`${"[".repeat(33)}0${"]".repeat(33)}`), "DEPTH_BOUND"],
    ["value count beyond 4096", rawFrame(`[${Array.from({ length: 4096 }, () => "0").join(",")}]`), "VALUE_BOUND"],
  ]) {
    it(`refuses ${name} without starting a worker`, () => {
      const child = runLauncher(input);
      const receipt = refusalReceipt(child);
      assert.equal(receipt.refusalCode, code);
      assert.equal(receipt.exitCode, 1);
      assert.equal(receipt.partial, false);
    });
  }

  it("refuses caller-selected source or artifact locators before registry creation", () => {
    for (const locator of [SCALAR_SOURCE, CHECKED_ARTIFACT]) {
      const child = spawnSync(process.execPath, [BUILD_SCRIPT, locator], {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 130_000,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });
      assert.notEqual(child.status, 0);
      assert.match(`${child.stdout}\n${child.stderr}`, /ARGUMENT.*REFUSED/u);
    }
  });
});
