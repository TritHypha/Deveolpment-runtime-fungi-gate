import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
  stricterResidency,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "residency-strictness.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const TIERS = Object.freeze([
  "register_only",
  "no_dram_spill",
  "no_swap",
  "no_disk",
  "unrestricted",
]);
const HOSTILE_PAIRS = Object.freeze([
  Object.freeze(["", "no_swap"]),
  Object.freeze(["no_swap", ""]),
  Object.freeze(["No_Swap", "no_swap"]),
  Object.freeze(["no_swap", "NO_SWAP"]),
  Object.freeze([" no_swap", "no_swap"]),
  Object.freeze(["no_swap", "no_swap "]),
  Object.freeze(["no_swap\u0000tail", "no_disk"]),
  Object.freeze(["no_disk", "no_swap\u0000tail"]),
  Object.freeze(["constructor", "unrestricted"]),
  Object.freeze(["unrestricted", "__proto__"]),
  Object.freeze(["n\u00f8_swap", "no_swap"]),
  Object.freeze(["no_swap", "n\u00f8_swap"]),
  Object.freeze(["unknown", "unknown"]),
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

async function interpret(program, left, right) {
  const interpreted = await executeFlow(
    "stricterResidencyFungi",
    new Map([
      ["left", { __tag: "string", value: left }],
      ["right", { __tag: "string", value: right }],
    ]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("package-owned Fungi residency tighten combinator", () => {
  it("matches the complete typed lattice and fails closed for hostile Strings", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/residency-strictness.fungi"),
      "the compiler package must own the Fungi residency lattice module",
    );
    assert.ok(existsSync(SOURCE), "the governed Fungi residency lattice source must exist");
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);

    const program = compileCandidate();
    for (const left of TIERS) {
      for (const right of TIERS) {
        const expected = stricterResidency(left, right);
        assert.deepEqual(
          await interpret(program, left, right),
          { __tag: "string", value: expected },
          `Fungi stricterResidency(${JSON.stringify(left)}, ${JSON.stringify(right)})`,
        );
      }
    }
    for (const [left, right] of HOSTILE_PAIRS) {
      assert.deepEqual(
        await interpret(program, left, right),
        { __tag: "string", value: "register_only" },
        `hostile boundary ${JSON.stringify(left)}, ${JSON.stringify(right)}`,
      );
    }
  });
});
