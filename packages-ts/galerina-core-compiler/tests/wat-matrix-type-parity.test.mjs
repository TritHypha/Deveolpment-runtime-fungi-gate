import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateMatrixType } from "../../galerina-core-vector/dist/index.js";

// The native matrix validator is tested as a pure typed-record core.  The
// retained TypeScript validator remains the oracle for diagnostic order and
// exact paths.  Host object marshalling, getters, and proxies remain separate
// ABI obligations; raw Float64 parameters keep non-finite values observable to
// this bounded WASM lane.
const vectors = [
  { name: "valid dimensions", elementType: "Float32", rows: 2, columns: 3 },
  { name: "empty element type is outside this validator", elementType: "", rows: 2, columns: 3 },
  { name: "positive infinity rows", elementType: "Float32", rows: Number.POSITIVE_INFINITY, columns: 3 },
  { name: "negative infinity rows", elementType: "Float32", rows: Number.NEGATIVE_INFINITY, columns: 3 },
  { name: "NaN rows", elementType: "Float32", rows: Number.NaN, columns: 3 },
  { name: "positive infinity columns", elementType: "Float32", rows: 2, columns: Number.POSITIVE_INFINITY },
  { name: "negative infinity columns", elementType: "Float32", rows: 2, columns: Number.NEGATIVE_INFINITY },
  { name: "NaN columns", elementType: "Float32", rows: 2, columns: Number.NaN },
  { name: "both dimensions non-finite preserve row-first diagnostics", elementType: "Float32", rows: Number.POSITIVE_INFINITY, columns: Number.NaN },
  { name: "signed zero rows", elementType: "Float32", rows: -0, columns: 3 },
  { name: "signed zero columns", elementType: "Float32", rows: 2, columns: -0 },
  { name: "fractional rows", elementType: "Float32", rows: 1.5, columns: 3 },
  { name: "fractional columns", elementType: "Float32", rows: 2, columns: 1.5 },
  { name: "negative rows with a custom path", elementType: "Float32", rows: -1, columns: 3, path: "customMatrix" },
  { name: "negative columns with an empty path", elementType: "Float32", rows: 2, columns: -1, path: "" },
  { name: "both finite dimensions invalid preserve row-first diagnostics", elementType: "Float32", rows: -1, columns: 1.5 },
  { name: "largest safe dimensions", elementType: "Float64", rows: 9007199254740991, columns: 9007199254740991 },
  { name: "one past safe rows", elementType: "Float64", rows: 9007199254740992, columns: 1 },
  { name: "one past safe columns", elementType: "Float64", rows: 1, columns: 9007199254740992 },
];

const str = JSON.stringify;

function probe(index, vector) {
  const expected = validateMatrixType({
    elementType: vector.elementType,
    shape: { rows: vector.rows, columns: vector.columns },
  }, vector.path);
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
pure flow probe${index}(rows: Float64, columns: Float64) -> Bool
contract { intent { "Compare the matrix validator twin with its retained TypeScript oracle." } }
{
  let matrix: MatrixType = MatrixType {
    elementType: ${str(vector.elementType)},
    shape: MatrixShape { rows: rows, columns: columns }
  }
  let diagnostics: Array<VectorDiagnostic> = validateMatrixType(matrix, ${str(vector.path ?? "matrix")})
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
    await t.test(vectors[i].name, () => assert.equal(
      instance.exports[`probe${i}`](vectors[i].rows, vectors[i].columns),
      1,
    ));
  }
});
