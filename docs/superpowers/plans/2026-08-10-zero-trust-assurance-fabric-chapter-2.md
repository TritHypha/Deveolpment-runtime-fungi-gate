# VOK Assurance Fabric Chapter 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deterministic generated-evidence dependency DAG, propagate deny/unknown states through exact predecessor edges, and make the roadmap/subway outputs visibly depend on every upstream evidence source they display.

**Architecture:** Add a closed, pure DAG validator/evaluator under the Chapter 1 private assurance host, then add one filesystem adapter that converts bounded generated artifacts and provenance sidecars into DAG nodes. The roadmap generator consumes the resulting branded report and renders its terminal K3 state; it never converts local byte equality, stale provenance, missing external input, or an unknown predecessor into current evidence.

**Tech Stack:** Node.js ESM, `node:test`, SHA-256, strict JSON intake, existing provenance helpers, existing roadmap/subway generator.

## Global Constraints

- Zero trust: verify rather than assume; every non-current path has a terminal refusal or K3 unknown/deny result.
- `null`, NaN, infinity, sparse arrays, proxies, accessors, surplus fields and unbounded input are forbidden.
- An analyzer or generated artifact cannot express or mint authority-positive state.
- The graph is an index, not a warehouse; nodes carry identities and routes to focused evidence, not copied reports.
- Required edge vocabulary is exactly `DERIVED_FROM`, `CHECKED_BY`, `TESTS`, `PRODUCES`, `BLOCKS`, `SUPERSEDES`, `REPLACES`.
- Git provenance and external-input digests participate in freshness; byte equality alone never proves current state.
- Roadmap/subway publication remains non-authorizing and K3 `0` until every displayed predecessor is current at the same admitted build point.
- The existing phase-close runner remains authoritative during Chapter 2.
- Work remains on `codex/rd-0792-synthesize-only`; commit locally and do not push.

---

### Task 1: Closed Evidence DAG Model

**Files:**
- Create: `scripts/lib/assurance-fabric/evidence-dag.mjs`
- Test: `scripts/tests/assurance-evidence-dag.test.mjs`

**Interfaces:**
- Consumes: ordinary exact objects containing `schemaVersion`, `repositoryHead`, `nodes`, and `edges`.
- Produces: `evaluateEvidenceDag(value) -> { kind: "accepted", value: EvidenceDagReport } | { kind: "refused", code, detail }` and `isEvidenceDagReport(value) -> boolean`.
- `EvidenceDagReport` exposes frozen `nodes`, `edges`, `roots`, `verdictTrit`, and `authorizing: false`; callers cannot construct a branded report.

- [ ] **Step 1: Write the failing graph tests**

```js
test("propagates stale predecessor state to every dependent root", () => {
  const result = evaluateEvidenceDag(graph({
    nodes: [node("graph", 0), node("roadmap", 1)],
    edges: [edge("roadmap", "graph", "DERIVED_FROM")],
  }));
  assert.equal(result.kind, "accepted");
  assert.equal(result.value.nodes.find((item) => item.id === "roadmap").effectiveTrit, 0);
  assert.equal(result.value.verdictTrit, 0);
  assert.equal(result.value.authorizing, false);
});

test("propagates deny ahead of unknown and refuses cycles", () => {
  const denied = evaluateEvidenceDag(graph({
    nodes: [node("a", -1), node("b", 0), node("root", 1)],
    edges: [edge("root", "a", "BLOCKS"), edge("root", "b", "DERIVED_FROM")],
  }));
  assert.equal(denied.value.verdictTrit, -1);
  assert.equal(evaluateEvidenceDag(graph({
    nodes: [node("a", 1), node("b", 1)],
    edges: [edge("a", "b", "DERIVED_FROM"), edge("b", "a", "DERIVED_FROM")],
  })).kind, "refused");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/tests/assurance-evidence-dag.test.mjs`

Expected: fail because `evidence-dag.mjs` does not exist.

- [ ] **Step 3: Implement the closed DAG validator and evaluator**

```js
const EDGE_TYPES = new Set([
  "DERIVED_FROM", "CHECKED_BY", "TESTS", "PRODUCES",
  "BLOCKS", "SUPERSEDES", "REPLACES",
]);
const reportBrand = new WeakSet();

export function evaluateEvidenceDag(value) {
  try {
    const graph = validateGraph(value);
    const effective = new Map();
    for (const id of graph.order) {
      const node = graph.byId.get(id);
      const predecessors = graph.predecessors.get(id) ?? [];
      effective.set(id, Math.min(node.localTrit, ...predecessors.map((p) => effective.get(p))));
    }
    // Edges point from a dependent to its predecessor. A report root is a
    // dependent that no other node names as its predecessor.
    const roots = graph.nodes.filter((node) => !graph.incoming.has(node.id));
    const report = deepFreeze({
      schemaVersion: 1,
      repositoryHead: graph.repositoryHead,
      nodes: graph.nodes.map((node) => ({ ...node, effectiveTrit: effective.get(node.id) })),
      edges: graph.edges,
      roots: roots.map((node) => node.id),
      verdictTrit: Math.min(...roots.map((node) => effective.get(node.id))),
      authorizing: false,
    });
    reportBrand.add(report);
    return Object.freeze({ kind: "accepted", value: report });
  } catch (error) {
    return Object.freeze({ kind: "refused", code: refusalCode(error), detail: refusalDetail(error) });
  }
}
```

