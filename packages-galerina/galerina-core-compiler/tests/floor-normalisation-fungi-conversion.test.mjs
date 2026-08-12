import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
  verifyGovernance,
} from "../dist/index.js";
import { normaliseFloor } from "../dist/capability-types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "floor-normalisation.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze(["execution", "floor_1"]),
  Object.freeze(["containment", "floor_2"]),
  Object.freeze(["proof", "floor_3"]),
  Object.freeze(["proof_zone", "floor_3"]),
  Object.freeze(["attestation", "floor_4"]),
  Object.freeze(["floor_1", "floor_1"]),
  Object.freeze(["floor_4", "floor_4"]),
  Object.freeze(["constructor", "constructor"]),
  Object.freeze(["toString", "toString"]),
  Object.freeze(["valueOf", "valueOf"]),
  Object.freeze(["hasOwnProperty", "hasOwnProperty"]),
  Object.freeze(["__proto__", "__proto__"]),
  Object.freeze(["Execution", "Execution"]),
  Object.freeze([" execution ", " execution "]),
  Object.freeze(["execution\u0000", "execution\u0000"]),
  Object.freeze(["e\u0301", "e\u0301"]),
  Object.freeze(["\u00e9", "\u00e9"]),
  Object.freeze(["", ""]),
]);
const ALIASES = Object.freeze(VALUES.slice(0, 5));

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi floor normalizer");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "floor-normalisation.fungi");
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

async function interpret(program, name) {
  const interpreted = await executeFlow(
    "normaliseFloor",
    new Map([["name", { __tag: "string", value: name }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

function verifyAlias(alias, expected) {
  const program = parseProgram(
    `@version 1\n\n` +
    `governed ${alias} flow probe(value: Int) -> Int\n` +
    `contract { intent { "Verify canonical floor obligation." } }\n` +
    `{ return value }\n`,
    `floor-${alias}.fungi`,
  );
  assert.deepEqual(
    (program.diagnostics ?? []).filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  const effects = checkEffects(program.flows, program.ast);
  const governance = verifyGovernance(program.ast, program.flows, effects, "production");
  assert.deepEqual(
    governance.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
    [],
  );
  assert.ok(governance.proofObligations.includes(`dag_check:probe:${expected}:bit8`));
}

describe("compiler package-owned Fungi floor normalization", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/floor-normalisation.fungi",
      ),
    );
    assert.ok(existsSync(SOURCE));
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.match(source, /\bmatch\s+name\b/u);
    assert.match(source, /_\s*=>/u);
  });

  it("matches the repaired own-entry floor table", async () => {
    const program = await compileCandidate();
    for (const [name, expected] of VALUES) {
      assert.equal(normaliseFloor(name), expected, `TypeScript ${JSON.stringify(name)}`);
      assert.deepEqual(
        await interpret(program, name),
        { __tag: "string", value: expected },
        `Fungi ${JSON.stringify(name)}`,
      );
    }
  });

  it("preserves the public governance-verifier obligation for every alias", () => {
    for (const [alias, expected] of ALIASES) verifyAlias(alias, expected);
  });
});
