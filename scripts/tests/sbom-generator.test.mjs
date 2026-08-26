// sbom-generator.test.mjs — proves deterministic selected-root SBOM output,
// required provenance, and non-mutating drift refusal.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/generate-sbom.mjs; scripts/lib/provenance.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/generate-sbom.mjs");

/**
 * Write one fixture file, creating its parent directories.
 *
 * @param {string} root fixture root
 * @param {string} relativePath fixture-relative path
 * @param {string} content exact content
 */
function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Create the smallest real npm product graph accepted by the SBOM collector.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "sbom-generator-"));
  write(
    root,
    "package.json",
    JSON.stringify({
      name: "@fixture/root",
      version: "1.0.0",
      license: "Apache-2.0",
    }, null, 2),
  );
  write(
    root,
    "packages-ts/example/package.json",
    JSON.stringify({
      name: "@fixture/example",
      version: "1.0.0",
      license: "Apache-2.0",
    }, null, 2),
  );
  assert.equal(spawnSync("git", ["init"], { cwd: root }).status, 0);
  assert.equal(spawnSync("git", ["add", "--", "."], { cwd: root }).status, 0);
  return root;
}

/**
 * Run the real SBOM generator against the selected fixture root.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args generator mode arguments
 * @param {string | null} sourceDateEpoch reproducible timestamp, or null
 */
function run(root, args = [], sourceDateEpoch = "1700000000") {
  const env = { ...process.env };
  if (sourceDateEpoch === null) delete env.SOURCE_DATE_EPOCH;
  else env.SOURCE_DATE_EPOCH = sourceDateEpoch;
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env,
  });
}

test("SBOM --check refuses every artifact drift without writing", () => {
  const root = fixture();
  const out = join(root, "build", "sbom");
  const sbom = join(out, "sbom.json");
  const provenance = join(out, "provenance.json");
  try {
    const unpinned = run(root, [], null);
    assert.notEqual(unpinned.status, 0);
    assert.equal(existsSync(sbom), false);

    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(sbom), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(existsSync(sbom), true);
    assert.equal(existsSync(provenance), true);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(sbom, "tampered\n");
    const provenanceBefore = readFileSync(provenance, "utf8");
    const driftedSbom = run(root, ["--check"]);
    assert.notEqual(driftedSbom.status, 0);
    assert.equal(readFileSync(sbom, "utf8"), "tampered\n");
    assert.equal(readFileSync(provenance, "utf8"), provenanceBefore);

    assert.equal(run(root).status, 0);
    writeFileSync(provenance, "tampered\n");
    const driftedProvenance = run(root, ["--check"]);
    assert.notEqual(driftedProvenance.status, 0);
    assert.equal(readFileSync(provenance, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("SBOM refuses an output path outside the selected repository", () => {
  const root = fixture();
  const escapeName = `${basename(root)}-escape.json`;
  const escaped = join(dirname(root), escapeName);
  try {
    const result = run(root, ["--out", `../${escapeName}`]);
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(escaped), false);
  } finally {
    rmSync(escaped, { force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
