import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateTensorType } from "../../galerina-core-vector/dist/index.js";

// The native tensor validator is tested as a pure typed core.  The retained
// TypeScript validator remains the oracle for dense dimension order and paths;
// sparse/hostile JavaScript array behavior is a separate ABI obligation.
const vectors = [
  { name: "empty dimensions", elementType: "Float32", dimensions: [] },
  { name: "valid dimensions", elementType: "Float32", dimensions: [1, 3, 768] },
  { name: "one invalid dimension", elementType: "Float32", dimensions: [1, 0, 3] },
  { name: "multiple invalid dimensions", elementType: "Float32", dimensions: [-1, 1.5, 3] },
  { name: "largest safe dimension", elementType: "Float64", dimensions: [9007199254740991] },
  { name: "one past safe dimension", elementType: "Float64", dimensions: [9007199254740992] },
];

const str = JSON.stringify;

function literal(value) {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

function probe(index, vector) {
  const expected = validateTensorType({
    elementType: vector.elementType,
    shape: { dimensions: vector.dimensions },
  });
  const checks = expected.map((diagnostic, diagnosticIndex) => `
  match diagnostics.get(${diagnosticIndex}) {
    Some(item) => {
      if item.code != ${str(diagnostic.code)} { return false }
      if item.severity != ${str(diagnostic.severity)} { return false }
      if item.message != ${str(diagnostic.message)} { return false }
      if item.path != ${str(diagnostic.path)} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  const dimensions = vector.dimensions.reduce(
    (expression, dimension) => `${expression}.append(TensorDimension { value: ${literal(dimension)} })`,
    "Array.empty()",
  );
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the tensor validator twin with its retained TypeScript oracle." } }
{
  let dimensions: Array<Float64> = ${dimensions}
  let tensor: TensorType = TensorType {
    elementType: ${str(vector.elementType)},
    shape: TensorShape { dimensions: dimensions }
  }
  let diagnostics: Array<VectorDiagnostic> = validateTensorType(tensor, "tensor")
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 tensor validator twin preserves dense dimension diagnostics in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/validate-tensor-type.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "tensor-type-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and tensor probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of L.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let i = 0; i < vectors.length; i++) {
    await t.test(vectors[i].name, () => assert.equal(instance.exports[`probe${i}`](), 1));
  }
});