Validation must exact-check every record/array descriptor, require unique non-empty IDs, exact lowercase SHA-256 digests, exact 40/64-character lowercase Git identities, finite trits `-1|0|1`, known endpoints, unique edges and an acyclic dependency order. `Math.min` receives at least the node's own trit, so no empty or implicit value exists.

- [ ] **Step 4: Run graph tests and verify GREEN**

Run: `node --test scripts/tests/assurance-evidence-dag.test.mjs`

Expected: all evidence-DAG tests pass with zero skips.

- [ ] **Step 5: Commit the graph model**

```powershell
git add -- scripts/lib/assurance-fabric/evidence-dag.mjs scripts/tests/assurance-evidence-dag.test.mjs
git commit -m "feat: add closed assurance evidence dag"
```

### Task 2: Bounded Generated-Evidence Intake

**Files:**
- Create: `scripts/lib/assurance-fabric/generated-evidence.mjs`
- Test: `scripts/tests/assurance-generated-evidence.test.mjs`
- Modify: `scripts/lib/provenance.mjs`
- Modify: `scripts/tests/provenance-output-match.test.mjs`

**Interfaces:**
- Consumes: repository root, exact current Git head, and an exact descriptor containing `id`, `artifactPaths`, `provenancePath`, `toolPath`, `expectedTool`, `predecessors`, and `externalInputPolicy`.
- Produces: `inspectGeneratedEvidence(root, repositoryHead, descriptor) -> EvidenceNodeCandidate` with exact `subjectDigest`, `toolDigest`, `repositoryHead`, `workingTreeClass`, `externalInputDigest`, and `localTrit`.
- `generatedOutputMatches` continues preventing self-staleness for generated bytes, but its result is explicitly local equality only; the DAG independently checks Git/external freshness.

- [ ] **Step 1: Write failing filesystem-boundary tests**

```js
test("classifies byte-current output with an older Git build point as unknown", () => {
  const candidate = inspectGeneratedEvidence(root, "b".repeat(40), descriptor());
  assert.equal(candidate.localTrit, 0);
  assert.equal(candidate.freshnessReason, "GIT_BUILD_POINT_MISMATCH");
});

test("denies malformed provenance and refuses symlinked artifacts", () => {
  writeFileSync(path.join(root, "build/provenance.json"), "{\"tool\":null}\n");
  assert.equal(inspectGeneratedEvidence(root, "a".repeat(40), descriptor()).localTrit, -1);
  // A fixture symlink/junction in an artifact path must produce a typed refusal or deny.
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/tests/assurance-generated-evidence.test.mjs scripts/tests/provenance-output-match.test.mjs`

Expected: fail because the generated-evidence adapter does not exist and provenance has no local-equality classification.

- [ ] **Step 3: Implement bounded inspection and explicit provenance classification**

```js
export function inspectGeneratedEvidence(root, repositoryHead, descriptor) {
  const admitted = validateDescriptor(root, descriptor);
  const artifactBytes = admitted.artifactPaths.map((relativePath) =>
    readBoundedRegularFile(root, relativePath, MAX_ARTIFACT_BYTES));
  const provenanceBytes = readBoundedRegularFile(root, admitted.provenancePath, MAX_PROVENANCE_BYTES);
  const provenance = parseStrictJsonBytes(provenanceBytes, {
    label: admitted.provenancePath,
    maxBytes: MAX_PROVENANCE_BYTES,
  });
  const localTrit = provenance.tool !== admitted.expectedTool
    ? -1
    : provenance.gitCommit !== repositoryHead
      ? 0
      : externalInputState(provenance, admitted.externalInputPolicy);
  return Object.freeze({
    id: admitted.id,
    subjectDigest: digestFiles(admitted.artifactPaths, artifactBytes),
    toolDigest: sha256(readBoundedRegularFile(root, admitted.toolPath, MAX_TOOL_BYTES)),
    repositoryHead: provenance.gitCommit,
    workingTreeClass: "DECLARED_GENERATED_OUTPUT",
    externalInputDigest: taggedExternalDigest(provenance, admitted.externalInputPolicy),
    localTrit,
    freshnessReason: classifyReason(localTrit, provenance, repositoryHead, admitted),
  });
}
```

