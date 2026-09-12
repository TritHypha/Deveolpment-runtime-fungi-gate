import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateVectorType } from "../../galerina-core-vector/dist/index.js";

// The Fungi twin is tested as a typed pure core.  The retained TypeScript
// validator remains the oracle for diagnostic order and exact message/path;
// non-finite host values stay a separate ABI obligation.
const vectors = [
  { name: "valid lane count", elementType: "Float32", lanes: 4 },
  { name: "blank element type", elementType: "   ", lanes: 4 },
  { name: "zero lane count", elementType: "Float32", lanes: 0 },
  { name: "negative lane count", elementType: "Float32", lanes: -2 },
  { name: "fractional lane count", elementType: "Float32", lanes: 1.5 },
  { name: "largest safe integer", elementType: "Float64", lanes: 9007199254740991 },
  { name: "one past largest safe integer", elementType: "Float64", lanes: 9007199254740992 },
];

const str = JSON.stringify;

function probe(index, vector) {
  const expected = validateVectorType({
    elementType: vector.elementType,
    dimension: { lanes: vector.lanes },
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
  const laneLiteral = Number.isInteger(vector.lanes) ? `${vector.lanes}.0` : `${vector.lanes}`;
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the vector validator twin with its retained TypeScript oracle." } }
{
  let vector: VectorType = VectorType {
    elementType: ${str(vector.elementType)},
    dimension: VectorDimension { lanes: ${laneLiteral} }
  }
  let diagnostics: Array<VectorDiagnostic> = validateVectorType(vector, "vector")
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 vector validator twin preserves safe-integer diagnostics in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/validate-vector-type.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "vector-type-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and vector probes parse/check");
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
