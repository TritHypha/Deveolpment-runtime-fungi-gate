import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  decodeCanonicalFrame,
  encodeCanonicalFrame,
} from "../../packages-galerina/galerina-core-compiler/dist/index.js";

const ROOT = join(fileURLToPath(new URL("../..", import.meta.url)));
const BUILD_SCRIPT = join(ROOT, "scripts", "build-requirement-launcher.mjs");
const BINARY = join(
  ROOT,
  "build",
  "rd0858-requirement-launcher",
  "target",
  "release",
  "galerina-requirement-launcher.exe",
);
const BUILD_RECEIPT = join(
  ROOT,
  "build",
  "rd0858-requirement-launcher",
  "build-receipt.json",
);

const request = () => ({
  schemaVersion: 1,
  nonce: "00112233445566778899aabbccddeeff",
  runtimeProfile: "scalar-1",
  subjectDigest: "0".repeat(64),
  flowLocator: "rd0858/unit4/scalar-oracle",
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

function runLauncher(input, args = ["--decode-only"]) {
  return spawnSync(BINARY, args, {
    cwd: ROOT,
    input,
    encoding: null,
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
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
  it("builds one dependency-free launcher with a bounded receipt", () => {
    const build = buildLauncher();
    assert.equal(build.error, undefined);
    assert.equal(build.status, 0, build.stderr);
    assert.equal(existsSync(BINARY), true);
    const evidence = JSON.parse(build.stdout);
    assert.equal(evidence.schema, "galerina.requirement-launcher-build.v1");
    assert.equal(evidence.verdict, "BUILT_NON_AUTHORIZING");
    assert.match(evidence.binarySha256, /^[0-9a-f]{64}$/);
    const receipt = JSON.parse(readFileSync(BUILD_RECEIPT, "utf8"));
    assert.equal(receipt.verdict, "BUILT_NON_AUTHORIZING");
    assert.match(receipt.gitHead, /^[0-9a-f]{40}$/);
    assert.match(receipt.rustcVersion, /^rustc /);
    assert.deepEqual(receipt.command, ["cargo", "build", "--release", "--locked"]);
    assert.deepEqual(receipt.compileCfg, ["test_contract"]);
    assert.equal(receipt.binarySha256, evidence.binarySha256);
    assert.equal(Object.keys(receipt.inputs).length, 4);
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
    assert.equal(missingAbsolute.refusalCode, "WORKER_NOT_ADMITTED");
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
