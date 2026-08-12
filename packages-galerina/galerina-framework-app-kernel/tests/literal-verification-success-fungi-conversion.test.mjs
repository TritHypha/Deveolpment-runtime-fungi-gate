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
  parseProgram,
  renderWAT,
  signWasm,
} from "../../galerina-core-compiler/dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(
  PACKAGE_ROOT,
  "src",
  "self-hosted",
  "literal-verification-success.fungi",
);
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "registry-index.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const SOURCE_CASES = Object.freeze([
  Object.freeze({ source: true, tag: 1, expected: true }),
  Object.freeze({ source: false, tag: 0, expected: false }),
  Object.freeze({ source: "no-key", tag: -1, expected: false }),
]);
const SURPLUS_TAGS = Object.freeze([-2, 2, -2_147_483_648, 2_147_483_647]);

function sourceDecision(value) {
  return value === true;
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the app-kernel must own the literal-success Fungi asset");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "literal-verification-success.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact literal-success Fungi asset must parse and type-check without errors",
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(
      gir,
      undefined,
      "literal-verification-success",
      program.ast,
      true,
    ),
  );
  const assembled = await assembleWAT(wat);
  assert.equal(assembled.valid, true, JSON.stringify(assembled.diagnostics));
  assert.deepEqual(assembled.diagnostics, []);
  const keypair = generateRunnerKeypair();
  const attestation = signWasm(assembled.wasm, keypair.privateKeyPem, "dev");
  const host = createHostRuntime();
  const { instance } = await admitAndInstantiate({
    wasm: assembled.wasm,
    attestation,
    policy: { requireSigned: true, publicKeyPem: keypair.publicKeyPem },
    host,
  });
  assert.equal(typeof instance.exports.isLiteralVerificationSuccess, "function");
  return { instance, program };
}

async function interpret(program, resultTag) {
  const interpreted = await executeFlow(
    "isLiteralVerificationSuccess",
    new Map([["resultTag", { __tag: "int", value: resultTag }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("app-kernel package-owned literal verification success decision", () => {
  it("tracks the private TypeScript predicate as an exact governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/literal-verification-success.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(fungiSource, /\belse\s+if\b/u);
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function isLiteralVerificationSuccess\(\s*result: boolean \| "no-key",\s*\): result is true \{\s*return result === true;\s*\}/u,
    );
  });

  it("matches all source states and denies every sampled surplus physical tag", async () => {
    const compiled = await compileCandidate();
    for (const { source, tag, expected } of SOURCE_CASES) {
      assert.equal(sourceDecision(source), expected, `TypeScript ${String(source)}`);
      assert.deepEqual(
        await interpret(compiled.program, tag),
        { __tag: "bool", value: expected },
        `Fungi tag ${tag}`,
      );
      assert.equal(Boolean(compiled.instance.exports.isLiteralVerificationSuccess(tag)), expected);
    }
    for (const tag of SURPLUS_TAGS) {
      assert.deepEqual(
        await interpret(compiled.program, tag),
        { __tag: "bool", value: false },
        `surplus Fungi tag ${tag}`,
      );
      assert.equal(Boolean(compiled.instance.exports.isLiteralVerificationSuccess(tag)), false);
    }
  });
});
