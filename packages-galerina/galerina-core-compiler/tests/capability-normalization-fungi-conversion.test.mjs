import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
} from "../dist/index.js";
import {
  ADMISSION_CAPABILITIES,
  isAdmissibleCapability,
  normalizeCapability,
} from "../dist/capability-types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "capability-normalization.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VALUES = Object.freeze([
  Object.freeze(["db.read", "database.read"]),
  Object.freeze(["db.write", "database.write"]),
  Object.freeze(["filesystem.read", "storage.read"]),
  Object.freeze(["filesystem.write", "storage.write"]),
  Object.freeze(["time.read", "clock.read"]),
  Object.freeze(["database.read", "database.read"]),
  Object.freeze(["clock.read", "clock.read"]),
  Object.freeze(["constructor", "constructor"]),
  Object.freeze(["toString", "toString"]),
  Object.freeze(["valueOf", "valueOf"]),
  Object.freeze(["hasOwnProperty", "hasOwnProperty"]),
  Object.freeze(["__proto__", "__proto__"]),
  Object.freeze(["DB.READ", "DB.READ"]),
  Object.freeze([" db.read ", " db.read "]),
  Object.freeze(["db.read\u0000", "db.read\u0000"]),
  Object.freeze(["e\u0301", "e\u0301"]),
  Object.freeze(["\u00e9", "\u00e9"]),
  Object.freeze(["", ""]),
]);

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "compiler must own the Fungi capability normalizer");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "capability-normalization.fungi");
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
    "normalizeCapability",
    new Map([["name", { __tag: "string", value: name }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("compiler package-owned Fungi capability normalization", () => {
  it("requires a governed asset with the project control-flow restrictions", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/capability-normalization.fungi",
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

  it("matches the repaired own-entry alias table and public admission caller", async () => {
    const program = await compileCandidate();
    for (const [name, expected] of VALUES) {
      assert.equal(normalizeCapability(name), expected, `TypeScript ${JSON.stringify(name)}`);
      assert.deepEqual(
        await interpret(program, name),
        { __tag: "string", value: expected },
        `Fungi ${JSON.stringify(name)}`,
      );
      assert.equal(
        isAdmissibleCapability(name),
        ADMISSION_CAPABILITIES.has(expected),
        `public caller ${JSON.stringify(name)}`,
      );
    }
  });
});
