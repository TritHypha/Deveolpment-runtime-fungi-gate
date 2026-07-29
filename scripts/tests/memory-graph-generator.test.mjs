// memory-graph-generator.test.mjs — proves exact in-place external output
// generation, source binding, and non-mutating check/refusal behavior.
// Version: 1.0.0 · Task 7 external generator governance.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/memory-graph.mjs");

function run(dir, args = []) {
  return spawnSync(process.execPath, [SCRIPT, "--dir", dir, ...args], {
    encoding: "utf8",
  });
}

test("memory graph checks one selected external tree without writing", () => {
  const dir = mkdtempSync(join(tmpdir(), "memory-graph-generator-"));
  const output = join(dir, "MEMORY-GRAPH.json");
  try {
    writeFileSync(
      join(dir, "MEMORY.md"),
      "# Memory\n\n## Work\n- [Alpha](alpha.md) — admitted #k3\n",
    );
    writeFileSync(
      join(dir, "alpha.md"),
      "---\nname: alpha\ndescription: admitted memory\nmetadata:\n  type: project\n---\n\nbody\n",
    );

    const missing = run(dir, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(output), false);

    const generated = run(dir);
    assert.equal(generated.status, 0, generated.stderr);
    const graph = JSON.parse(readFileSync(output, "utf8"));
    assert.match(graph.sourceDigest, /^[a-f0-9]{64}$/);
    assert.equal(run(dir, ["--check"]).status, 0);

    writeFileSync(output, "tampered\n");
    const refused = run(dir, ["--check"]);
    assert.notEqual(refused.status, 0);
    assert.equal(readFileSync(output, "utf8"), "tampered\n");

    assert.equal(run(dir).status, 0);
    writeFileSync(join(dir, "alpha.md"), "# changed\n");
    assert.notEqual(run(dir, ["--check"]).status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
