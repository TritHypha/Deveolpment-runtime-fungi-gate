import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  decodeCanonicalFrame,
  encodeCanonicalFrame,
} from "../../packages-galerina/galerina-core-compiler/dist/index.js";

const ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));
const BUILD_SCRIPT = join(ROOT, "scripts", "build-requirement-launcher.mjs");
const OUTPUT = join(ROOT, "build", "rd0858-requirement-launcher");
const BINARY = join(OUTPUT, "galerina-requirement-launcher.exe");
const BUILD_RECEIPT = join(
  OUTPUT,
  "build-receipt.json",
);
const REGISTRY = join(OUTPUT, "test-registry.json");

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

function buildLauncher() {
  return spawnSync(process.execPath, [BUILD_SCRIPT], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 180_000,
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

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function registryFixture(mutate) {
  const directory = mkdtempSync(join(OUTPUT, "registry-fixture-"));
  const value = JSON.parse(readFileSync(REGISTRY, "utf8"));
  mutate(value, directory);
  const path = join(directory, "registry.json");
  writeFileSync(path, canonicalJson(value), "utf8");
  return { directory, path };
}

function rawFrame(body, declaredLength = body.length) {
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(declaredLength));
  return Buffer.concat([prefix, Buffer.from(body)]);
}

function refusalReceipt(child) {
  assert.equal(child.error, undefined);
  assert.equal(child.status, 1, child.stderr?.toString("utf8"));
  const receipt = decodeCanonicalFrame("receipt", child.stdout);
  assert.equal(receipt.authorizing, false);
  assert.equal(receipt.executionState, "REFUSED");
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
    assert.equal(Object.keys(receipt.inputs).length, 6);
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
    ));
    assert.equal(receipt.refusalCode, "WORKER_TIMEOUT");
    assert.equal(receipt.timedOut, true);
  });

  it("blocks an extra child inside the owned Job Object", () => {
    const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
    const unowned = spawnSync(registry.runtime.path, [registry.worker.path, "extra-child"], {
      cwd: ROOT,
      env: process.env,
      encoding: "utf8",
      timeout: 5_000,
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
});
