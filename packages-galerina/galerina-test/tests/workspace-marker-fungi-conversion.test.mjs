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
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "workspace-marker.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "paths.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const EXPECTED = "galerina.workspace.json";

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned workspace marker Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "workspace-marker.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.ok(program.flows.some((flow) => flow.name === "workspaceMarker"));
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(buildWATModuleFromGIR(gir, undefined, "workspace-marker", program.ast, true));
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
  return { host, instance, program, source };
}

describe("galerina-test package-owned Fungi workspace marker", () => {
  it("binds the exact exported TypeScript constant and package-owned asset", async () => {
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
      40,
    );
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(reference, /export const WORKSPACE_MARKER = "galerina\.workspace\.json";/u);
    const syntaxOnly = compiled.source
      .replace(/^\s*\/\/\/.*$/gmu, "")
      .replace(/"(?:\\.|[^"\\])*"/gu, '""');
    assert.doesNotMatch(syntaxOnly, /\b(?:null|NaN|else|throw|try|catch|for|while|loop)\b/u);
  });

  it("preserves the exact String through interpretation and signed Wasm", async () => {
    const compiled = await compileCandidate();
    const interpreted = await executeFlow(
      "workspaceMarker",
      new Map(),
      compiled.program.ast,
      compiled.program.flows,
    );
    assert.deepEqual(interpreted.value, { __tag: "string", value: EXPECTED });
    assert.equal(
      compiled.host.readString(compiled.instance.exports.workspaceMarker()),
      EXPECTED,
    );
  });
});
