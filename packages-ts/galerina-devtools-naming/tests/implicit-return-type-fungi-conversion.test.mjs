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
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "implicit-return-type.fungi");
const REFERENCE_SOURCE = join(PACKAGE_ROOT, "src", "naming-checker.ts");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const BASE_PROGRAM = parseProgram([
  "pure flow namedFlow(inputValue: String) -> Unit",
  "contract { effects {} }",
  "{ return Unit }",
].join("\n"), "implicit-return-type-reference.fungi");
const VALUES = Object.freeze([
  "",
  "void",
  "Void",
  " void ",
  "\tVoid\r\n",
  "\u00a0void\u00a0",
  "\ufeffvoid\ufeff",
  "\u2028void\u2029",
  "\u200bvoid\u200b",
  "\u180evoid\u180e",
  "VOID",
  "Unit",
  "void\u0000",
  "e\u0301",
  "\u00e9",
]);

function expected(value) {
  const trimmed = value.trim();
  return trimmed === "" || trimmed === "void" || trimmed === "Void";
}

function publicTypeScriptDecision(returnType) {
  assert.equal(BASE_PROGRAM.flows.length, 1);
  const baseFlow = BASE_PROGRAM.flows[0];
  assert.notEqual(baseFlow, undefined);
  const result = checkNaming(
    BASE_PROGRAM.ast,
    [{ ...baseFlow, returnType }],
    { fileName: "implicit-return-type-reference.fungi" },
  );
  return result.findings.some((finding) => finding.code === "FUNGI-NAMING-002");
}

async function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the naming package must own the Fungi decision asset");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "implicit-return-type.fungi");
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

async function interpret(program, returnType) {
  const interpreted = await executeFlow(
    "isImplicitReturnType",
    new Map([["returnType", { __tag: "string", value: returnType }]]),
    program.ast,
    program.flows,
  );
  return interpreted.value;
}

describe("devtools naming package-owned Fungi implicit return type", () => {
  it("tracks the private TypeScript decision as a governed package asset", () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes("src/self-hosted/implicit-return-type.fungi"),
    );
    assert.ok(existsSync(SOURCE));
    const fungiSource = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(fungiSource, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(fungiSource, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(fungiSource, /\belse\s+if\b/u);
    const reference = readFileSync(REFERENCE_SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.match(
      reference,
      /function isImplicitReturnType\(returnType: string\): boolean \{\s*const rt = returnType\.trim\(\);\s*return rt === "" \|\| rt === "void" \|\| rt === "Void";\s*\}/u,
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
