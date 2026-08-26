import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  atLeastAsStrict,
  checkEffects,
  executeFlow,
  parseProgram,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "residency-strictness.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const CANONICAL_PAIRS = Object.freeze([
  Object.freeze(["register_only", "register_only", true]),
  Object.freeze(["register_only", "no_dram_spill", true]),
  Object.freeze(["register_only", "no_swap", true]),
  Object.freeze(["register_only", "no_disk", true]),
  Object.freeze(["register_only", "unrestricted", true]),
  Object.freeze(["no_dram_spill", "register_only", false]),
  Object.freeze(["no_dram_spill", "no_dram_spill", true]),
  Object.freeze(["no_dram_spill", "no_swap", true]),
  Object.freeze(["no_dram_spill", "no_disk", true]),
  Object.freeze(["no_dram_spill", "unrestricted", true]),
  Object.freeze(["no_swap", "register_only", false]),
  Object.freeze(["no_swap", "no_dram_spill", false]),
  Object.freeze(["no_swap", "no_swap", true]),
  Object.freeze(["no_swap", "no_disk", true]),
  Object.freeze(["no_swap", "unrestricted", true]),
  Object.freeze(["no_disk", "register_only", false]),
  Object.freeze(["no_disk", "no_dram_spill", false]),
  Object.freeze(["no_disk", "no_swap", false]),
  Object.freeze(["no_disk", "no_disk", true]),
  Object.freeze(["no_disk", "unrestricted", true]),
  Object.freeze(["unrestricted", "register_only", false]),
  Object.freeze(["unrestricted", "no_dram_spill", false]),
  Object.freeze(["unrestricted", "no_swap", false]),
  Object.freeze(["unrestricted", "no_disk", false]),
  Object.freeze(["unrestricted", "unrestricted", true]),
]);
const HOSTILE_PAIRS = Object.freeze([
  Object.freeze(["", "no_swap", false]),
  Object.freeze(["no_swap", "", false]),
  Object.freeze(["No_Swap", "no_swap", false]),
  Object.freeze(["no_swap", "NO_SWAP", false]),
  Object.freeze([" no_swap", "no_swap", false]),
  Object.freeze(["no_swap", "no_swap ", false]),
  Object.freeze(["no_swap\u0000tail", "no_disk", false]),
  Object.freeze(["no_disk", "no_swap\u0000tail", false]),
  Object.freeze(["constructor", "unrestricted", false]),
  Object.freeze(["unrestricted", "__proto__", false]),
  Object.freeze(["n\u00f8_swap", "no_swap", false]),
  Object.freeze(["no_swap", "n\u00f8_swap", false]),
  Object.freeze(["unknown", "unknown", false]),
]);

function compileCandidate() {
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "residency-strictness.fungi");
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

async function interpret(program, tier, floor) {
  const interpreted = await executeFlow(
    "atLeastAsStrictFungi",
    new Map([
      ["tier", { __tag: "string", value: tier }],
      ["floor", { __tag: "string", value: floor }],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("package-owned Fungi residency strictness", () => {
  it("matches the complete TypeScript lattice and fails closed for hostile Strings", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/residency-strictness.fungi"),
      "the compiler package must own the Fungi residency strictness decision",
    );
    assert.ok(existsSync(SOURCE), "the governed Fungi residency strictness source must exist");
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);

    const program = compileCandidate();
    for (const [tier, floor, expected] of [...CANONICAL_PAIRS, ...HOSTILE_PAIRS]) {
      assert.equal(
        atLeastAsStrict(tier, floor),
        expected,
        `TypeScript ${JSON.stringify(tier)} <= ${JSON.stringify(floor)}`,
      );
      assert.deepEqual(
        await interpret(program, tier, floor),
        { __tag: "bool", value: expected },
        `Fungi ${JSON.stringify(tier)} <= ${JSON.stringify(floor)}`,
      );
    }
  });
});
