// kb-graph-generator.test.mjs — proves external KB normalization, complete
// preflight, exact output checking, source binding, and no partial writes.
// Version: 1.0.0 · Task 7 external generator governance.
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

const SCRIPT = resolve("scripts/kb-graph-generator.mjs");

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "kb-graph-root-"));
  const kb = mkdtempSync(join(tmpdir(), "kb-graph-corpus-"));
  const dist = "packages-galerina/galerina-devtools-kb-graph/dist";
  write(root, "package.json", '{"type":"module"}\n');
  write(root, `${dist}/scanner.js`, `
    import { readdirSync, readFileSync, statSync } from "node:fs";
    import { join } from "node:path";
    export const scanKBDirectory = (dir) => ({
      docs: readdirSync(dir).filter((f) => f.endsWith(".md")).map((file) => ({
        id: file.slice(0, -3), path: join(dir, file), title: readFileSync(join(dir, file), "utf8").trim(),
        wordCount: 1, lnlCodes: [], lastModified: statSync(join(dir, file)).mtime,
      })),
      edges: [],
    });
  `);
  write(root, `${dist}/graph.js`, `
    export const buildKBGraph = (scan) => ({
      nodes: scan.docs, edges: scan.edges, orphans: scan.docs.map((d) => d.id),
      staleLinks: [], rawStaleLinks: [], rawOrphans: [],
      stats: { totalDocs: scan.docs.length, totalEdges: 0, totalFungiCodes: 0,
        orphanCount: scan.docs.length, staleLinkCount: 0, rawStaleLinkCount: 0, rawOrphanCount: 0 },
    });
  `);
  write(root, `${dist}/reporter.js`, `
    export const generateJSON = (graph) => JSON.stringify(graph, null, 2);
    export const generateDOT = (graph) => \`digraph { /* \${graph.nodes.length} */ }\`;
    export const generateMarkdownReport = (graph, date) => \`# KB\\nGenerated: \${date}\\nDocs: \${graph.nodes.length}\\n\`;
  `);
  write(root, "README.md", "# Fixture\n");
  write(kb, "alpha.md", "# Alpha\n");
  assert.equal(spawnSync("git", ["init"], { cwd: root }).status, 0);
  assert.equal(spawnSync("git", ["add", "--", "."], { cwd: root }).status, 0);
  return { root, kb };
}

function run(root, kb, args = []) {
  return spawnSync(process.execPath, [
    SCRIPT, "--root", root, "--kb-dir", kb, ...args,
  ], {
    encoding: "utf8",
    env: { ...process.env, SOURCE_DATE_EPOCH: "1700000000" },
  });
}

test("KB graph normalizes and checks an explicit external corpus", () => {
  const { root, kb } = fixture();
  const output = join(root, "build/kb-graph/kb-graph.json");
  const report = join(root, "build/kb-graph/kb-report.md");
  const provenance = join(root, "build/kb-graph/provenance.json");
  try {
    assert.notEqual(run(root, kb, ["--check"]).status, 0);
    assert.equal(existsSync(output), false);

    const generated = run(root, kb);
    assert.equal(generated.status, 0, generated.stderr);
    const graph = JSON.parse(readFileSync(output, "utf8"));
    const stamp = JSON.parse(readFileSync(provenance, "utf8"));
    assert.equal(graph.nodes[0].path, "kb/alpha.md");
    assert.equal(graph.nodes[0].lastModified, "1970-01-01T00:00:00.000Z");
    assert.match(stamp.externalInputDigest, /^[a-f0-9]{64}$/);
    assert.equal(run(root, kb, ["--check"]).status, 0);

    writeFileSync(report, "tampered\n");
    const graphBefore = readFileSync(output, "utf8");
    assert.notEqual(run(root, kb, ["--check"]).status, 0);
    assert.equal(readFileSync(report, "utf8"), "tampered\n");
    assert.equal(readFileSync(output, "utf8"), graphBefore);

    write(kb, "alpha.md", "# Changed\n");
    assert.notEqual(run(root, kb, ["--check"]).status, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(kb, { recursive: true, force: true });
  }
});
