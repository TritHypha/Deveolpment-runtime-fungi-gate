import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { validateVectorOperation } from "../../galerina-core-vector/dist/index.js";

// The native operation validator is tested as a pure typed core.  The retained
// TypeScript validator remains the oracle for input-list/output diagnostic
// order and exact paths.  Raw Float64 parameters keep non-finite lane values
// observable to this bounded WASM lane; host record/array marshalling, getters,
// and proxies remain separate ABI obligations.
const vectors = [
  {
    name: "matching operation",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: 4 }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "blank operation name",
    operationName: "   ",
    inputs: [{ elementType: "Float32", lanes: 4 }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "positive infinity input precedes mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: Number.POSITIVE_INFINITY }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "negative infinity input and output retain caller order",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: Number.NEGATIVE_INFINITY }],
    output: { elementType: "Float32", lanes: Number.NEGATIVE_INFINITY },
  },
  {
    name: "NaN input and output retain caller order before mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: Number.NaN }],
    output: { elementType: "Float32", lanes: Number.NaN },
  },
  {
    name: "positive infinity output precedes mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: 4 }],
    output: { elementType: "Float32", lanes: Number.POSITIVE_INFINITY },
  },
  {
    name: "negative infinity output precedes mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: 4 }],
    output: { elementType: "Float32", lanes: Number.NEGATIVE_INFINITY },
  },
  {
    name: "NaN output precedes mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: 4 }],
    output: { elementType: "Float32", lanes: Number.NaN },
  },
  {
    name: "non-finite input list retains object order before mismatch",
    operationName: "add",
    inputs: [
      { elementType: "Float32", lanes: Number.POSITIVE_INFINITY },
      { elementType: "Float32", lanes: Number.NaN },
      { elementType: "Float32", lanes: Number.NEGATIVE_INFINITY },
    ],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "invalid input diagnostics precede mismatch",
    operationName: "add",
    inputs: [{ elementType: "", lanes: 0 }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "lane mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float32", lanes: 8 }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "element mismatch",
    operationName: "add",
    inputs: [{ elementType: "Float64", lanes: 4 }],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "multiple inputs retain order",
    operationName: "add",
    inputs: [
      { elementType: "Float32", lanes: 4 },
      { elementType: "Float32", lanes: 1.5 },
      { elementType: "", lanes: 0 },
    ],
    output: { elementType: "Float32", lanes: 4 },
  },
  {
    name: "safe integer boundaries",
    operationName: "wide",
    inputs: [{ elementType: "Float64", lanes: 9007199254740991 }],
    output: { elementType: "Float64", lanes: 9007199254740992 },
  },
];

const str = JSON.stringify;

function vectorExpression(vector, lanesExpression) {
  return `VectorType { elementType: ${str(vector.elementType)}, dimension: VectorDimension { lanes: ${lanesExpression} } }`;
}

function probe(index, vector) {
  const expected = validateVectorOperation({
    name: vector.operationName,
    inputs: vector.inputs.map((input) => ({
      elementType: input.elementType,
      dimension: { lanes: input.lanes },
    })),
    output: {
      elementType: vector.output.elementType,
      dimension: { lanes: vector.output.lanes },
    },
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
  const inputParameters = vector.inputs.map((_, inputIndex) => `input${inputIndex}Lanes`);
  const parameterNames = [...inputParameters, "outputLanes"];
  const parameters = parameterNames.map((name) => `${name}: Float64`).join(", ");
  const inputs = vector.inputs.reduce(
    (expression, input, inputIndex) => `${expression}.append(${vectorExpression(input, inputParameters[inputIndex])})`,
    "Array.empty()",
  );
  return `
pure flow probe${index}(${parameters}) -> Bool
contract { intent { "Compare the vector operation twin with its retained TypeScript oracle." } }
{
  let inputs: Array<VectorType> = ${inputs}
  let operation: VectorOperation = VectorOperation {
    name: ${str(vector.operationName)},
    inputs: inputs,
    output: ${vectorExpression(vector.output, "outputLanes")}
  }
  let diagnostics: Array<VectorDiagnostic> = validateVectorOperation(operation)
  if diagnostics.count() != ${expected.length} { return false }
  ${checks}
  return true
}
`;
}

test("Wave 02 vector operation twin preserves operand diagnostics and mismatch routing in WASM", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/validate-vector-operation.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map((vector, i) => probe(i, vector)).join("\n"), "vector-operation-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and vector operation probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of L.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let i = 0; i < vectors.length; i++) {
    const laneArguments = [...vectors[i].inputs.map((input) => input.lanes), vectors[i].output.lanes];
    await t.test(vectors[i].name, () => assert.equal(instance.exports[`probe${i}`](...laneArguments), 1));
  }
});
