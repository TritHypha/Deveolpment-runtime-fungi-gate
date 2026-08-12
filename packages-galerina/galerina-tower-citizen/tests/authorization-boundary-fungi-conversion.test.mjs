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
import { authorize, Verdict } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "authorization-boundary.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "three-valued-governance.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze([Verdict.DENY, false]),
  Object.freeze([Verdict.INDETERMINATE, false]),
  Object.freeze([Verdict.ALLOW, true]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "Tower-Citizen must own the Fungi authorization boundary");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "authorization-boundary.fungi");
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
    "authorizeVerdict",
    new Map([["candidateVerdict", { __tag: "verdict", value: candidateVerdict }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("Tower-Citizen package-owned Fungi authorization boundary", () => {
  it("tracks the exported TypeScript decision as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/authorization-boundary.fungi"),
    );
    assert.ok(existsSync(SOURCE));
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(fungiSource, /\belse\s+if\b/u);
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /export function authorize\(v: Verdict\): boolean \{\s*return v === Verdict\.ALLOW;\s*\}/u,
    );
  });

  it("matches the complete K3 authorization table and keeps non-Allow closed", async () => {
    const program = await compileCandidate();
    for (const [candidateVerdict, expected] of VALUES) {
      assert.equal(authorize(candidateVerdict), expected, `TypeScript ${candidateVerdict}`);
      assert.deepEqual(
        await interpret(program, candidateVerdict),
        { __tag: "bool", value: expected },
        `Fungi ${candidateVerdict}`,
      );
    }
  });
});
