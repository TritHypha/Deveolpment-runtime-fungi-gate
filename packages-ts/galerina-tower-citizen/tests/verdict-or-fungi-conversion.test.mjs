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
import { Verdict, vOr } from "../dist/index.js";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "verdict-or.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "three-valued-governance.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const K3_MAX = Object.freeze([
  Object.freeze([Verdict.DENY, Verdict.DENY, Verdict.DENY]),
  Object.freeze([Verdict.DENY, Verdict.INDETERMINATE, Verdict.INDETERMINATE]),
  Object.freeze([Verdict.DENY, Verdict.ALLOW, Verdict.ALLOW]),
  Object.freeze([Verdict.INDETERMINATE, Verdict.DENY, Verdict.INDETERMINATE]),
  Object.freeze([Verdict.INDETERMINATE, Verdict.INDETERMINATE, Verdict.INDETERMINATE]),
  Object.freeze([Verdict.INDETERMINATE, Verdict.ALLOW, Verdict.ALLOW]),
  Object.freeze([Verdict.ALLOW, Verdict.DENY, Verdict.ALLOW]),
  Object.freeze([Verdict.ALLOW, Verdict.INDETERMINATE, Verdict.ALLOW]),
  Object.freeze([Verdict.ALLOW, Verdict.ALLOW, Verdict.ALLOW]),
]);

function readUtf8(path) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/u, "");
}

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "Tower-Citizen must own the Fungi vOr decision");
  const source = readUtf8(SOURCE);
  const program = parseProgram(source, "verdict-or.fungi");
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

async function interpret(program, left, right) {
  const interpreted = await executeFlow(
    "vOrVerdict",
    new Map([
      ["left", { __tag: "verdict", value: left }],
      ["right", { __tag: "verdict", value: right }],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("Tower-Citizen package-owned Fungi vOr decision", () => {
  it("requires one governed typed asset bound to the exact exported helper chain", () => {
    assert.ok(existsSync(SOURCE), "missing governed Fungi asset: verdict-or.fungi");
    const packageJson = JSON.parse(readUtf8(PACKAGE));
    assert.ok(packageJson.packageGraph.loadedAssets.includes("src/self-hosted/verdict-or.fungi"));

    const source = readUtf8(SOURCE);
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.match(source, /check\s*\(left\)/u);
    assert.match(source, /check\s*\(right\)/u);

    const reference = readUtf8(REFERENCE_SOURCE);
    assert.match(
      reference,
      /export function vOr\(a: Verdict, b: Verdict\): Verdict \{[\s\S]*?return asVerdict\(maxTrit\(a, b\)\);\s*\}/u,
    );
  });

  it("matches the complete independent Verdict x Verdict K3 maximum table", async () => {
    const program = compileCandidate();
    for (const [left, right, expected] of K3_MAX) {
      assert.equal(vOr(left, right), expected, `TypeScript vOr(${left}, ${right})`);
      assert.deepEqual(
        await interpret(program, left, right),
        { __tag: "verdict", value: expected },
        `Fungi vOrVerdict(${left}, ${right})`,
      );
    }
  });
});
