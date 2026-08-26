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
import { validatePluginInput } from "../dist/plugin-schema.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(
  PACKAGE_ROOT,
  "src",
  "self-hosted",
  "plugin-type-compatibility.fungi",
);
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "plugin-schema.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const CANONICAL_TYPES = Object.freeze([
  "Int",
  "String",
  "Bool",
  "Float",
  "Bytes",
  "Array<Int>",
  "Array<String>",
]);
const REPRESENTATIVE_VALUES = Object.freeze({
  Int: 7,
  String: "text",
  Bool: true,
  Float: 1.5,
  Bytes: Uint8Array.from([1, 2, 3]),
  "Array<Int>": Object.freeze([1, 2]),
  "Array<String>": Object.freeze(["a", "b"]),
});
const HOSTILE_PAIRS = Object.freeze([
  Object.freeze(["", ""]),
  Object.freeze(["int", "Float"]),
  Object.freeze(["Int", "float"]),
  Object.freeze(["unknown", "Float"]),
  Object.freeze(["Int\u0000", "Float"]),
  Object.freeze(["Int", "Float\u0000"]),
  Object.freeze(["Int", "Int"]),
]);

function expectedCompatibility(actual, expected) {
  return actual === "Int" && expected === "Float";
}

function acceptedByTypeScriptBorder(actual, expected) {
  const value = REPRESENTATIVE_VALUES[actual];
  assert.notEqual(value, undefined, `missing representative for ${actual}`);
  const violations = validatePluginInput(
    { value },
    {
      version: "1.0",
      inputs: [{ name: "value", type: expected, required: true }],
      outputs: [],
      strict: true,
    },
    "compatibility-reference",
  );
  return !violations.some((violation) => violation.code === "FUNGI-BORDER-002");
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned plugin compatibility Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "plugin-type-compatibility.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
    "the exact plugin compatibility Fungi asset must parse and type-check without errors",
  );
  const effects = checkEffects(program.flows, program.ast);
  const { gir } = emitGIR(program.ast, program.flows, effects);
  const wat = renderWAT(
    buildWATModuleFromGIR(
      gir,
      undefined,
      "plugin-type-compatibility",
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
  assert.equal(typeof instance.exports.isCompatibleType, "function");
  return { host, instance, program };
}

async function executeCandidate(program, actual, expected) {
  const interpreted = await executeFlow(
    "isCompatibleType",
    new Map([
      ["actual", { __tag: "string", value: actual }],
      ["expected", { __tag: "string", value: expected }],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

function executeWasmCandidate(compiled, actual, expected) {
  return Boolean(compiled.instance.exports.isCompatibleType(
    compiled.host.internString(actual),
    compiled.host.internString(expected),
  ));
}

describe("compiler package-owned Fungi plugin type compatibility", () => {
  it("tracks the private source decision as an exact governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/plugin-type-compatibility.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function isCompatibleType\(actual: string, expected: string\): boolean \{\s*\/\/ Int is compatible with Float\s*if \(actual === "Int" && expected === "Float"\) return true;\s*return false;\s*\}/u,
    );
  });

  it("matches the complete canonical matrix and hostile String negatives", async () => {
    const compiled = await compileCandidate();
    for (const actual of CANONICAL_TYPES) {
      for (const expected of CANONICAL_TYPES) {
        const wanted = expectedCompatibility(actual, expected);
        if (actual !== expected) {
          assert.equal(
            acceptedByTypeScriptBorder(actual, expected),
            wanted,
            `TypeScript border compatibility ${actual} -> ${expected}`,
          );
        }
        assert.deepEqual(
          await executeCandidate(compiled.program, actual, expected),
          { __tag: "bool", value: wanted },
          `Fungi compatibility ${actual} -> ${expected}`,
        );
        assert.equal(
          executeWasmCandidate(compiled, actual, expected),
          wanted,
          `Fungi WAT compatibility ${actual} -> ${expected}`,
        );
      }
    }
    for (const [actual, expected] of HOSTILE_PAIRS) {
      assert.deepEqual(
        await executeCandidate(compiled.program, actual, expected),
        { __tag: "bool", value: false },
        `hostile compatibility ${JSON.stringify(actual)} -> ${JSON.stringify(expected)}`,
      );
      assert.equal(
        executeWasmCandidate(compiled, actual, expected),
        false,
        `hostile WAT compatibility ${JSON.stringify(actual)} -> ${JSON.stringify(expected)}`,
      );
    }
  });
});
