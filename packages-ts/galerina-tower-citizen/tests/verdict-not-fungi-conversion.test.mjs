import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
} from "../../galerina-core-compiler/dist/index.js";
import { Verdict, vNot } from "../dist/index.js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "verdict-not.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "three-valued-governance.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const K3_NOT = Object.freeze([
  Object.freeze([Verdict.DENY, Verdict.ALLOW]),
  Object.freeze([Verdict.INDETERMINATE, Verdict.INDETERMINATE]),
  Object.freeze([Verdict.ALLOW, Verdict.DENY]),
]);

function readUtf8(path) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/u, "");
}

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "Tower-Citizen must own the Fungi vNot decision");
  const source = readUtf8(SOURCE);
  const program = parseProgram(source, "verdict-not.fungi");
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const effects = checkEffects(program.flows, program.ast);
  assert.deepEqual(
    effects.flatMap((result) => result.diagnostics)
      .filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  return program;
}

async function interpret(program, candidateVerdict) {
  const interpreted = await executeFlow(
    "vNotVerdict",
    new Map([["candidateVerdict", { __tag: "verdict", value: candidateVerdict }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("Tower-Citizen package-owned Fungi vNot decision", () => {
  it("requires one governed typed asset bound to the exact exported helper chain", () => {
    assert.ok(existsSync(SOURCE), "missing governed Fungi asset: verdict-not.fungi");
    const packageJson = JSON.parse(readUtf8(PACKAGE));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/verdict-not.fungi"),
    );

    const source = readUtf8(SOURCE);
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.match(source, /check\s*\(candidateVerdict\)/u);
    for (const arm of ["deny", "ambig", "if"]) {
      assert.match(source, new RegExp(`\\b${arm}:`, "u"));
    }

    const reference = readUtf8(REFERENCE_SOURCE);
    assert.match(
      reference,
      /export function vNot\(a: Verdict\): Verdict \{\s*return asVerdict\(negTrit\(a\)\);\s*\}/u,
    );
  });

  it("matches the complete independent K3 NOT table as typed Verdict values", async () => {
    const program = compileCandidate();
    for (const [candidateVerdict, expected] of K3_NOT) {
      assert.equal(vNot(candidateVerdict), expected, `TypeScript vNot(${candidateVerdict})`);
      assert.deepEqual(
        await interpret(program, candidateVerdict),
        { __tag: "verdict", value: expected },
        `Fungi vNotVerdict(${candidateVerdict})`,
      );
    }
  });
});
