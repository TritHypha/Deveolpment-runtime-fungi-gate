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
  tensorElementTypesCompatible,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "tensor-element-type-compatibility.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze(["Float32", "Float32"]),
  Object.freeze([" Float32 ", "Float32"]),
  Object.freeze(["\tInt8\n", "Int8"]),
  Object.freeze(["\u00a0Float16\u00a0", "Float16"]),
  Object.freeze(["", "   "]),
  Object.freeze(["Float32", "float32"]),
  Object.freeze(["Float64", "Float32"]),
  Object.freeze(["e\u0301", "\u00e9"]),
  Object.freeze(["constructor", "constructor"]),
  Object.freeze(["plain\u0000tail", "plain\u0000tail"]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi tensor element-type decision");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "tensor-element-type-compatibility.fungi");
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

async function interpret(program, expected, actual) {
  const interpreted = await executeFlow(
    "tensorElementTypesCompatibleFungi",
    new Map([
      ["expected", { __tag: "string", value: expected }],
      ["actual", { __tag: "string", value: actual }],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

function tensorCodes(expected, actual) {
  const parsed = parseProgram(`
flow tensorProof(input: Tensor<${actual}, [8]>) -> String {
  let output: Tensor<${expected}, [8]> = input
  return "done"
}
`, "tensor-element-public-caller.fungi");
  return checkTypes(parsed.ast).diagnostics.map((diagnostic) => diagnostic.code);
}

describe("package-owned Fungi tensor element-type compatibility", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/tensor-element-type-compatibility.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);
  });

  it("matches the exported TypeScript decision across hostile Strings", async () => {
    const program = await compileCandidate();
    for (const [expected, actual] of VALUES) {
      const reference = tensorElementTypesCompatible(expected, actual);
      assert.deepEqual(
        await interpret(program, expected, actual),
        { __tag: "bool", value: reference },
        `${JSON.stringify(expected)} versus ${JSON.stringify(actual)}`,
      );
    }
  });

  it("keeps the real FUNGI-TYPE-030 caller aligned", () => {
    assert.equal(tensorCodes("Float32", "Int8").includes("FUNGI-TYPE-030"), true);
    assert.equal(tensorCodes("Float32", "Float32").includes("FUNGI-TYPE-030"), false);
  });
});
