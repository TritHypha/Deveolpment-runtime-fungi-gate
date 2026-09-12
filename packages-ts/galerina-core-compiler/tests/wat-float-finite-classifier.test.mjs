import assert from "node:assert/strict";
import { test } from "node:test";
import * as L from "../dist/index.js";

const values = [
  { name: "finite", value: 4.5, expected: true },
  { name: "signed zero", value: -0, expected: true },
  { name: "largest finite", value: Number.MAX_VALUE, expected: true },
  { name: "NaN", value: Number.NaN, expected: false },
  { name: "positive infinity", value: Number.POSITIVE_INFINITY, expected: false },
  { name: "negative infinity", value: Number.NEGATIVE_INFINITY, expected: false },
];

function tagged(value) {
  return { __tag: "float", value };
}

test("Float64.isFinite classifies raw Float64 input without a non-finite trap", async (t) => {
  const source = `
pure flow classify(value: Float64) -> Bool
contract { intent { "Classify a raw Float64 ingress before guarded comparisons." } }
{ return Float64.isFinite(value) }
`;
  const program = L.parseProgram(source, "float-finite-classifier.fungi");
  assert.deepEqual(program.diagnostics.filter((d) => d.severity === "error"), []);

  for (const entry of values) {
    await t.test(`interpreter ${entry.name}`, async () => {
      const result = await L.executeFlow(
        "classify",
        new Map([["value", tagged(entry.value)]]),
        program.ast,
        program.flows,
      );
      assert.equal(result.value?.__tag, "bool");
      assert.equal(result.value.value, entry.expected);
    });
  }

  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const { instance } = await WebAssembly.instantiate(assembled.wasm, L.createHostRuntime().imports);

  for (const entry of values) {
    await t.test(`WASM ${entry.name}`, () => {
      assert.equal(instance.exports.classify(entry.value), entry.expected ? 1 : 0);
    });
  }
});

test("Float64.isFinite cannot swallow a non-finite expression or malformed input", async () => {
  const program = L.parseProgram(`
pure flow expression(a: Float64, b: Float64) -> Bool
contract { intent { "Preserve fail-closed arithmetic before classification." } }
{ return Float64.isFinite(a / b) }
`, "float-finite-classifier-expression.fungi");
  assert.deepEqual(program.diagnostics.filter((d) => d.severity === "error"), []);

  const nonFinite = await L.executeFlow(
    "expression",
    new Map([
      ["a", tagged(0)],
      ["b", tagged(0)],
    ]),
    program.ast,
    program.flows,
  );
  assert.equal(nonFinite.value?.__tag, "runtimeError");
  assert.equal(nonFinite.value.message, "NonFiniteFloat");

  const malformedProgram = L.parseProgram(`
pure flow malformed(value: String) -> Bool
contract { intent { "Refuse a non-numeric classifier input." } }
{ return Float64.isFinite(value) }
`, "float-finite-classifier-malformed.fungi");
  assert.deepEqual(malformedProgram.diagnostics.filter((d) => d.severity === "error"), []);
  const malformed = await L.executeFlow(
    "malformed",
    new Map([["value", { __tag: "string", value: "not-a-float" }]]),
    malformedProgram.ast,
    malformedProgram.flows,
  );
  assert.equal(malformed.value?.__tag, "runtimeError");
  assert.equal(malformed.value.message, "InvalidFloatClassifierInput");
});
