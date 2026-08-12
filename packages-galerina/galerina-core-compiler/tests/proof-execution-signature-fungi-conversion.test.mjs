import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

import {
  checkEffects,
  computeExecutionSignature,
  executeFlow,
  parseProgram,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "proof-execution-signature.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const ASSET = "src/self-hosted/proof-execution-signature.fungi";
const VECTORS = Object.freeze([
  Object.freeze([0, 0, 0, 0, 0, 0, 0, false]),
  Object.freeze([1, 2, 4, 8, 16, 3, 5, true]),
  Object.freeze([-1, -2, -4, -8, -16, -3, -5, false]),
  Object.freeze([2147483647, -2147483648, 65535, 255, 1024, 4096, 8192, true]),
]);

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned execution-signature Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "proof-execution-signature.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.deepEqual(
    checkEffects(program.flows, program.ast)
      .flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  return { program, source };
}

function unwrapRecord(value) {
  assert.equal(value.__tag, "record");
  assert.ok(value.fields instanceof Map);
  return Object.fromEntries(
    [...value.fields.entries()].map(([name, field]) => [name, field.value]),
  );
}

it("preserves every ExecutionSignature fact without granting authority", async () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
  assert.ok(packageJson.packageGraph.loadedAssets.includes(ASSET));

  const { program, source } = compileCandidate();
  assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
  assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
  assert.doesNotMatch(source, /\belse\s+if\b/u);
  assert.doesNotMatch(source, /\belse\b/u);

  for (const vector of VECTORS) {
    const expected = computeExecutionSignature(...vector);
    const interpreted = await executeFlow(
      "computeExecutionSignatureFungi",
      new Map([
        ["effectMask", { __tag: "int", value: vector[0] }],
        ["governanceMask", { __tag: "int", value: vector[1] }],
        ["inputVsFlags", { __tag: "int", value: vector[2] }],
        ["outputVsFlags", { __tag: "int", value: vector[3] }],
        ["nodeFlagsMask", { __tag: "int", value: vector[4] }],
        ["effectCount", { __tag: "int", value: vector[5] }],
        ["capabilityCallCount", { __tag: "int", value: vector[6] }],
        ["hasBoundaryCrossings", { __tag: "bool", value: vector[7] }],
      ]),
      program.ast,
      program.flows,
    );
    assert.deepEqual(unwrapRecord(interpreted.value), expected);
  }
});
