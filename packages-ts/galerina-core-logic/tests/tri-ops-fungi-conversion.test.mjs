import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { triAnd, triNor, triNot, triOr } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "tri-ops.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const COMPILER = join(
  PACKAGE_ROOT,
  "..",
  "galerina-core-compiler",
  "dist",
  "index.js",
);
const TRITS = Object.freeze([-1, 0, 1]);

async function compileTriOps() {
  assert.ok(existsSync(COMPILER), "core compiler must be built before core-logic");
  assert.ok(existsSync(SOURCE), "the package-owned Tri Fungi asset must exist");
  const compiler = await import(pathToFileURL(COMPILER).href);
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = compiler.parseProgram(source, "tri-ops.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact Tri Fungi asset must parse and type-check without errors",
  );
  const effects = compiler.checkEffects(program.flows, program.ast);
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const wat = compiler.renderWAT(
    compiler.buildWATModuleFromGIR(gir, undefined, "core-logic-tri-ops", program.ast, true),
  );
  const assembled = await compiler.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  const instance = await WebAssembly.instantiate(assembled.wasm, {});
  return instance.instance.exports;
}

describe("core-logic package-owned Fungi Tri operations", () => {
  it("tracks the exact source as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/tri-ops.fungi"),
    );
  });

  it("matches the TypeScript reference over the complete K3 domain", async () => {
    const fungi = await compileTriOps();
    assert.equal(typeof fungi.triNot, "function");
    assert.equal(typeof fungi.triAnd, "function");
    assert.equal(typeof fungi.triOr, "function");
    assert.equal(typeof fungi.triNor, "function");

    for (const left of TRITS) {
      assert.equal(fungi.triNot(left), triNot(left), `triNot(${left})`);
      for (const right of TRITS) {
        assert.equal(fungi.triAnd(left, right), triAnd(left, right), `triAnd(${left},${right})`);
        assert.equal(fungi.triOr(left, right), triOr(left, right), `triOr(${left},${right})`);
        assert.equal(fungi.triNor(left, right), triNor(left, right), `triNor(${left},${right})`);
      }
    }
  });
});
