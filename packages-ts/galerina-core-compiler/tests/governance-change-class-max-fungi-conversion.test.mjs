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
const CLASSES = Object.freeze(["neutral", "tightening", "expansion", "experimental"]);
const HOSTILE = Object.freeze(["", "unknown", "Experimental", " expansion ", "__proto__"]);
const RANK = Object.freeze({ neutral: 0, tightening: 1, expansion: 2, experimental: 3 });

function normalizeChangeClass(value) {
  return Object.hasOwn(RANK, value) ? value : "experimental";
}

function expectedMaximum(left, right) {
  const normalizedLeft = normalizeChangeClass(left);
  const normalizedRight = normalizeChangeClass(right);
  return RANK[normalizedLeft] >= RANK[normalizedRight]
    ? normalizedLeft
    : normalizedRight;
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned governance Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "governance-qualifier-escalation.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact governance Fungi asset must parse and type-check without errors",
  );
  for (const name of ["normalizeChangeClass", "changeClassRank", "maxChangeClass"]) {
    assert.ok(program.flows.some((flow) => flow.name === name), `missing Fungi flow ${name}`);
  }
  const effects = checkEffects(program.flows, program.ast);
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(gir, undefined, "governance-change-class-max", program.ast, true),
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
  assert.equal(typeof instance.exports.maxChangeClass, "function");
  return { host, instance, program };
}

async function interpret(compiled, left, right) {
  const interpreted = await executeFlow(
    "maxChangeClass",
    new Map([
      ["left", { __tag: "string", value: left }],
      ["right", { __tag: "string", value: right }],
    ]),
    compiled.program.ast,
    compiled.program.flows,
  );
  return interpreted.value;
}

function executeWasm(compiled, left, right) {
  const handle = compiled.instance.exports.maxChangeClass(
    compiled.host.internString(left),
    compiled.host.internString(right),
  );
  return compiled.host.readString(handle);
}

describe("compiler package-owned Fungi governance change-class maximum", () => {
  it("binds the exact private source order and package-owned asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/governance-qualifier-escalation.fungi",
      ),
    );
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    const executableFungi = fungiSource.replace(/^\s*\/\/\/.*$/gmu, "");
    assert.doesNotMatch(
      executableFungi,
      /\b(?:null|NaN|else|throw|try|catch|for|while|loop)\b/u,
      "the bounded Fungi asset must not contain forbidden control or value forms",
    );
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /const CLASS_RANK: Record<ChangeClass, number> = \{\s*neutral: 0, tightening: 1, expansion: 2, experimental: 3,\s*\};/u,
    );
    assert.match(
      reference,
      /function maxClass\(a: ChangeClass, b: ChangeClass\): ChangeClass \{\s*return CLASS_RANK\[a\] >= CLASS_RANK\[b\] \? a : b;\s*\}/u,
    );
  });

  it("preserves all typed pairs and closes hostile Strings to experimental", async () => {
    const compiled = await compileCandidate();
    for (const left of [...CLASSES, ...HOSTILE]) {
      for (const right of [...CLASSES, ...HOSTILE]) {
        const wanted = expectedMaximum(left, right);
        assert.deepEqual(
          await interpret(compiled, left, right),
          { __tag: "string", value: wanted },
          `Fungi ${JSON.stringify(left)} x ${JSON.stringify(right)}`,
        );
        assert.equal(
          executeWasm(compiled, left, right),
          wanted,
          `Wasm ${JSON.stringify(left)} x ${JSON.stringify(right)}`,
        );
      }
    }
  });
});
