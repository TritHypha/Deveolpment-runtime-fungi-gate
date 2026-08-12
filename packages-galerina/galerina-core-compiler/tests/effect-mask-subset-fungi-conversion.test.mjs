import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

import {
  checkEffects,
  EffectFlags,
  effectsSubset,
  executeFlow,
  parseProgram,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "effect-mask-subset.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const ASSET = "src/self-hosted/effect-mask-subset.fungi";
const VECTORS = Object.freeze([
  Object.freeze([EffectFlags.None, EffectFlags.None]),
  Object.freeze([EffectFlags.None, EffectFlags.DatabaseWrite]),
  Object.freeze([EffectFlags.DatabaseWrite, EffectFlags.DatabaseWrite]),
  Object.freeze([
    EffectFlags.DatabaseWrite,
    EffectFlags.DatabaseWrite | EffectFlags.AuditWrite,
  ]),
  Object.freeze([EffectFlags.DatabaseWrite, EffectFlags.AuditWrite]),
  Object.freeze([
    EffectFlags.DatabaseWrite | EffectFlags.AuditWrite,
    EffectFlags.DatabaseWrite,
  ]),
  Object.freeze([EffectFlags.UnmappedEffect, EffectFlags.AuditWrite]),
  Object.freeze([EffectFlags.UnmappedEffect, EffectFlags.UnmappedEffect]),
  Object.freeze([
    EffectFlags.UnmappedEffect,
    EffectFlags.UnmappedEffect | EffectFlags.DatabaseRead,
  ]),
  Object.freeze([-1, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([-2147483648, -2147483648]),
  Object.freeze([2147483647, EffectFlags.UnmappedEffect]),
  Object.freeze([EffectFlags.UnmappedEffect, 2147483647]),
]);

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned effect-mask subset Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "effect-mask-subset.fungi");
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

it("preserves fail-closed signed effect-mask subset semantics", async () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
  assert.ok(packageJson.packageGraph.loadedAssets.includes(ASSET));

  const { program, source } = compileCandidate();
  assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
  assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
  assert.doesNotMatch(source, /\belse\s+if\b/u);
  assert.doesNotMatch(source, /\belse\b/u);

  for (const [required, declared] of VECTORS) {
    const expected = effectsSubset(required, declared);
    const interpreted = await executeFlow(
      "effectsSubsetFungi",
      new Map([
        ["required", { __tag: "int", value: required }],
        ["declared", { __tag: "int", value: declared }],
      ]),
      program.ast,
      program.flows,
    );
    assert.deepEqual(interpreted.value, { __tag: "bool", value: expected });
  }
});
