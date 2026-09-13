import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as L from "../dist/index.js";

async function compileAndRun(source, flow) {
  const parsed = L.parseProgram(source, "wat-array-includes.fungi");
  const errors = parsed.diagnostics.filter((diagnostic) => diagnostic.severity === "error");
  assert.deepEqual(errors, [], `source must parse cleanly: ${JSON.stringify(errors)}`);
  const effects = L.checkEffects(parsed.flows, parsed.ast);
  const { gir } = L.emitGIR(parsed.ast, parsed.flows, effects);
  const wat = L.renderWAT(L.buildWATModuleFromGIR(gir, undefined, "wat-array-includes", parsed.ast, true));
  const assembled = await L.assembleWAT(wat);
  assert.equal(assembled.valid, true, `WAT must assemble: ${JSON.stringify(assembled.diagnostics)}`);
  const keypair = L.generateRunnerKeypair();
  const attestation = L.signWasm(assembled.wasm, keypair.privateKeyPem, "dev");
  const { instance } = await L.admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keypair.publicKeyPem },
    host: L.createHostRuntime(),
  });
  return { wat, value: instance.exports[flow]() };
}

describe("WAT lowering for source-level Array.includes", () => {
  it("maps includes to the typed array bridge and executes without a dangling call", async () => {
    const { wat, value } = await compileAndRun(`
pure flow hasTarget() -> Bool
contract { effects {} }
{
  let values = [10, 20, 30]
  return values.includes(20)
}
`, "hasTarget");
    assert.equal(value, 1);
    assert.match(wat, /call \$host___array_contains/u);
    assert.doesNotMatch(wat, /call \$includes(?:\s|\))/u);
  });
});
