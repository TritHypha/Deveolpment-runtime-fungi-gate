// package-graph-generator.test.mjs — proves all-package preflight, existing
// policy enforcement, exact artifact checking, and no partial publication.
// Version: 1.0.0 · Task 7 generator governance.
// Related: scripts/package-graph-generator.mjs; devtools-package-graph.
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

const SCRIPT = resolve("scripts/package-graph-generator.mjs");

/**
 * Write one fixture file, creating its parent directories.
 */
function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

/**
 * Create two packages and tiny stand-ins for the built package-graph modules.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "package-graph-generator-"));
  write(root, "package.json", '{"type":"module"}\n');
  const dist = "packages-galerina/galerina-devtools-package-graph/dist";
  write(
    root,
    `${dist}/scanner.js`,
    "export const scanPackage = (scope) => ({ scope });\n",
  );
  write(
    root,
    `${dist}/graph.js`,
    [
      "export const buildGraph = ({ scope }) => ({",
      "  packageName: scope.split(/[\\\\/]/).at(-1),",
      "  nodes: [{ id: 'n' }], edges: [], externalDeps: [], orphans: [],",
      "  stats: { fileCount: 1 },",
      "});",
      "",
    ].join("\n"),
  );
  write(
    root,
    `${dist}/reporter.js`,
    [
      "export const runBoundaryGate = (scope) => ({",
      "  status: process.env.FAIL_PACKAGE === scope.split(/[\\\\/]/).at(-1) ? 'FAIL' : 'PASS',",
      "  violations: [], orphanWarnings: [],",
      "});",
      "export const renderJson = (graph) => JSON.stringify(graph, null, 2) + '\\n';",
      "export const renderBoundaryMarkdown = (graph) => `# ${graph.packageName}\\n`;",
      "",
    ].join("\n"),
  );
  for (const name of ["alpha", "beta"]) {
    write(
      root,
      `packages-galerina/${name}/package.json`,
      JSON.stringify({ name: `@fixture/${name}`, version: "1.0.0" }),
    );
    write(
      root,
      `packages-galerina/${name}/.graph/boundary-policy.json`,
      JSON.stringify({ packageName: name, allowedExternal: [] }, null, 2),
    );
  }
  write(
    root,
    "galerina.workspace.json",
    JSON.stringify({
      packages: [
        "packages-galerina/alpha",
        "packages-galerina/beta",
      ],
    }),
  );
  assert.equal(spawnSync("git", ["init"], { cwd: root }).status, 0);
  assert.equal(spawnSync("git", ["add", "--", "."], { cwd: root }).status, 0);
  return root;
}

/**
 * Run the real aggregate wrapper against the selected fixture root.
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

test("package graph preflights every package before publishing any output", () => {
  const root = fixture();
  const alpha = join(root, "packages-galerina/alpha/.graph/package-graph.json");
  const beta = join(root, "packages-galerina/beta/.graph/BOUNDARY.md");
  const provenance = join(root, "build/package-graphs/provenance.json");
  try {
    const missing = run(root, ["--check"]);
    assert.notEqual(missing.status, 0);
    assert.equal(existsSync(alpha), false);

    const generated = run(root);
    assert.equal(generated.status, 0, generated.stderr);
    assert.equal(existsSync(alpha), true);
    assert.equal(existsSync(beta), true);
    assert.equal(existsSync(provenance), true);
    assert.equal(run(root, ["--check"]).status, 0);

    writeFileSync(beta, "tampered\n");
    const alphaBefore = readFileSync(alpha, "utf8");
    const drifted = run(root, ["--check"]);
    assert.notEqual(drifted.status, 0);
    assert.equal(readFileSync(beta, "utf8"), "tampered\n");
    assert.equal(readFileSync(alpha, "utf8"), alphaBefore);

    const failedGate = run(root, [], { FAIL_PACKAGE: "beta" });
    assert.notEqual(failedGate.status, 0);
    assert.equal(readFileSync(beta, "utf8"), "tampered\n");
    assert.equal(readFileSync(alpha, "utf8"), alphaBefore);

    assert.equal(run(root).status, 0);
    writeFileSync(provenance, "tampered\n");
    assert.notEqual(run(root, ["--check"]).status, 0);
    assert.equal(readFileSync(provenance, "utf8"), "tampered\n");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
