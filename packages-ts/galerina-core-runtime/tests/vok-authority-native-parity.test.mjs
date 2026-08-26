import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPILER = join(
  HERE,
  "..",
  "..",
  "galerina-core-compiler",
  "dist",
  "index.js",
);
const SOURCE = join(
  HERE,
  "..",
  "src",
  "self-hosted",
  "vok-authority-admission.fungi",
);
const NATIVE_MANIFEST = join(HERE, "..", "native", "vok-authority", "Cargo.toml");
const VECTOR_COUNT = 3 ** 9;
const HEADER = Buffer.from("VOKK3V1\0", "ascii");

async function compileFungiVerdict() {
  assert.ok(existsSync(COMPILER), "core compiler must be built before native parity");
  const compiler = await import(pathToFileURL(COMPILER).href);
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = compiler.parseProgram(source, "vok-authority-admission.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const effects = compiler.checkEffects(program.flows, program.ast);
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const wat = compiler.renderWAT(
    compiler.buildWATModuleFromGIR(gir, undefined, "vok-native-parity", program.ast, true),
  );
  const assembled = await compiler.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const instance = await WebAssembly.instantiate(assembled.wasm, {});
  return instance.instance.exports.vokAuthorityVerdict;
}

function decodeOrdinal(ordinal) {
  const vector = Array(9);
  let remainder = ordinal;
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = (remainder % 3) - 1;
    remainder = Math.floor(remainder / 3);
  }
  return vector;
}

test("native and .fungi VOK folds agree byte-for-byte for all 3^9 vectors", async () => {
  const native = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "--offline",
      "--manifest-path",
      NATIVE_MANIFEST,
      "--bin",
      "vok-vector-runner",
    ],
    { encoding: null, maxBuffer: 1024 * 1024, windowsHide: true },
  );
  assert.equal(native.error, undefined, native.error?.message);
  assert.equal(native.status, 0, native.stderr?.toString("utf8"));
  assert.deepEqual(native.stdout.subarray(0, HEADER.length), HEADER);
  assert.equal(native.stdout.readUInt32LE(HEADER.length), VECTOR_COUNT);
  const results = native.stdout.subarray(HEADER.length + 4);
  assert.equal(results.length, VECTOR_COUNT);

  const fungiVerdict = await compileFungiVerdict();
  let authorizing = 0;
  for (let ordinal = 0; ordinal < VECTOR_COUNT; ordinal += 1) {
    const vector = decodeOrdinal(ordinal);
    const nativeVerdict = results[ordinal] - 1;
    const fungi = fungiVerdict(...vector);
    assert.equal(nativeVerdict, fungi, JSON.stringify({ ordinal, vector }));
    if (nativeVerdict === 1) authorizing += 1;
  }
  assert.equal(authorizing, 1);
});
