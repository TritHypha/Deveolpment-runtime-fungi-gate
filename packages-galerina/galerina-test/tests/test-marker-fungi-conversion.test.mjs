import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  assembleWAT,
  admitAndInstantiate,
  buildWATModuleFromGIR,
  checkEffects,
  createHostRuntime,
  emitGIR,
  executeFlow,
  generateRunnerKeypair,
  getInternedStrings,
  parseProgram,
  renderWAT,
  signWasm,
} from "../../galerina-core-compiler/dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "test-marker.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "cli.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned test marker Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "test-marker.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact test marker Fungi asset must parse and type-check without errors",
  );
  assert.ok(program.flows.some((flow) => flow.name === "mark"), "missing Fungi flow mark");
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(buildWATModuleFromGIR(gir, undefined, "test-marker", program.ast, true));
  const assembled = await assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  const host = createHostRuntime();
  for (const entry of getInternedStrings()) host.seedString(entry.handle, entry.value);
  const keypair = generateRunnerKeypair();
  const attestation = signWasm(assembled.wasm, keypair.privateKeyPem, "dev");
  const { instance } = await admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keypair.publicKeyPem },
    host,
  });
  assert.equal(typeof instance.exports.mark, "function");
  return { host, instance, program, source };
}

async function interpret(compiled, ok) {
  const interpreted = await executeFlow(
    "mark",
    new Map([["ok", { __tag: "bool", value: ok }]]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, ok) {
  return compiled.host.readString(compiled.instance.exports.mark(ok ? 1 : 0));
}

describe("galerina-test package-owned Fungi human marker", () => {
  it("binds the exact private Boolean decision and package-owned asset", async () => {
    const compiled = await compileCandidate();
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    const loadedAssets = packageJson.packageGraph?.loadedAssets ?? [];
    assert.deepEqual(loadedAssets.filter((asset) => !asset.includes("/conversion-overlays/")), [
      "src/self-hosted/runner-constants.fungi",
      "src/self-hosted/test-marker.fungi",
      "src/self-hosted/workspace-marker.fungi",
    ]);
    assert.equal(
      loadedAssets.filter((asset) => asset.includes("/conversion-overlays/")).length,
      80,
    );
    const executableFungi = compiled.source.replace(/^\s*\/\/\/.*$/gmu, "");
    const syntaxOnly = executableFungi.replace(/"(?:\\.|[^"\\])*"/gu, '""');
    assert.doesNotMatch(
      syntaxOnly,
      /\b(?:null|NaN|else|throw|try|catch|for|while|loop)\b/u,
    );
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function mark\(ok: boolean\): string \{\s*return ok \? "✅" : "❌";\s*\}/u,
    );
  });

  it("preserves the complete Boolean domain through interpretation and signed Wasm", async () => {
    const compiled = await compileCandidate();
    for (const ok of [false, true]) {
      const wanted = ok ? "✅" : "❌";
      assert.deepEqual(
        await interpret(compiled, ok),
        { __tag: "string", value: wanted },
        `Fungi ${ok}`,
      );
      assert.equal(executeWasm(compiled, ok), wanted, `Wasm ${ok}`);
    }
  });
});
