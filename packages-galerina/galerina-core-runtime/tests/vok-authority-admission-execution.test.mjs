import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

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
const PACKAGE = join(HERE, "..", "package.json");

async function compileVokAuthorityVerdict() {
  assert.ok(existsSync(COMPILER), "core compiler must be built before core-runtime");
  assert.ok(existsSync(SOURCE), "the tracked VOK authority admission asset must exist");
  const compiler = await import(pathToFileURL(COMPILER).href);
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = compiler.parseProgram(source, "vok-authority-admission.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the VOK authority decision surface must pass strict production parsing and checks",
  );
  const effects = compiler.checkEffects(program.flows, program.ast);
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const wat = compiler.renderWAT(
    compiler.buildWATModuleFromGIR(gir, undefined, "vok-authority", program.ast, true),
  );
  const assembled = await compiler.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  const instance = await WebAssembly.instantiate(assembled.wasm, {});
  const verdict = instance.instance.exports.vokAuthorityVerdict;
  assert.equal(typeof verdict, "function");
  return verdict;
}

function expectedMin(vector) {
  if (vector.some((value) => !Number.isInteger(value) || value < -1 || value > 1)) {
    return -1;
  }
  return Math.min(...vector);
}

function* k3Vectors(width, prefix = []) {
  if (prefix.length === width) {
    yield prefix;
    return;
  }
  for (const value of [-1, 0, 1]) {
    yield* k3Vectors(width, [...prefix, value]);
  }
}

describe("native VOK .fungi admission decision", () => {
  it("tracks the decision surface as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/vok-authority-admission.fungi",
      ),
    );
  });

  it("matches K3 min for all 3^9 vectors and authorizes exactly one", async () => {
    const verdict = await compileVokAuthorityVerdict();
    let vectors = 0;
    let authorizing = 0;
    for (const vector of k3Vectors(9)) {
      const actual = verdict(...vector);
      assert.equal(actual, expectedMin(vector), JSON.stringify(vector));
      vectors += 1;
      if (actual === 1) authorizing += 1;
    }
    assert.equal(vectors, 19_683);
    assert.equal(authorizing, 1);
  });

  it("refuses malformed trits rather than treating them as authority", async () => {
    const verdict = await compileVokAuthorityVerdict();
    const allPositive = Array(9).fill(1);
    for (const malformed of [-2, 2, 7, 2_147_483_647, -2_147_483_648]) {
      const vector = [...allPositive];
      vector[4] = malformed;
      assert.equal(verdict(...vector), -1, `malformed trit ${malformed} must refuse`);
    }
  });
});
