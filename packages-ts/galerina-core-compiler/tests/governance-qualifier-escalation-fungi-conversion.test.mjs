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
  diffGovernance,
  emitGIR,
  executeFlow,
  generateRunnerKeypair,
  getInternedStrings,
  parseProgram,
  renderWAT,
  signWasm,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(
  PACKAGE_ROOT,
  "src",
  "self-hosted",
  "governance-qualifier-escalation.fungi",
);
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "governance-diff.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const QUALIFIERS = Object.freeze([
  "pure",
  "flow",
  "guarded",
  "secure",
  "privileged",
  "",
  "unknown",
]);
const RANK = Object.freeze({ pure: 0, flow: 1, guarded: 2, secure: 3, privileged: 4 });

function expectedRank(qualifier) {
  return RANK[qualifier] ?? 0;
}

function expectedEscalation(before, after) {
  return expectedRank(after) > expectedRank(before);
}

function meta(name, qualifier) {
  return { name, qualifier, declaredEffects: [] };
}

function publicCallerEscalation(before, after) {
  const result = diffGovernance(
    [meta("candidate", before)],
    [meta("candidate", after)],
  );
  return result.widensAuthority;
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned qualifier escalation Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "governance-qualifier-escalation.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact qualifier escalation Fungi asset must parse and type-check without errors",
  );
  const effects = checkEffects(program.flows, program.ast);
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(
      gir,
      undefined,
      "governance-qualifier-escalation",
      program.ast,
      true,
    ),
  );
  const assembled = await assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  assert.match(wat, /call \$host___str_eq/u, "String equality must lower by value");
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
  assert.equal(typeof instance.exports.qualifierEscalated, "function");
  return { host, instance, program };
}

async function interpret(compiled, before, after) {
  const interpreted = await executeFlow(
    "qualifierEscalated",
    new Map([
      ["before", { __tag: "string", value: before }],
      ["after", { __tag: "string", value: after }],
    ]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, before, after) {
  return Boolean(compiled.instance.exports.qualifierEscalated(
    compiled.host.internString(before),
    compiled.host.internString(after),
  ));
}

describe("compiler package-owned Fungi governance qualifier escalation", () => {
  it("tracks the private source table and decision as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/governance-qualifier-escalation.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /const QUALIFIER_RANK: Record<string, number> = \{\s*pure: 0, flow: 1, guarded: 2, secure: 3, privileged: 4,\s*\};/u,
    );
    assert.match(
      reference,
      /function qualifierEscalated\(before: string, after: string\): boolean \{\s*return \(QUALIFIER_RANK\[after\] \?\? 0\) > \(QUALIFIER_RANK\[before\] \?\? 0\);\s*\}/u,
    );
  });

  it("matches the complete canonical-plus-hostile matrix and public caller", async () => {
    const compiled = await compileCandidate();
    for (const before of QUALIFIERS) {
      for (const after of QUALIFIERS) {
        const wanted = expectedEscalation(before, after);
        assert.equal(
          publicCallerEscalation(before, after),
          wanted,
          `TypeScript caller ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        );
        assert.deepEqual(
          await interpret(compiled, before, after),
          { __tag: "bool", value: wanted },
          `Fungi ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        );
        assert.equal(
          executeWasm(compiled, before, after),
          wanted,
          `Wasm ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
        );
      }
    }
  });
});
