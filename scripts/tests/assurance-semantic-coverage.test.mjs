import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it } from "node:test";

import {
  buildRouteRegistry,
  parseProgram,
} from "../../packages-galerina/galerina-core-compiler/dist/index.js";
import {
  deriveSemanticCoverage,
} from "../lib/assurance-fabric/semantic-coverage.mjs";
import {
  generateSemanticGraph,
} from "../gen-assurance-semantic-graph.mjs";

const compiler = { buildRouteRegistry, parseProgram };

function write(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function readJson(root, relativePath) {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function writeJson(root, relativePath, value) {
  write(root, relativePath, `${JSON.stringify(value, undefined, 2)}\n`);
}

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function manifest() {
  return {
    schemaVersion: 1,
    requirements: [{
      id: "vok-sem-route",
      criticality: "release",
      evidencePath: "governance/assurance-semantic-coverage.json",
    }],
    systemContracts: [{
      id: "system-contract:repository-governance",
      evidencePath: "AGENTS.md",
    }],
    evidence: [
      {
        id: "route-positive",
        sourcePath: "scripts/tests/semantic.test.mjs",
        class: "contract",
        polarity: "positive",
        requirementIds: ["vok-sem-route"],
        systemContract: {
          kind: "absent",
          reason: "mapped to a release requirement",
        },
      },
      {
        id: "route-refusal",
        sourcePath: "scripts/tests/semantic.test.mjs",
        class: "detector-self-test",
        polarity: "refusal",
        requirementIds: ["vok-sem-route"],
        systemContract: {
          kind: "absent",
          reason: "mapped to a release requirement",
        },
      },
    ],
    detectors: [{
      id: "detector:route-provenance",
      ruleId: "route-provenance",
      plantedDefectId: "route-text-must-not-enter",
      testId: "route-refusal",
    }],
    legacyUnmapped: {
      baselineCount: 0,
      pathsDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "assurance-semantic-coverage-"));
  write(root, "AGENTS.md", "# Fixture governance\n");
  writeJson(root, "galerina.workspace.json", {
    name: "semantic-fixture",
    packages: [
      "packages-galerina/galerina-alpha",
      "packages-galerina/galerina-beta",
    ],
  });
  writeJson(root, "governance/assurance-semantic-coverage.json", manifest());
  writeJson(root, "packages-galerina/galerina-alpha/package.json", {
    name: "@galerina/alpha",
  });
  writeJson(root, "packages-galerina/galerina-beta/package.json", {
    name: "@galerina/beta",
  });
  write(
    root,
    "packages-galerina/galerina-alpha/src/api.fungi",
    [
      "@version 1",
      "route GET \"/health\" { flow health }",
      "flow health() -> Int { return 1 }",
      "",
    ].join("\n"),
  );
  write(
    root,
    "packages-galerina/galerina-alpha/src/a.ts",
    "export const routeLike = /route POST \\\"/not-live\\\"/;\n",
  );
  write(root, "packages-galerina/galerina-beta/src/b.mjs", "export const b = 1;\n");
  write(root, "docs/routes.md", "route DELETE \"/not-live\" { flow falseRoute }\n");
  write(root, "scripts/gen-assurance-semantic-graph.mjs", "// fixture semantic generator\n");
  write(root, "scripts/lib/assurance-fabric/semantic-coverage.mjs", "// fixture semantic derivation\n");
  write(root, "scripts/lib/assurance-fabric/semantic-graph.mjs", "// fixture semantic graph\n");
  write(root, "scripts/lib/assurance-fabric/strict-json.mjs", "// fixture strict JSON parser\n");
  write(root, "scripts/tests/semantic.test.mjs", "// requirement evidence\n");
  write(root, "packages-galerina/galerina-alpha/tests/alpha.test.mjs", "// package test\n");
  writeJson(root, "packages-galerina/galerina-alpha/.graph/package-graph.json", {
    packageName: "@galerina/alpha",
    externalDeps: [{
      specifier: "@galerina/beta",
      kind: "workspace",
      importedBy: ["src/a.ts"],
    }],
  });
  writeJson(root, "packages-galerina/galerina-beta/.graph/package-graph.json", {
    packageName: "@galerina/beta",
    externalDeps: [],
  });
  writeJson(root, "build/graph/galerina-devtools-project-graph.json", {
    version: "0.1.0",
    generatedAt: "2026-08-10T00:00:00.000Z",
    nodes: [],
    edges: [{
      from: "package:galerina-alpha",
      to: "package:galerina-beta",
      kind: "depends_on",
      confidence: "EXTRACTED",
      evidencePath: "packages-galerina/galerina-alpha/.graph/package-graph.json",
    }],
  });
  writeJson(root, "build/ts-retirement/ts-retirement.json", {
    executableFamily: {
      ts: ["packages-galerina/galerina-alpha/src/a.ts"],
      declarationTs: [],
      mts: [],
      cts: [],
      mjs: [
        "packages-galerina/galerina-alpha/tests/alpha.test.mjs",
        "packages-galerina/galerina-beta/src/b.mjs",
      ],
      js: [],
      cjs: [],
    },
    totals: { allTrackedExecutable: 3 },
  });
  write(root, ".gitignore", "/build/\n");
  git(root, ["init", "--quiet"]);
  git(root, ["config", "user.email", "fixture@example.invalid"]);
  git(root, ["config", "user.name", "Fixture"]);
  git(root, ["add", "."]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  return root;
}

async function derive(root, options = {}) {
  return deriveSemanticCoverage(root, { compiler, ...options });
}

function accepted(result) {
  assert.equal(result.kind, "accepted", JSON.stringify(result));
  return result.value;
}

function refused(result, code) {
  assert.equal(result.kind, "refused", JSON.stringify(result));
  assert.equal(result.code, code, JSON.stringify(result));
}

describe("semantic coverage derivation", () => {
  it("admits only parser-proven routes and conserves package, test and executable facts", async () => {
    const root = fixture();
    try {
      const report = accepted(await derive(root));
      assert.equal(report.totals.routes, 1);
      assert.equal(report.totals.packages, 2);
      assert.equal(report.totals.tests, 3);
      assert.equal(report.totals.detectors, 1);
      assert.equal(report.totals.executableFamily, 3);
      assert.equal(report.verdictTrit, 1);
      assert.equal(report.authorizing, false);
      assert.deepEqual(
        report.nodes.filter((node) => node.kind === "route"),
        [{
          id: report.nodes.find((node) => node.kind === "route").id,
          kind: "route",
          evidencePath: "packages-galerina/galerina-alpha/src/api.fungi",
          line: 2,
        }],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a missing package graph", async () => {
    const root = fixture();
    try {
      rmSync(join(root, "packages-galerina/galerina-beta/.graph/package-graph.json"));
      refused(await derive(root), "SEMANTIC_PACKAGE_GRAPH_MISSING");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses package edges that appear in only one graph view", async () => {
    const root = fixture();
    try {
      const graph = readJson(root, "build/graph/galerina-devtools-project-graph.json");
      graph.edges = [];
      writeJson(root, "build/graph/galerina-devtools-project-graph.json", graph);
      refused(await derive(root), "SEMANTIC_PACKAGE_EDGE_MISMATCH");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a tracked test outside a registered ownership contract", async () => {
    const root = fixture();
    try {
      write(root, "unknown/escape.test.mjs", "// unowned\n");
      git(root, ["add", "unknown/escape.test.mjs"]);
      refused(await derive(root), "SEMANTIC_TEST_UNMAPPED");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses missing requirement polarity and detector evidence", async () => {
    const root = fixture();
    try {
      const value = manifest();
      value.evidence = value.evidence.filter((entry) => entry.polarity !== "refusal");
      writeJson(root, "governance/assurance-semantic-coverage.json", value);
      refused(await derive(root), "ASSURANCE-SEMANTIC-REQUIREMENT");

      const missing = manifest();
      missing.evidence[1].sourcePath = "scripts/tests/missing.test.mjs";
      writeJson(root, "governance/assurance-semantic-coverage.json", missing);
      refused(await derive(root), "SEMANTIC_EVIDENCE_MISSING");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses stale executable-family totals", async () => {
    const root = fixture();
    try {
      const retirement = readJson(root, "build/ts-retirement/ts-retirement.json");
      retirement.totals.allTrackedExecutable = 1;
      writeJson(root, "build/ts-retirement/ts-retirement.json", retirement);
      refused(await derive(root), "SEMANTIC_RETIREMENT_MISMATCH");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a symlinked authority input", async () => {
    const root = fixture();
    try {
      const target = join(root, "governance/manifest-target.json");
      writeFileSync(target, readFileSync(join(root, "governance/assurance-semantic-coverage.json")));
      rmSync(join(root, "governance/assurance-semantic-coverage.json"));
      symlinkSync(target, join(root, "governance/assurance-semantic-coverage.json"), "file");
      refused(await derive(root), "SEMANTIC_INPUT_SYMLINK");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses an input changed between derivation and readback", async () => {
    const root = fixture();
    try {
      refused(await derive(root, {
        beforeInputReadback() {
          write(root, "scripts/tests/semantic.test.mjs", "// changed during derivation\n");
        },
      }), "SEMANTIC_INPUT_CHANGED");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps generated semantic outputs current across their own commit but blocks changed authoritative input bytes", async () => {
    const root = fixture();
    try {
      const sourceCommit = git(root, ["rev-parse", "HEAD"]);
      const sourceEpoch = Number(git(root, ["show", "-s", "--format=%ct", sourceCommit]));
      let result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "published", JSON.stringify(result));
      const provenancePath = "build/assurance-semantic-graph/provenance.json";
      const publishedProvenance = readJson(root, provenancePath);
      assert.equal(publishedProvenance.gitCommit, sourceCommit);
      assert.equal(publishedProvenance.builtAt, new Date(sourceEpoch * 1000).toISOString());
      git(root, ["add", "-f", "build/assurance-semantic-graph"]);
      git(root, ["commit", "--quiet", "-m", "fixture semantic output"]);

      result = await generateSemanticGraph({ root, check: true, derive });
      assert.equal(result.kind, "current", JSON.stringify(result));
      assert.deepEqual(readJson(root, provenancePath), publishedProvenance);

      write(root, "scripts/tests/semantic.test.mjs", "// changed authoritative evidence bytes\n");
      result = await generateSemanticGraph({ root, check: true, derive });
      assert.equal(result.kind, "stale", JSON.stringify(result));

      result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "refused", JSON.stringify(result));
      assert.equal(result.code, "SEMANTIC_PROVENANCE_DIRTY");
      git(root, ["add", "scripts/tests/semantic.test.mjs"]);
      git(root, ["commit", "--quiet", "-m", "fixture authoritative input"]);
      result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "published", JSON.stringify(result));
      write(root, "packages-galerina/galerina-alpha/src/a.ts", "export const routeLike = /route POST \\\"/not-live\\\"/; // changed source bytes\n");
      result = await generateSemanticGraph({ root, check: true, derive });
      assert.equal(result.kind, "stale", JSON.stringify(result));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("tracks the committed semantic tool buildpoint across its separate output commit", async () => {
    const root = fixture();
    try {
      let result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "published", JSON.stringify(result));
      git(root, ["add", "-f", "build/assurance-semantic-graph"]);
      git(root, ["commit", "--quiet", "-m", "fixture semantic output"]);

      const toolPath = "scripts/lib/assurance-fabric/semantic-graph.mjs";
      write(root, toolPath, "// changed fixture semantic graph tool\n");
      result = await generateSemanticGraph({ root, check: true, derive });
      assert.equal(result.kind, "stale", JSON.stringify(result));
      assert.deepEqual(result.stale, ["build/assurance-semantic-graph/provenance.json"]);
      result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "refused", JSON.stringify(result));
      assert.equal(result.code, "SEMANTIC_PROVENANCE_DIRTY");

      git(root, ["add", toolPath]);
      git(root, ["commit", "--quiet", "-m", "fixture semantic tool"]);
      const toolCommit = git(root, ["rev-parse", "HEAD"]);
      result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "published", JSON.stringify(result));
      assert.equal(
        readJson(root, "build/assurance-semantic-graph/provenance.json").gitCommit,
        toolCommit,
      );
      git(root, ["add", "-f", "build/assurance-semantic-graph"]);
      git(root, ["commit", "--quiet", "-m", "fixture refreshed semantic output"]);
      result = await generateSemanticGraph({ root, check: true, derive });
      assert.equal(result.kind, "current", JSON.stringify(result));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses every well-formed semantic provenance identity substitution", async () => {
    const root = fixture();
    try {
      let result = await generateSemanticGraph({ root, derive });
      assert.equal(result.kind, "published", JSON.stringify(result));
      git(root, ["add", "-f", "build/assurance-semantic-graph"]);
      git(root, ["commit", "--quiet", "-m", "fixture semantic output"]);

      const provenancePath = "build/assurance-semantic-graph/provenance.json";
      const published = readJson(root, provenancePath);
      const replacements = [
        [
          "gitCommit",
          published.gitCommit === "a".repeat(40) ? "b".repeat(40) : "a".repeat(40),
        ],
        ["builtAt", "2000-01-01T00:00:00.000Z"],
      ];
      for (const [field, replacement] of replacements) {
        writeJson(root, provenancePath, { ...published, [field]: replacement });
        result = await generateSemanticGraph({ root, check: true, derive });
        assert.equal(result.kind, "stale", `${field}: ${JSON.stringify(result)}`);
        assert.deepEqual(result.stale, [provenancePath]);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
