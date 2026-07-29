// project-graph-generator.test.mjs — proves isolated child generation,
// complete output publication, provenance, and non-mutating drift refusal.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/project-graph-generator.mjs; core-cli graph command.
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
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const SCRIPT = resolve("scripts/project-graph-generator.mjs");

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
 * Create a repository with a deterministic stand-in for the real core CLI.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "project-graph-generator-"));
  write(root, "package.json", '{"type":"module"}\n');
  write(
    root,
    "packages-galerina/galerina-core-cli/dist/index.js",
    [
      'import { mkdirSync, writeFileSync } from "node:fs";',
      'import { join } from "node:path";',
      "const i = process.argv.indexOf('--out');",
      "const out = process.argv[i + 1];",
      "if (process.env.FAIL_GRAPH === '1') process.exit(7);",
      "mkdirSync(out, { recursive: true });",
      "const graph = { version: 'fixture', generatedAt: new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString(), nodes: [{ id: 'n' }], edges: [{ from: 'n', to: 'n' }] };",
      "writeFileSync(join(out, 'galerina-devtools-project-graph.json'), JSON.stringify(graph, null, 2) + '\\n');",
      "writeFileSync(join(out, 'galerina-devtools-project-graph.html'), '<html>fixture</html>\\n');",
      "writeFileSync(join(out, 'Galerina_GRAPH_REPORT.md'), '# fixture\\n');",
      "writeFileSync(join(out, 'galerina-ai-map.md'), '# map\\n');",
      "",
    ].join("\n"),
  );
  assert.equal(spawnSync("git", ["init"], { cwd: root }).status, 0);
  assert.equal(spawnSync("git", ["add", "--", "."], { cwd: root }).status, 0);
  return root;
}

/**
 * Run the real wrapper against the selected fixture root.
 *
 * @param {string} root fixture root
 * @param {readonly string[]} args generator mode arguments
 * @param {NodeJS.ProcessEnv} extraEnv child controls
 */
function run(root, args = [], extraEnv = {}) {
  return spawnSync(process.execPath, [SCRIPT, "--root", root, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      SOURCE_DATE_EPOCH: "1700000000",
      ...extraEnv,
    },
  });
}

test("project graph publishes only a complete validated child output set", () => {
  const root = fixture();
  const out = join(root, "build", "graph");
  const json = join(out, "galerina-devtools-project-graph.json");
  const report = join(out, "Galerina_GRAPH_REPORT.md");
  const provenance = join(out, "provenance.json");
  try {
    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(json), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(existsSync(json), true);
    assert.equal(existsSync(provenance), true);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(report, "tampered\n");
    const jsonBefore = readFileSync(json, "utf8");
    const drifted = run(root, ["--check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(report, "utf8"), "tampered\n");
    assert.equal(readFileSync(json, "utf8"), jsonBefore);

    const reportBeforeFailure = readFileSync(report, "utf8");
    const failedChild = run(root, [], { FAIL_GRAPH: "1" });
    assert.notEqual(failedChild.status, 0);
    assert.equal(readFileSync(report, "utf8"), reportBeforeFailure);
    assert.equal(readFileSync(json, "utf8"), jsonBefore);

    assert.equal(run(root).status, 0);
    writeFileSync(provenance, "tampered\n");
    const provenanceDrift = run(root, ["--check"]);
    assert.notEqual(provenanceDrift.status, 0);
    assert.equal(readFileSync(provenance, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
