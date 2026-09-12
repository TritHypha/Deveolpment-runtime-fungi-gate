import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateTensorOperation } from "../../galerina-core-vector/dist/index.js";

// The native tensor-operation validator is tested as a pure typed core. The
// retained TypeScript validator remains the oracle for order and exact paths.
const vectors = [
  {
    name: "matching operation",
    operationName: "matmul",
    inputs: [
      { elementType: "Float32", dimensions: [2, 3] },
      { elementType: "Float32", dimensions: [3, 4] },
    ],
    output: { elementType: "Float32", dimensions: [2, 4] },
    pure: true,
  },
  {
    name: "blank operation name",
    operationName: "   ",
    inputs: [{ elementType: "Float32", dimensions: [2] }],
    output: { elementType: "Float32", dimensions: [2] },
    pure: false,
  },
  {
    name: "empty input dimensions",
    operationName: "reduce",
    inputs: [{ elementType: "Float32", dimensions: [] }],
    output: { elementType: "Float32", dimensions: [1] },
    pure: true,
  },
  {
    name: "invalid input and output dimensions retain order",
    operationName: "reshape",
    inputs: [{ elementType: "Float32", dimensions: [0, 1.5] }],
    output: { elementType: "Float32", dimensions: [-1] },
    pure: true,
  },
  {
    name: "multiple inputs retain input order",
    operationName: "join",
    inputs: [
      { elementType: "Float32", dimensions: [1, 2] },
      { elementType: "Float32", dimensions: [9007199254740992] },
    ],
    output: { elementType: "Float32", dimensions: [3] },
    pure: false,
  },
  {
    name: "largest safe dimension",
    operationName: "wide",
    inputs: [{ elementType: "Float64", dimensions: [9007199254740991] }],
    output: { elementType: "Float64", dimensions: [9007199254740991] },
    pure: true,
  },
];

const str = JSON.stringify;

function literal(value) {
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

function tensorExpression(tensor) {
  const dimensions = tensor.dimensions.reduce(
    (expression, dimension) => `${expression}.append(TensorDimension { value: ${literal(dimension)} })`,
    "Array.empty()",
  );
  return `TensorType { elementType: ${str(tensor.elementType)}, shape: TensorShape { dimensions: ${dimensions} } }`;
}

function probe(index, vector) {
  const expected = validateTensorOperation({
    name: vector.operationName,
    inputs: vector.inputs.map((input) => ({
      elementType: input.elementType,
      shape: { dimensions: input.dimensions },
    })),
    output: {
      elementType: vector.output.elementType,
      shape: { dimensions: vector.output.dimensions },
    },
    pure: vector.pure,
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
  const inputs = vector.inputs.reduce(
    (expression, input) => `${expression}.append(${tensorExpression(input)})`,
    "Array.empty()",
  );
  return `
pure flow probe${index}() -> Bool
contract { intent { "Compare the tensor operation twin with its retained TypeScript oracle." } }
{
  let inputs: Array<TensorType> = ${inputs}
  let operation: TensorOperation = TensorOperation {
    name: ${str(vector.operationName)},
    inputs: inputs,
    output: ${tensorExpression(vector.output)},
    pure: ${vector.pure}
  }
  let diagnostics: Array<VectorDiagnostic> = validateTensorOperation(operation)
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 tensor operation twin preserves operand diagnostics in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/validate-tensor-operation.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "tensor-operation-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and tensor operation probes parse/check");
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
