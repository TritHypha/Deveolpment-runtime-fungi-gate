import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { verifyGenerator } from "../lib/generator-contract.mjs";

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function generatorFixture({
  writes = ["build/declared.json", "build/provenance.json"],
  outputs = ["build/declared.json", "build/provenance.json"],
  injectTimestamp = false,
  omitProvenance = false,
  preexistingHidden = false,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "generator-contract-"));
  const generator = "scripts/fake-generator.mjs";
  const effectiveWrites = omitProvenance
    ? writes.filter((path) => path !== "build/provenance.json")
    : writes;
  write(root, "input/source.txt", "stable input\n");
  write(
    root,
    generator,
    `import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
const root = process.cwd();
const writes = ${JSON.stringify(effectiveWrites)};
if (process.argv.includes("--check")) process.exit(0);
for (const relativePath of writes) {
  mkdirSync(dirname(join(root, relativePath)), { recursive: true });
  const value = relativePath.endsWith("provenance.json")
    ? { generator: "fake-generator", inputs: ["input/source.txt"], builtAt: "volatile" }
    : { value: "stable"${injectTimestamp ? ", nonce: randomUUID()" : ""} };
  writeFileSync(join(root, relativePath), JSON.stringify(value, null, 2) + "\\n");
}
`,
  );
  write(
    root,
    "governance/tooling-policy.json",
    JSON.stringify({
      schemaVersion: 1,
      packageNoTest: {},
      toolExceptions: {},
      generators: {
        [generator]: {
          inputs: ["input/source.txt"],
          outputs,
          tracked: true,
          generate: ["node", generator],
          check: ["node", generator, "--check"],
          provenance: "required",
          tier: "phase-close",
        },
      },
    }, null, 2),
  );
  if (preexistingHidden) {
    write(
      root,
      "build/hidden.json",
      JSON.stringify({ value: "stable" }, null, 2) + "\n",
    );
  }
  return { root, generator };
}

test("an undeclared generated write is refused", async () => {
  const { root, generator } = generatorFixture({
    outputs: ["build/declared.json", "build/provenance.json"],
    writes: [
      "build/declared.json",
      "build/provenance.json",
      "build/hidden.json",
    ],
  });
  try {
    const result = await verifyGenerator(root, generator);
    assert.deepEqual(result.unexpectedWrites, ["build/hidden.json"]);
    assert.equal(result.ok, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an undeclared same-byte rewrite is still refused", async () => {
  const { root, generator } = generatorFixture({
    outputs: ["build/declared.json", "build/provenance.json"],
    writes: [
      "build/declared.json",
      "build/provenance.json",
      "build/hidden.json",
    ],
    preexistingHidden: true,
  });
  try {
    const result = await verifyGenerator(root, generator);
    assert.equal(result.ok, false);
    assert.equal(result.code, "GENERATOR-UNDECLARED-WRITE");
    assert.deepEqual(result.unexpectedWrites, ["build/hidden.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a second generation must be semantically idempotent", async () => {
  const { root, generator } = generatorFixture({ injectTimestamp: true });
  try {
    const result = await verifyGenerator(root, generator);
    assert.equal(result.ok, false);
    assert.equal(result.code, "GENERATOR-NONDETERMINISTIC");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tracked output without required provenance refuses", async () => {
  const { root, generator } = generatorFixture({ omitProvenance: true });
  try {
    const result = await verifyGenerator(root, generator);
    assert.equal(result.ok, false);
    assert.equal(result.code, "GENERATOR-PROVENANCE-MISSING");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("declared deterministic writes with provenance pass", async () => {
  const { root, generator } = generatorFixture();
  try {
    const result = await verifyGenerator(root, generator);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.code, "GENERATOR-CONTRACT-PASS");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
