import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { deriveRoadmapEvidence } from "../lib/assurance-fabric/roadmap-evidence.mjs";

const UPSTREAM = Object.freeze([
  ["project-graph", "build/graph/graph.json", "build/graph/provenance.json", "scripts/project-graph-generator.mjs", "project-graph-generator", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["kb-graph", "build/kb-graph/kb.json", "build/kb-graph/provenance.json", "scripts/kb-graph-generator.mjs", "kb-graph-generator", "external", "required", "EXTERNAL_INPUT"],
  ["dev-tool-index", "build/dev-tool-index/index.json", "build/dev-tool-index/provenance.json", "scripts/dev-tool-index.mjs", "dev-tool-index", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["percent-evidence", "build/component-health/percent-audit.json", "build/component-health/percent-provenance.json", "scripts/component-health.mjs", "component-health", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["ts-retirement", "build/ts-retirement/ts-retirement.json", "build/ts-retirement/provenance.json", "scripts/ts-retirement-graph.mjs", "ts-retirement-graph", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["semantic-coverage", "build/assurance-semantic-graph/SEMANTIC-GRAPH.md", "build/assurance-semantic-graph/provenance.json", "scripts/gen-assurance-semantic-graph.mjs", "semantic-assurance-graph", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["status-ledger", "build/status/STATUS.md", "build/status/provenance.json", "scripts/gen-status-blocks.mjs", "gen-status-blocks", "generated", "forbidden", "DECLARED_GENERATED_OUTPUT"],
  ["slide-reference", "build/slide-reference/reference.json", "build/slide-reference/provenance.json", "scripts/verify-slide-reference-evidence.mjs", "verify-slide-reference-evidence", "external", "required", "EXTERNAL_INPUT"],
]);

function write(root, relativePath, bytes) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return path;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function descriptor() {
  return {
    schemaVersion: 1,
    nodes: UPSTREAM.map(([id, evidencePath, provenancePath, toolPath, expectedTool, kind, externalInputPolicy, workingTreeClass]) => ({
      id,
      kind,
      artifactPaths: [evidencePath],
      evidencePath,
      provenancePath,
      toolPath,
      expectedTool,
      externalInputPolicy,
      workingTreeClass,
      predecessors: [],
    })),
    root: {
      id: "roadmap-subway",
      evidencePath: "build/component-health/roadmap-subway.svg",
      toolPath: "scripts/gen-roadmap-subway.mjs",
      expectedTool: "gen-roadmap-subway",
      predecessors: UPSTREAM.map(([id]) => id),
    },
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "assurance-roadmap-evidence-"));
  execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Fixture"], { cwd: root });
  write(root, ".gitkeep", "fixture\n");
  execFileSync("git", ["add", "--", ".gitkeep"], { cwd: root });
  execFileSync("git", ["commit", "-m", "fixture"], { cwd: root, stdio: "ignore" });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  write(root, "governance/assurance-evidence-dependencies.json", `${JSON.stringify(descriptor(), undefined, 2)}\n`);
  for (const [id, evidencePath, provenancePath, toolPath, expectedTool, kind] of UPSTREAM) {
    write(root, evidencePath, `${id}\n`);
    write(root, toolPath, `export const tool = ${JSON.stringify(expectedTool)};\n`);
    const external = kind === "external"
      ? { externalInputDigest: sha256(`${id}-external`), externalDocumentCount: 1 }
      : {};
    write(root, provenancePath, `${JSON.stringify({
      tool: expectedTool,
      gitCommit: head,
      builtAt: "2026-08-10T00:00:00.000Z",
      node: process.version,
      ...external,
    }, undefined, 2)}\n`);
  }
  write(root, "scripts/gen-roadmap-subway.mjs", "export const generator = true;\n");
  return { root, head };
}

describe("roadmap assurance dependency derivation", () => {
  it("returns one non-authorizing current aggregate over every exact predecessor", () => {
    const { root } = fixture();
    try {
      const result = deriveRoadmapEvidence(root);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.verdictTrit, 1);
      assert.deepEqual(result.value.roots, ["roadmap-subway"]);
      assert.equal(result.value.authorizing, false);
      assert.equal(result.value.nodes.length, UPSTREAM.length + 1);
      assert.equal(result.value.edges.length, UPSTREAM.length);
      assert.equal(result.value.nodes.find((node) => node.id === "roadmap-subway").effectiveTrit, 1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("propagates an older upstream Git build point as unknown", () => {
    const { root } = fixture();
    try {
      const path = join(root, "build/graph/provenance.json");
      const value = JSON.parse(readFileSync(path, "utf8"));
      value.gitCommit = "b".repeat(40);
      writeFileSync(path, `${JSON.stringify(value, undefined, 2)}\n`);
      const result = deriveRoadmapEvidence(root);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.verdictTrit, 0);
      assert.equal(result.value.nodes.find((node) => node.id === "project-graph").localTrit, 0);
      assert.equal(result.value.nodes.find((node) => node.id === "roadmap-subway").effectiveTrit, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("propagates an older semantic-coverage Git build point as unknown", () => {
    const { root } = fixture();
    try {
      const path = join(root, "build/assurance-semantic-graph/provenance.json");
      const value = JSON.parse(readFileSync(path, "utf8"));
      value.gitCommit = "c".repeat(40);
      writeFileSync(path, `${JSON.stringify(value, undefined, 2)}\n`);
      const result = deriveRoadmapEvidence(root);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.verdictTrit, 0);
      assert.equal(result.value.nodes.find((node) => node.id === "semantic-coverage").localTrit, 0);
      assert.equal(result.value.nodes.find((node) => node.id === "roadmap-subway").effectiveTrit, 0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("propagates malformed semantic-coverage provenance as deny", () => {
    const { root } = fixture();
    try {
      write(root, "build/assurance-semantic-graph/provenance.json", "{\n");
      const result = deriveRoadmapEvidence(root);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.verdictTrit, -1);
      assert.equal(result.value.nodes.find((node) => node.id === "semantic-coverage").localTrit, -1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("propagates malformed required external provenance as deny", () => {
    const { root } = fixture();
    try {
      writeFileSync(join(root, "build/kb-graph/provenance.json"), "{\"tool\":\"kb-graph-generator\"}\n");
      const result = deriveRoadmapEvidence(root);
      assert.equal(result.kind, "accepted", JSON.stringify(result));
      assert.equal(result.value.verdictTrit, -1);
      assert.equal(result.value.nodes.find((node) => node.id === "kb-graph").localTrit, -1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses missing evidence and a descriptor with an incomplete node set", () => {
    const { root } = fixture();
    try {
      rmSync(join(root, "build/status/STATUS.md"));
      const missing = deriveRoadmapEvidence(root);
      assert.equal(missing.kind, "refused", JSON.stringify(missing));
      assert.equal(missing.code, "ASSURANCE-EVIDENCE-FILE");

      const incomplete = descriptor();
      incomplete.nodes = incomplete.nodes.filter((node) => node.id !== "semantic-coverage");
      incomplete.root.predecessors = incomplete.root.predecessors.filter((id) => id !== "semantic-coverage");
      write(root, "governance/assurance-evidence-dependencies.json", `${JSON.stringify(incomplete)}\n`);
      const refused = deriveRoadmapEvidence(root);
      assert.equal(refused.kind, "refused", JSON.stringify(refused));
      assert.equal(refused.code, "ASSURANCE-ROADMAP-DESCRIPTOR");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