All paths must be repository-relative, real regular files, non-symbolic links, and contained after `realpath`. Artifact ordering is descriptor order and contributes length-prefixed path plus bytes to the digest. The provenance object is exact-field checked; `externalInputDigest` is mandatory for external inputs and forbidden otherwise.

- [ ] **Step 4: Run adapter/provenance tests and verify GREEN**

Run: `node --test scripts/tests/assurance-generated-evidence.test.mjs scripts/tests/provenance-output-match.test.mjs`

Expected: all tests pass; older build-point equality remains explicitly K3 unknown.

- [ ] **Step 5: Commit bounded intake**

```powershell
git add -- scripts/lib/assurance-fabric/generated-evidence.mjs scripts/tests/assurance-generated-evidence.test.mjs scripts/lib/provenance.mjs scripts/tests/provenance-output-match.test.mjs
git commit -m "feat: bind generated assurance evidence"
```

### Task 3: Roadmap and Subway Dependency Binding

**Files:**
- Create: `governance/assurance-evidence-dependencies.json`
- Create: `scripts/lib/assurance-fabric/roadmap-evidence.mjs`
- Test: `scripts/tests/assurance-roadmap-evidence.test.mjs`
- Modify: `scripts/gen-roadmap.mjs`
- Modify: `scripts/tests/roadmap-subway-generator.test.mjs`

**Interfaces:**
- Consumes: the closed dependency descriptor, current repository head, project graph, KB graph, dev-tool index, percentage evidence, TypeScript-family retirement inventory, status ledger, package/Fungi inventories, and the pinned SLIDE evidence record.
- Produces: `deriveRoadmapEvidence(root) -> branded EvidenceDagReport` and a visible generated `Assurance DAG: DENY|UNKNOWN|CURRENT` row in both Markdown and SVG outputs.

- [ ] **Step 1: Write failing integration tests**

```js
test("roadmap becomes unknown when a displayed upstream build point is stale", () => {
  installCompleteEvidenceFixture(selected);
  assert.equal(run(harness, selected, ["--write"]).status, 0);
  const graphProvenance = join(selected, "build/graph/provenance.json");
  const stale = JSON.parse(readFileSync(graphProvenance, "utf8"));
  stale.gitCommit = "b".repeat(40);
  writeFileSync(graphProvenance, JSON.stringify(stale, null, 2) + "\n");
  const result = run(harness, selected, ["--write"]);
  assert.equal(result.status, 0);
  assert.match(readFileSync(join(selected, "build/roadmap/roadmap.svg"), "utf8"), /Assurance DAG: UNKNOWN/);
});

test("roadmap denies malformed external-input provenance", () => {
  installCompleteEvidenceFixture(selected);
  writeFileSync(join(selected, "build/kb-graph/provenance.json"), "{\"tool\":\"kb-graph-generator\"}\n");
  const result = run(harness, selected, ["--write"]);
  assert.notEqual(result.status, 0);
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test scripts/tests/assurance-roadmap-evidence.test.mjs scripts/tests/roadmap-subway-generator.test.mjs`

Expected: fail because the roadmap has no dependency-DAG input or visible state.

- [ ] **Step 3: Add the closed dependency descriptor and derivation adapter**

