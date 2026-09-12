import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { createVectorReport } from "../../galerina-core-vector/dist/index.js";

// The native report core receives explicit Option lists. The retained TypeScript
// createVectorReport function remains the oracle for defaults and order.
const vectors = [
  { name: "explicit defaults", operations: undefined, tensorOperations: undefined },
  {
    name: "valid vector operation",
    operations: [{
      name: "add",
      inputs: [{ elementType: "Float32", dimension: { lanes: 4 } }],
      output: { elementType: "Float32", dimension: { lanes: 4 } },
    }],
    tensorOperations: undefined,
  },
  {
    name: "invalid vector operation diagnostics",
    operations: [{
      name: "",
      inputs: [{ elementType: "", dimension: { lanes: 0 } }],
      output: { elementType: "Float32", dimension: { lanes: 4 } },
    }],
    tensorOperations: undefined,
  },
  {
    name: "invalid tensor operation diagnostics",
    operations: undefined,
    tensorOperations: [{
      name: "reshape",
      inputs: [{ elementType: "Float32", shape: { dimensions: [1, 0] } }],
      output: { elementType: "Float32", shape: { dimensions: [] } },
      pure: true,
    }],
  },
  {
    name: "vector diagnostics precede tensor diagnostics",
    operations: [{
      name: "add",
      inputs: [{ elementType: "Float32", dimension: { lanes: 1.5 } }],
      output: { elementType: "Float32", dimension: { lanes: 4 } },
    }],
    tensorOperations: [{
      name: "reshape",
      inputs: [{ elementType: "Float32", shape: { dimensions: [-1] } }],
      output: { elementType: "Float32", shape: { dimensions: [1] } },
      pure: false,
    }],
  },
  {
    name: "safe integer boundaries",
    operations: [{
      name: "wide",
      inputs: [{ elementType: "Float64", dimension: { lanes: 9007199254740991 } }],
      output: { elementType: "Float64", dimension: { lanes: 9007199254740992 } },
    }],
    tensorOperations: undefined,
  },
];

const str = JSON.stringify;

function literal(value) {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

function vectorExpression(vector) {
  return `VectorType { elementType: ${str(vector.elementType)}, dimension: VectorDimension { lanes: ${literal(vector.dimension.lanes)} } }`;
}

function tensorExpression(tensor) {
  const dimensions = tensor.shape.dimensions.reduce(
    (expression, dimension) => `${expression}.append(TensorDimension { value: ${literal(dimension)} })`,
    "Array.empty()",
  );
  return `TensorType { elementType: ${str(tensor.elementType)}, shape: TensorShape { dimensions: ${dimensions} } }`;
}

function probe(index, vector) {
  const expected = createVectorReport({
    ...(vector.operations === undefined ? {} : { operations: vector.operations }),
    ...(vector.tensorOperations === undefined ? {} : { tensorOperations: vector.tensorOperations }),
  });
  const checks = expected.diagnostics.map((diagnostic, diagnosticIndex) => `
  match report.diagnostics.get(${diagnosticIndex}) {
    Some(item) => {
      if item.code != ${str(diagnostic.code)} { return false }
      if item.severity != ${str(diagnostic.severity)} { return false }
      if item.message != ${str(diagnostic.message)} { return false }
      if item.path != ${str(diagnostic.path)} { return false }
    }
    None => { return false }
    _ => { return false }
  }`).join("\n");
  const operations = vector.operations === undefined
    ? "None"
    : `Some(${vector.operations.reduce(
      (expression, operation) => `${expression}.append(VectorOperation { name: ${str(operation.name)}, inputs: ${operation.inputs.reduce(
        (inputExpression, input) => `${inputExpression}.append(${vectorExpression(input)})`,
        "Array.empty()",
      )}, output: ${vectorExpression(operation.output)} })`,
      "Array.empty()",
    )})`;
  const tensorOperations = vector.tensorOperations === undefined
    ? "None"
    : `Some(${vector.tensorOperations.reduce(
      (expression, operation) => `${expression}.append(TensorOperation { name: ${str(operation.name)}, inputs: ${operation.inputs.reduce(
        (inputExpression, input) => `${inputExpression}.append(${tensorExpression(input)})`,
        "Array.empty()",
      )}, output: ${tensorExpression(operation.output)}, pure: ${operation.pure} })`,
      "Array.empty()",
    )})`;
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the vector report twin with its retained TypeScript oracle." } }
{
  let report: VectorReport = createVectorReport(${operations}, ${tensorOperations})
  if report.operations.count() != ${expected.operations.length} { return false }
  if report.tensorOperations.count() != ${expected.tensorOperations.length} { return false }
  if report.diagnostics.count() != ${expected.diagnostics.length} { return false }
  if report.warnings.count() != ${expected.warnings.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 vector report twin preserves defaults, diagnostics and order in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/create-vector-report.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "vector-report-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and report probes parse/check");
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
