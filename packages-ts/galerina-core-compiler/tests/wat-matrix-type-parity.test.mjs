import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateMatrixType } from "../../galerina-core-vector/dist/index.js";

// The native matrix validator is tested as a pure typed core.  The retained
// TypeScript validator remains the oracle for diagnostic order and exact paths.
const vectors = [
  { name: "valid dimensions", elementType: "Float32", rows: 2, columns: 3 },
  { name: "zero rows", elementType: "Float32", rows: 0, columns: 3 },
  { name: "zero columns", elementType: "Float32", rows: 2, columns: 0 },
  { name: "both dimensions invalid", elementType: "Float32", rows: -1, columns: 1.5 },
  { name: "largest safe dimensions", elementType: "Float64", rows: 9007199254740991, columns: 1 },
  { name: "one past safe rows", elementType: "Float64", rows: 9007199254740992, columns: 1 },
  { name: "one past safe columns", elementType: "Float64", rows: 1, columns: 9007199254740992 },
];

const str = JSON.stringify;

function literal(value) {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

function probe(index, vector) {
  const expected = validateMatrixType({
    elementType: vector.elementType,
    shape: { rows: vector.rows, columns: vector.columns },
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
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the matrix validator twin with its retained TypeScript oracle." } }
{
  let matrix: MatrixType = MatrixType {
    elementType: ${str(vector.elementType)},
    shape: MatrixShape { rows: ${literal(vector.rows)}, columns: ${literal(vector.columns)} }
  }
  let diagnostics: Array<VectorDiagnostic> = validateMatrixType(matrix, "matrix")
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 matrix validator twin preserves safe-integer diagnostics in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/validate-matrix-type.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "matrix-type-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and matrix probes parse/check");
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
