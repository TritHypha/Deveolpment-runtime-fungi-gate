import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { isTri } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const PRODUCT_ROOT = join(
  PACKAGE_ROOT,
  "..",
  "..",
  "packages",
  "fungi",
  "products",
  "galerina",
  "rd0873-core-logic",
);
const ASSET = "is-tri.fungi";
const ASSET_PATH = join(PRODUCT_ROOT, ASSET);
const COMPILER = join(
  PACKAGE_ROOT,
  "..",
  "galerina-core-compiler",
  "dist",
  "index.js",
);
const NUMERIC_CASES = Object.freeze([
  -1,
  0,
  -0,
  1,
  -1.0000000001,
  0.5,
  Number.MIN_VALUE,
  Number.MAX_VALUE,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
]);

function hostBoundary(value, fungiNumericClassifier) {
  // This is the retained unknown-input boundary from the TypeScript oracle.
  // Fungi receives a value only after the exact primitive-kind check.
  return typeof value === "number" ? Boolean(fungiNumericClassifier(value)) : false;
}

async function compileCandidate() {
  assert.ok(existsSync(COMPILER), "core compiler must be built before core-logic");
  assert.ok(existsSync(ASSET_PATH), `missing governed Fungi asset: ${ASSET}`);
  const compiler = await import(pathToFileURL(COMPILER).href);
  const source = readFileSync(ASSET_PATH, "utf8").replace(/^\uFEFF/u, "");
  const program = compiler.parseProgram(source, ASSET);
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact isTri Fungi asset must parse without errors",
  );
  const typeDiagnostics = compiler.checkTypes(program.ast).diagnostics ?? [];
  assert.deepEqual(
    typeDiagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact isTri Fungi asset must type-check without errors",
  );
  const effects = compiler.checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics ?? [])
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact isTri Fungi asset must have no effect errors",
  );
  const { gir } = compiler.emitGIR(program.ast, program.flows, effects);
  const wat = compiler.renderWAT(
    compiler.buildWATModuleFromGIR(gir, undefined, "isTri", program.ast, true),
  );
  const assembled = await compiler.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, {});
  assert.equal(typeof instance.exports.isTri, "function");
  return { compiler, instance, numeric: instance.exports.isTri, program, wat };
}

describe("core-logic isTri selective Fungi leaf", () => {
  it("keeps the TypeScript unknown boundary explicit and exact", () => {
    const fungiSource = readFileSync(ASSET_PATH, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.match(fungiSource, /pure flow isTri\(value: Float64\) -> Bool/u);
    assert.match(
      readFileSync(join(PACKAGE_ROOT, "src", "index.ts"), "utf8"),
      /export function isTri\(value: unknown\): value is Tri \{\s*return value === TRI_FALSE \|\| value === TRI_UNKNOWN \|\| value === TRI_TRUE;\s*\}/u,
    );
    assert.match(
      hostBoundary.toString(),
      /typeof value === "number" \? Boolean\(fungiNumericClassifier\(value\)\) : false/u,
    );
  });

  it("matches the source for numeric IEEE-754 values, including signed zero and non-finite values", async () => {
    const compiled = await compileCandidate();
    for (const value of NUMERIC_CASES) {
      const interpreted = await compiled.compiler.executeFlow(
        "isTri",
        new Map([["value", { __tag: "float", value }]]),
        compiled.program.ast,
        compiled.program.flows,
      );
      assert.deepEqual(interpreted.value, { __tag: "bool", value: isTri(value) });

      const raw = compiled.numeric(value);
      assert.ok(raw === 0 || raw === 1, "Wasm Bool must use the canonical i32 representation");
      assert.equal(Boolean(raw), isTri(value), `Fungi isTri(${String(value)})`);
    }
  });

  it("matches the source for non-number unknown values without coercion or property access", async () => {
    const compiled = await compileCandidate();
    let calls = 0;
    const numeric = (value) => {
      calls += 1;
      return compiled.numeric(value);
    };
    let touched = 0;
    const hostile = new Proxy(
      {},
      {
        get() {
          touched += 1;
          throw new Error("property access must not occur");
        },
        getPrototypeOf() {
          touched += 1;
          throw new Error("prototype access must not occur");
        },
      },
    );
    const values = [
      undefined,
      null,
      true,
      false,
      "-1",
      1n,
      Symbol("tri"),
      hostile,
      Object(-1),
      () => -1,
    ];
    for (const value of values) {
      assert.equal(hostBoundary(value, numeric), isTri(value), "host boundary parity");
    }
    assert.equal(calls, 0, "non-number values must not cross the Fungi boundary");
    assert.equal(touched, 0, "unknown values must not be inspected or coerced");
  });

  it("dispatches each numeric value once and preserves the exact value", async () => {
    const compiled = await compileCandidate();
    const seen = [];
    const observed = (value) => {
      seen.push(value);
      return compiled.numeric(value);
    };
    for (const value of [-1, -0, 0, 1, 0.25, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(hostBoundary(value, observed), isTri(value));
    }
    assert.equal(seen.length, 7);
    assert.equal(Object.is(seen[1], -0), true);
    assert.equal(Object.is(seen[5], Number.NaN), true);
    assert.equal(seen[6], Number.POSITIVE_INFINITY);
  });

  it("keeps the numeric ABI on the Float64 lane without implicit conversion", async () => {
    const compiled = await compileCandidate();
    assert.match(compiled.wat, /\(func \$isTri \(param \$p0 f64\)/u);
    const functionBody = compiled.wat.slice(compiled.wat.indexOf("(func $isTri"));
    assert.doesNotMatch(functionBody, /f64\.convert_i32_s/u);
  });
});
