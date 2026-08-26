import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  checkTypes,
  executeFlow,
  parseProgram,
  tensorDimensionCountsCompatible,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(
  PACKAGE_ROOT,
  "src",
  "self-hosted",
  "tensor-dimension-count-compatibility.fungi",
);
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze([Object.freeze([]), Object.freeze([]), true]),
  Object.freeze([Object.freeze([768]), Object.freeze([32]), true]),
  Object.freeze([Object.freeze(["dynamic", 768]), Object.freeze([32, 768]), true]),
  Object.freeze([Object.freeze([32, 32]), Object.freeze([64, 64]), true]),
  Object.freeze([Object.freeze([768]), Object.freeze(["dynamic", 768]), false]),
  Object.freeze([Object.freeze([32, 32]), Object.freeze([32]), false]),
]);

function rankTokens(dimensions) {
  return {
    __tag: "list",
    items: dimensions.map(() => ({ __tag: "int", value: 0 })),
  };
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi tensor rank decision");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "tensor-dimension-count-compatibility.fungi");
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
  return program;
}

async function interpret(program, expected, actual) {
  const interpreted = await executeFlow(
    "tensorDimensionCountsCompatibleFungi",
    new Map([
      ["expected", rankTokens(expected)],
      ["actual", rankTokens(actual)],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

function tensorCodes(expectedDimensions, actualDimensions) {
  const parsed = parseProgram(`
flow tensorRankProof(input: Tensor<Float32, [${actualDimensions}]>) -> String {
  let output: Tensor<Float32, [${expectedDimensions}]> = input
  return "done"
}
`, "tensor-rank-public-caller.fungi");
  return checkTypes(parsed.ast).diagnostics.map((diagnostic) => diagnostic.code);
}

describe("package-owned Fungi tensor dimension-count compatibility", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/tensor-dimension-count-compatibility.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);
  });

  it("matches the exported TypeScript decision across normalized rank tokens", async () => {
    const program = await compileCandidate();
    for (const [expected, actual, want] of VALUES) {
      assert.equal(tensorDimensionCountsCompatible(expected, actual), want);
      assert.deepEqual(
        await interpret(program, expected, actual),
        { __tag: "bool", value: want },
        `${JSON.stringify(expected)} versus ${JSON.stringify(actual)}`,
      );
    }
  });

  it("keeps the real FUNGI-TYPE-016 caller aligned", () => {
    assert.equal(tensorCodes("768", "Batch, 768").includes("FUNGI-TYPE-016"), true);
    assert.equal(tensorCodes("Batch, 768", "32, 768").includes("FUNGI-TYPE-016"), false);
  });
});
