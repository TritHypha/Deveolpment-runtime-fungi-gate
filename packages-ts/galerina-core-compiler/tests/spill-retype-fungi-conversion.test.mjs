import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import {
  CompilerTrust,
  boundaryTrusted,
  checkEffects,
  combineTrust,
  executeFlow,
  parseProgram,
  spillRetype,
} from "../dist/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(HERE, "..");
const SOURCE = join(PACKAGE_ROOT, "src", "self-hosted", "hardening-trust-boundary.fungi");
const PACKAGE = join(PACKAGE_ROOT, "package.json");
const EXPECTED = Object.freeze({
  retypedTo: CompilerTrust.REFUTED,
  code: "FUNGI-HARDEN-007",
  reason: "The value provably spills past its residency ceiling, so its compile-time type-state is downgraded to `Refuted` (sticky + contagious, RD-0337) — it can no longer be released at a trust boundary, and anything derived from it inherits the refutation. This is the governed downgrade (RD-0358 §3-2), not a silent spill.",
});

function compileCandidate() {
  const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
  const program = parseProgram(source, "hardening-trust-boundary.fungi");
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

function unwrapRecord(value) {
  assert.equal(value.__tag, "record");
  assert.ok(value.fields instanceof Map);
  return Object.fromEntries(
    [...value.fields.entries()].map(([name, field]) => [name, field.value]),
  );
}

describe("compiler package-owned Fungi spill retype decision", () => {
  it("returns the exact contagious Deny downgrade record", async () => {
    const packageJson = JSON.parse(readFileSync(PACKAGE, "utf8"));
    assert.ok(
      packageJson.packageGraph.loadedAssets.includes(
        "src/self-hosted/hardening-trust-boundary.fungi",
      ),
      "the compiler package must own the Fungi hardening trust module",
    );
    assert.ok(existsSync(SOURCE), "the governed Fungi hardening trust source must exist");
    const source = readFileSync(SOURCE, "utf8").replace(/^\uFEFF/u, "");
    assert.doesNotMatch(source, /^\s*(?:for|while|loop)\b/mu);
    assert.doesNotMatch(source, /\b(?:null|NaN|throw|try|catch)\b/u);
    assert.doesNotMatch(source, /\belse\s+if\b/u);
    assert.doesNotMatch(source, /\belse\b/u);

    const reference = spillRetype();
    assert.deepEqual(reference, EXPECTED);
    assert.equal(boundaryTrusted(reference.retypedTo), false);
    assert.equal(
      combineTrust(CompilerTrust.PROVEN, reference.retypedTo),
      CompilerTrust.REFUTED,
    );

    const program = compileCandidate();
    const interpreted = await executeFlow(
      "spillRetypeFungi",
      new Map(),
      program.ast,
      program.flows,
    );
    assert.deepEqual(unwrapRecord(interpreted.value), EXPECTED);
  });
});
