import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { it } from "node:test";

import {
  checkEffects,
  executeFlow,
  parseProgram,
  sharesGovernanceShape,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "proof-governance-shape.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const VECTORS = Object.freeze([
  Object.freeze(["a".repeat(64), "a".repeat(64)]),
  Object.freeze(["a".repeat(64), "b".repeat(64)]),
  Object.freeze(["", ""]),
  Object.freeze(["", "0"]),
  Object.freeze(["ABC", "abc"]),
  Object.freeze(["hash", "hash "]),
  Object.freeze([" hash", "hash"]),
  Object.freeze(["__proto__", "__proto__"]),
  Object.freeze(["constructor", "prototype"]),
  Object.freeze(["caf\u00e9", "cafe\u0301"]),
  Object.freeze(["caf\u00e9", "caf\u00e9"]),
  Object.freeze(["hash\u0000tail", "hash\u0000tail"]),
  Object.freeze(["hash\u0000tail", "hash"]),
  Object.freeze(["\ud7ff", "\ud7ff"]),
]);

function compileCandidate() {
  assert.ok(existsSync(SOURCE), "the package-owned governance-shape Fungi asset must exist");
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "proof-governance-shape.fungi");
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
  return { program, source };
}

it("preserves exact ProofGraph signature-hash equality without granting authority", async () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
  assert.ok(
    packageJson.packageGraph.loadedAssets.includes(
      "src/self-hosted/proof-governance-shape.fungi",
    ),
    "the compiler package must own the governance-shape Fungi decision",
  );

  const { program, source } = compileCandidate();
  assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
  assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
  assert.doesNotMatch(source, /\belse\s+if\b/u);
  assert.doesNotMatch(source, /\belse\b/u);

  for (const [left, right] of VECTORS) {
    const expected = sharesGovernanceShape(
      { signatureHash: left },
      { signatureHash: right },
    );
    const interpreted = await executeFlow(
      "sharesGovernanceShapeFungi",
      new Map([
        ["leftSignatureHash", { __tag: "string", value: left }],
        ["rightSignatureHash", { __tag: "string", value: right }],
      ]),
      program.ast,
      program.flows,
    );
    assert.deepEqual(
      interpreted.value,
      { __tag: "bool", value: expected },
      `${JSON.stringify(left)} === ${JSON.stringify(right)}`,
    );
  }
});
