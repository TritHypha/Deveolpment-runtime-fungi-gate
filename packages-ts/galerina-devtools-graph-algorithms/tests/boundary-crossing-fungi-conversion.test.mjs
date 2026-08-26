import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  admitAndInstantiate,
  assembleWAT,
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

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_RELATIVE = "src/self-hosted/boundary-crossing.fungi";
const ASSET = join(PACKAGE_ROOT, ...ASSET_RELATIVE.split("/"));
const KINDS = Object.freeze(["api", "webhook", "internal", "package", "secure", "public"]);
const TRUST = Object.freeze(["untrusted", "validated", "internal", "privileged"]);

function expected(callerKind, calleeTrustLevel) {
  if (!KINDS.includes(callerKind) || !TRUST.includes(calleeTrustLevel)) return false;
  if (callerKind === "secure") {
    return calleeTrustLevel === "internal" || calleeTrustLevel === "privileged";
  }
  if (callerKind === "api" || callerKind === "webhook") {
    return calleeTrustLevel !== "untrusted";
  }
  return true;
}

async function compileCandidate() {
  const source = readFileSync(ASSET, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, ASSET_RELATIVE);
  assert.deepEqual((program.diagnostics ?? []).filter((d) => d.severity === "error"), []);
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(effects.flatMap((r) => r.diagnostics).filter((d) => d.severity === "error"), []);
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const assembled = await assembleWAT(renderWAT(
    buildWATModuleFromGIR(gir, undefined, "isCrossingAllowed", program.ast, true),
  ));
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  const host = createHostRuntime();
  let nextHandle = 1;
  for (const entry of getInternedStrings()) {
    host.seedString(entry.handle, entry.value);
    nextHandle = Math.max(nextHandle, entry.handle + 1);
  }
  const keypair = generateRunnerKeypair();
  const attestation = signWasm(assembled.wasm, keypair.privateKeyPem, "dev");
  const { instance } = await admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keypair.publicKeyPem },
    host,
  });
  return { host, instance, nextHandle, program };
}

describe("graph-algorithms package-owned boundary crossing decision", () => {
  it("requires the governed Fungi asset and exact live source table", () => {
    assert.equal(existsSync(ASSET), true, `missing governed Fungi asset: ${ASSET_RELATIVE}`);
    const packageJson = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
    assert.ok(packageJson.packageGraph?.loadedAssets?.includes(ASSET_RELATIVE));
    const reference = readFileSync(join(PACKAGE_ROOT, "src", "graphs", "boundary-graph.ts"), "utf8");
    assert.match(reference, /function isCrossingAllowed\([\s\S]*?callerKind === "secure"/u);
    assert.match(reference, /callerKind === "api" \|\| callerKind === "webhook"/u);
  });

  it("matches all 24 typed crossings and refuses hostile surplus labels", async () => {
    const compiled = await compileCandidate();
    const values = [...KINDS, "", "Secure", "unknown"];
    const levels = [...TRUST, "", "Internal", "unknown"];
    for (const callerKind of values) {
      for (const calleeTrustLevel of levels) {
        const result = expected(callerKind, calleeTrustLevel);
        const interpreted = await executeFlow(
          "isCrossingAllowed",
          new Map([
            ["callerKind", { __tag: "string", value: callerKind }],
            ["calleeTrustLevel", { __tag: "string", value: calleeTrustLevel }],
          ]),
          compiled.program.ast,
          compiled.program.flows,
        );
        assert.deepEqual(
          interpreted.value,
          { __tag: "bool", value: result },
          `interpreted ${callerKind}->${calleeTrustLevel}`,
        );
        const callerHandle = compiled.nextHandle++;
        const calleeHandle = compiled.nextHandle++;
        compiled.host.seedString(callerHandle, callerKind);
        compiled.host.seedString(calleeHandle, calleeTrustLevel);
        assert.equal(
          Boolean(compiled.instance.exports.isCrossingAllowed(callerHandle, calleeHandle)),
          result,
          `signed Wasm ${callerKind}->${calleeTrustLevel}`,
        );
      }
    }
  });
});
