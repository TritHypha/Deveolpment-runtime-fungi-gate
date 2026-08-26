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
import { checkNaming } from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "generic-type-name.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "naming-checker.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const BASE_PROGRAM = parseProgram([
  "pure flow namedFlow(inputValue: String) -> Unit",
  "contract { effects {} }",
  "{ return Unit }",
].join("\n"), "generic-type-name-reference.fungi");
const VALUES = Object.freeze([
  "",
  "Any",
  "Object",
  "unknown",
  " Any ",
  "\tObject\r\n",
  "\u00a0unknown\u00a0",
  "\ufeffAny\ufeff",
  "\u2028Object\u2029",
  "\u200bAny\u200b",
  "\u180eunknown\u180e",
  "any",
  "OBJECT",
  "Unknown",
  "Any<String>",
  "Object?",
  "unknown\u0000",
  "Unit",
]);

function expected(value) {
  const trimmed = value.trim();
  return trimmed === "Any" || trimmed === "Object" || trimmed === "unknown";
}

function publicTypeScriptDecision(typeName) {
  assert.equal(BASE_PROGRAM.flows.length, 1);
  const baseFlow = BASE_PROGRAM.flows[0];
  assert.notEqual(baseFlow, undefined);
  const result = checkNaming(
    BASE_PROGRAM.ast,
    [{ ...baseFlow, params: [`inputValue: ${typeName}`] }],
    { fileName: "generic-type-name-reference.fungi" },
  );
  return result.findings.some((finding) => finding.code === "FUNGI-NAMING-003");
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the naming package must own the Fungi decision asset");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "generic-type-name.fungi");
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

async function interpret(program, typeName) {
  const interpreted = await executeFlow(
    "isGenericTypeName",
    new Map([["typeName", { __tag: "string", value: typeName }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("devtools naming package-owned Fungi generic type name", () => {
  it("tracks the private TypeScript decision as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/generic-type-name.fungi"),
    );
    assert.ok(existsSync(SOURCE));
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(fungiSource, /\belse\s+if\b/u);
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /const GENERIC_TYPE_NAMES = new Set\(\["Any", "Object", "unknown"\]\);/u,
    );
    assert.match(
      reference,
      /function isGenericTypeName\(typeStr: string\): boolean \{\s*const t = typeStr\.trim\(\);\s*return GENERIC_TYPE_NAMES\.has\(t\);\s*\}/u,
    );
  });

  it("matches the exact public TypeScript decision across canonical and hostile text", async () => {
    const program = await compileCandidate();
    for (const value of VALUES) {
      const wanted = expected(value);
      assert.equal(publicTypeScriptDecision(value), wanted, `TypeScript ${JSON.stringify(value)}`);
      assert.deepEqual(
        await interpret(program, value),
        { __tag: "bool", value: wanted },
        `Fungi ${JSON.stringify(value)}`,
      );
    }
  });
});
