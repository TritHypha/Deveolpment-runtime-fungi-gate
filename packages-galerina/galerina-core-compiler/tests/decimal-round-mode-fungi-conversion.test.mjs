import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { isRoundMode } from "../dist/decimal-arith.js";
import {
  checkEffects,
  executeFlow,
  parseProgram,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "decimal-round-mode.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze(["halfEven", true]),
  Object.freeze(["halfUp", true]),
  Object.freeze(["halfDown", true]),
  Object.freeze(["up", true]),
  Object.freeze(["down", true]),
  Object.freeze(["ceiling", true]),
  Object.freeze(["floor", true]),
  Object.freeze(["", false]),
  Object.freeze(["nearest", false]),
  Object.freeze(["HalfEven", false]),
  Object.freeze([" halfEven", false]),
  Object.freeze(["halfEven ", false]),
  Object.freeze(["halfEven\u0000tail", false]),
  Object.freeze(["constructor", false]),
  Object.freeze(["\u00bdEven", false]),
]);

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi decimal round-mode decision");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "decimal-round-mode.fungi");
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

async function interpret(program, mode) {
  const interpreted = await executeFlow(
    "isRoundModeFungi",
    new Map([["mode", { __tag: "string", value: mode }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("package-owned Fungi decimal round-mode membership", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/decimal-round-mode.fungi"),
    );
    assert.ok(existsSync(SOURCE));
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);
  });

  it("matches the exported TypeScript predicate without normalizing or defaulting", async () => {
    const program = compileCandidate();
    for (const [mode, expected] of VALUES) {
      assert.equal(isRoundMode(mode), expected, `TypeScript ${JSON.stringify(mode)}`);
      assert.deepEqual(
        await interpret(program, mode),
        { __tag: "bool", value: expected },
        `Fungi ${JSON.stringify(mode)}`,
      );
    }
  });
});
