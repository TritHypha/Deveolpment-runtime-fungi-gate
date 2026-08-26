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
import { collapse, Verdict } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "authorization-boundary.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "three-valued-governance.ts");
const VALUES = Object.freeze([
  Object.freeze([Verdict.DENY, "deny"]),
  Object.freeze([Verdict.INDETERMINATE, "deny"]),
  Object.freeze([Verdict.ALLOW, "allow"]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "Tower-Citizen must own the Fungi collapse boundary");
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
    "collapseVerdict",
    new Map([["candidateVerdict", { __tag: "verdict", value: candidateVerdict }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("Tower-Citizen package-owned Fungi collapse boundary", () => {
  it("retains the exact TypeScript trust-boundary table", () => {
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(fungiSource, /\belse\s+if\b/u);
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /export function collapse\(v: Verdict\): "allow" \| "deny" \{\s*return v === Verdict\.ALLOW \? "allow" : "deny";\s*\}/u,
    );
  });

  it("matches the complete K3 collapse table and keeps Unknown closed", async () => {
    const program = await compileCandidate();
    for (const [candidateVerdict, expected] of VALUES) {
      assert.equal(collapse(candidateVerdict), expected, `TypeScript ${candidateVerdict}`);
      assert.deepEqual(
        await interpret(program, candidateVerdict),
        { __tag: "string", value: expected },
        `Fungi ${candidateVerdict}`,
      );
    }
  });
});