The descriptor must enumerate these exact node IDs and routes:

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "project-graph", "provenancePath": "build/graph/provenance.json", "toolPath": "scripts/project-graph-generator.mjs", "expectedTool": "project-graph-generator" },
    { "id": "kb-graph", "provenancePath": "build/kb-graph/provenance.json", "toolPath": "scripts/kb-graph-generator.mjs", "expectedTool": "kb-graph-generator" },
    { "id": "dev-tool-index", "provenancePath": "build/dev-tool-index/provenance.json", "toolPath": "scripts/dev-tool-index.mjs", "expectedTool": "dev-tool-index" },
    { "id": "percent-evidence", "provenancePath": "build/component-health/percent-provenance.json", "toolPath": "scripts/component-health.mjs", "expectedTool": "component-health" },
    { "id": "ts-retirement", "provenancePath": "build/ts-retirement/provenance.json", "toolPath": "scripts/ts-retirement-graph.mjs", "expectedTool": "ts-retirement-graph" },
    { "id": "status-ledger", "provenancePath": "build/status/provenance.json", "toolPath": "scripts/gen-status-blocks.mjs", "expectedTool": "gen-status-blocks" },
    { "id": "slide-reference", "provenancePath": "governance/slide-reference-evidence.json", "toolPath": "scripts/verify-slide-reference-evidence.mjs", "expectedTool": "verify-slide-reference-evidence" },
    { "id": "roadmap-subway", "provenancePath": "build/roadmap/provenance.json", "toolPath": "scripts/gen-roadmap.mjs", "expectedTool": "gen-roadmap-subway" }
  ]
}
```

The implementation may add exact artifact arrays and predecessor arrays required by Task 2, but must not add another node vocabulary or optional sentinel. `roadmap-subway` depends on every preceding node via `DERIVED_FROM`.

- [ ] **Step 4: Split component-health provenance ownership and render DAG state**

`component-health.mjs` writes `percent-provenance.json`; `gen-roadmap.mjs` writes `subway-provenance.json`. The roadmap generator calls `deriveRoadmapEvidence(ROOT)`, adds the DAG state to its model, and renders the same state and root digest into its generated Markdown block and SVG. `DENY` exits nonzero; `UNKNOWN` renders visibly and remains non-authorizing; only `CURRENT` means the dependency view is current, never production-authorizing.

- [ ] **Step 5: Run integration tests and verify GREEN**

Run: `node --test scripts/tests/assurance-roadmap-evidence.test.mjs scripts/tests/roadmap-subway-generator.test.mjs`

Expected: all tests pass, including stale predecessor, malformed external provenance, missing node, wrong tool, and complete-current fixtures.

- [ ] **Step 6: Commit roadmap binding**

```powershell
git add -- governance/assurance-evidence-dependencies.json scripts/lib/assurance-fabric/roadmap-evidence.mjs scripts/tests/assurance-roadmap-evidence.test.mjs scripts/gen-roadmap.mjs scripts/tests/roadmap-subway-generator.test.mjs scripts/component-health.mjs
git commit -m "feat: bind roadmap to assurance evidence dag"
```

### Task 4: Chapter 2 Regeneration and Custody Closure

**Files:**
- Modify: `docs/superpowers/specs/2026-08-10-zero-trust-assurance-fabric-design.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Regenerate: declared graph, index, component-health, status, retirement, roadmap and provenance outputs through owning tools.

**Interfaces:**
- Consumes: Tasks 1-3 and existing repository generators.
- Produces: a non-authorizing Chapter 2 checkpoint with exact test counts, refusal evidence and current index build points.

- [ ] **Step 1: Run the focused Chapter 1+2 assurance surface**

Run: `node --test scripts/tests/assurance-result-model.test.mjs scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-unsafe-observation.test.mjs scripts/tests/assurance-private-host.test.mjs scripts/tests/assurance-legacy-adapter.test.mjs scripts/tests/run-assurance-shadow.test.mjs scripts/tests/assurance-evidence-dag.test.mjs scripts/tests/assurance-generated-evidence.test.mjs scripts/tests/assurance-roadmap-evidence.test.mjs scripts/tests/roadmap-subway-generator.test.mjs scripts/tests/provenance-output-match.test.mjs`

Expected: zero failures and zero unexpected skips.

- [ ] **Step 2: Regenerate dependency owners in order**

```powershell
node scripts/graph-all.mjs
node scripts/ts-retirement-graph.mjs --write
node scripts/gen-status-blocks.mjs --write
node scripts/gen-roadmap.mjs --write
```

Then run each owning `--check` mode. A stale or missing predecessor must remain visible; do not hand-edit generated output or claim K3 `+1`.

- [ ] **Step 3: Run broad verification**

Run the complete package lane, graph-all check, tooling contract, security/path/private-document audits, percentage audit, roadmap drift check and normal phase-close. Record every refused attempt separately; rerun only after the owning defect is fixed.

- [ ] **Step 4: Update the design, active roadmap and TODO ledger**

Record exact focused/broad counts, the DAG root state, every predecessor state, and the explicit non-authority boundary. Keep historical rows intact and append the Chapter 2 checkpoint.

- [ ] **Step 5: Commit the Chapter 2 evidence checkpoint**

```powershell
git add -- docs/superpowers/specs/2026-08-10-zero-trust-assurance-fabric-design.md docs/TODO.md docs/ROADMAP.md build
git diff --cached --check
git commit -m "docs: close assurance fabric chapter two"
```

- [ ] **Step 6: Refresh both indexes and verify the build point**

Run Myco indexing, then codebase-memory moderate indexing. Require `nodes == expected_nodes`, `indexed_head_sha` equal to the new commit, and a successful graph query for `evaluateEvidenceDag` and `deriveRoadmapEvidence`.

## Self-Review

- Spec coverage: Chapter 2 sections 4, data-flow steps 8-11, refusal paths for stale/malformed predecessors, tests 6-7, and acceptance criteria for roadmap freshness and Git/external provenance map to Tasks 1-4.
- Placeholder scan: every production interface, exact file, test command, failure expectation and commit boundary is stated; there are no deferred implementation blanks.
- Type consistency: `EvidenceNodeCandidate.localTrit` enters `evaluateEvidenceDag`; `deriveRoadmapEvidence` returns the branded report consumed by `gen-roadmap.mjs`; no later task renames these interfaces.
