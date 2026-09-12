import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as L from "../dist/index.js";
import { defineVectorType } from "../../galerina-core-vector/dist/index.js";

// The typed Fungi core keeps the source constructor's failure text in Err.
// The TypeScript constructor remains the oracle; a host adapter must map Err
// back to Error before any consumer is admitted.
const vectors = [
  { name: "valid lane count", elementType: "Float32", lanes: 4 },
  { name: "blank element type", elementType: "   ", lanes: 4 },
  { name: "zero lane count", elementType: "Float32", lanes: 0 },
  { name: "negative lane count", elementType: "Float32", lanes: -2 },
  { name: "fractional lane count", elementType: "Float32", lanes: 1.5 },
  { name: "both constructor inputs invalid", elementType: "", lanes: 1.5 },
  { name: "largest safe integer", elementType: "Float64", lanes: 9007199254740991 },
  { name: "one past largest safe integer", elementType: "Float64", lanes: 9007199254740992 },
  { name: "positive infinity", elementType: "Float64", lanes: Number.POSITIVE_INFINITY },
  { name: "negative infinity", elementType: "Float64", lanes: Number.NEGATIVE_INFINITY },
];

const str = JSON.stringify;

function sourceFor(vector, index) {
  const parameterized = !Number.isFinite(vector.lanes);
  const laneLiteral = Number.isFinite(vector.lanes)
    ? (Number.isInteger(vector.lanes) ? `${vector.lanes}.0` : `${vector.lanes}`)
    : "lanes";
  const expected = (() => {
    try {
      const value = defineVectorType(vector.elementType, vector.lanes);
      return { ok: true, value, error: "" };
    } catch (error) {
      return { ok: false, value: undefined, error: error instanceof Error ? error.message : String(error) };
    }
  })();

  const successChecks = expected.ok ? `
      if value.elementType != ${str(expected.value.elementType)} { return false }
      if value.dimension.lanes != ${expected.value.dimension.lanes}.0 { return false }
      return true` : `
      return false`;
  const failureChecks = expected.ok ? `
      return false` : `
      if message != ${str(expected.error)} { return false }
      return true`;

  return `
pure flow probe${index}(${parameterized ? "lanes: Float64" : ""}) -> Bool
contract { intent { "Compare typed vector construction with the retained TypeScript throw oracle." } }
{
  let result: Result<VectorType, String> = defineVectorType(${str(vector.elementType)}, ${laneLiteral})
  match result {
    Ok(value) => {${successChecks}
    }
    Err(message) => {${failureChecks}
    }
    _ => { return false }
  }
}
`;
}

test("defineVectorType Fungi core preserves construction and throw outcomes", { timeout: 60_000 }, async (t) => {
  const twin = readFileSync(new URL(
    "../../../packages/fungi/products/galerina/rd0873-core-vector/define-vector-type.fungi", import.meta.url,
  ), "utf8");
  const program = L.parseProgram(twin + vectors.map(sourceFor).join("\n"), "vector-definition-parity.fungi");
  const errors = program.diagnostics.filter((d) => d.severity === "error");
  assert.deepEqual(errors, [], "candidate and construction probes parse/check");
  const effects = L.checkEffects(program.flows, program.ast);
  const { gir } = L.emitGIR(program.ast, program.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wasm-standalone", program.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = L.createHostRuntime();
  for (const entry of L.getInternedStrings()) host.seedString(entry.handle, entry.value);
  const { instance } = await WebAssembly.instantiate(assembled.wasm, host.imports);
  for (let i = 0; i < vectors.length; i++) {
    const args = Number.isFinite(vectors[i].lanes) ? [] : [vectors[i].lanes];
    await t.test(vectors[i].name, () => assert.equal(instance.exports[`probe${i}`](...args), 1));
  }
});
