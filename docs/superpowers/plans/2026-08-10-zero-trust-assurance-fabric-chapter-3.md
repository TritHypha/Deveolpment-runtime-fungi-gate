# VOK Assurance Fabric Chapter 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed semantic coverage graph that conserves live routes and package dependencies, maps release-critical requirements to positive and refusal evidence, proves detector liveness, and replaces the `.ts`-only retirement denominator with the complete executable TypeScript/JavaScript family.

**Architecture:** First widen the existing retirement inventory through one Git-index walk, without filesystem globs, and keep the old TypeScript fields as compatibility facts. Then derive a separate, bounded semantic graph from canonical compiler parsing, the 100 owned package graphs, registered test files and a closed requirement/liveness manifest. Publish that graph through one declared generator, add it as a predecessor of the roadmap evidence DAG, and make its check a blocking phase-close gate.

**Tech Stack:** Node.js ESM, `node:test`, SHA-256, canonical compiler `parseProgram`/`buildRouteRegistry`, Git index enumeration, existing package/project graphs, existing evidence DAG and provenance helpers.

## Global Constraints

- Zero trust: verify rather than assume; every missing, stale, ambiguous, unparseable or non-conserving input has a terminal refusal or K3 unknown/deny result.
- `null`, NaN, infinity, sparse arrays, proxies, accessors, surplus fields and unbounded inputs are forbidden.
- The graph is an index, not a warehouse: it stores identities, counts, digests and evidence routes, not copied source or test output.
- Route evidence comes only from the canonical `.fungi` parser AST. Text, regex literals, comments, Markdown and documentation examples cannot become live routes.
- Package fan-in/fan-out is independently recomputed from all 100 owned package graphs and must agree with the project graph.
- Every release-critical requirement has at least one positive and one negative/refusal mapping. Every registered test file maps to a requirement or an explicit system-contract classification.
- Every semantic rule names a planted-defect test that demonstrates the rule becomes red.
- The executable-family denominator includes `.ts`, `.d.ts`, `.mts`, `.cts`, `.mjs`, `.js` and `.cjs`; absence of one extension is an explicit zero, never an omitted field.
- `.fungi` execution, host-boundary ownership, bootstrap floors, generated files and dependency trees remain separate retirement obligations.
- The semantic report and roadmap remain non-authorizing. A current graph cannot release production, conversion, signing or retirement authority.
- Work remains on `codex/rd-0792-synthesize-only`; commit locally and do not push.

---

### Task 1: Complete Executable-Family Retirement Inventory

**Files:**
- Modify: `scripts/ts-retirement-graph.mjs`
- Test: `scripts/tests/ts-retirement-generator.test.mjs`
- Modify: `scripts/tests/dev-tools-scripts.test.mjs`
- Regenerate: `build/ts-retirement/ts-retirement.json`
- Regenerate: `build/ts-retirement/TS-RETIREMENT.md`

**Interfaces:**
- Consumes: one NUL-delimited `git ls-files -- packages-galerina` result and the existing Fungi/host/topology ledgers.
- Produces: existing `allTrackedTsPaths`/`totals.allTrackedTs` compatibility fields plus `allTrackedExecutablePaths`, `executableFamily`, and `totals.allTrackedExecutable`.
- `executableFamily` is an exact object with keys `ts`, `declarationTs`, `mts`, `cts`, `mjs`, `js`, and `cjs`; each value is a frozen sorted path array.

- [ ] **Step 1: Write the failing complete-family tests**

Add controlled fixtures containing `src/a.ts`, `src/a.d.ts`, `src/b.mts`,
`src/c.cts`, `src/d.mjs`, `src/e.js`, `src/f.cjs`, a documentation `.mjs`
string and an untracked `.mjs`. Assert that only the seven tracked package
files enter their exact classes, that all seven keys exist, and that:

```js
assert.equal(graph.totals.allTrackedExecutable, 7);
assert.deepEqual(graph.executableFamily.mjs, [
  "packages-galerina/pkg/src/d.mjs",
]);
assert.equal(graph.terminalReady, false);
assert.match(graph.postSlideViolations.join("\n"), /7 tracked package executable-family paths/);
```

Add a mutation case that removes `.mjs` classification while leaving `.ts`
classification intact; the expected total must remain seven so the old
`.ts`-only implementation fails.

- [ ] **Step 2: Run the retirement tests and verify RED**

Run: `node --test scripts/tests/ts-retirement-generator.test.mjs scripts/tests/dev-tools-scripts.test.mjs`

Expected: fail because `executableFamily` and `allTrackedExecutablePaths` do not exist and the terminal gate still sees only TypeScript.

- [ ] **Step 3: Implement one Git-index classifier**

Replace extension-specific Git pathspec discovery with one bounded,
NUL-delimited package-tree enumeration. Classify paths with an exact terminal
switch:

```js
function executableClass(path) {
  if (path.endsWith(".d.ts")) return "declarationTs";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".mts")) return "mts";
  if (path.endsWith(".cts")) return "cts";
  if (path.endsWith(".mjs")) return "mjs";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".cjs")) return "cjs";
  return "notExecutableFamily";
}
```

Require every classified path to match
`packages-galerina/<registered-package>/...`, exclude Git submodules and
vendored `node_modules`, sort once, and derive every class/count from the same
list. Preserve the existing TS fields from `ts + declarationTs` so downstream
consumers do not silently change meaning. Terminal retirement requires
`allTrackedExecutablePaths.length === 0`.

- [ ] **Step 4: Run retirement tests and verify GREEN**

Run: `node --test scripts/tests/ts-retirement-generator.test.mjs scripts/tests/dev-tools-scripts.test.mjs`

Expected: all selected tests pass with the `.mjs`-omission mutant caught.

- [ ] **Step 5: Regenerate and commit the complete denominator**

Run:

```powershell
node scripts/ts-retirement-graph.mjs
node scripts/ts-retirement-graph.mjs --check
```

Verify that the live report names every extension class and that the sum of the
seven class counts equals `allTrackedExecutable`. Then commit only the source,
tests and retirement outputs:

```powershell
git add -- scripts/ts-retirement-graph.mjs scripts/tests/ts-retirement-generator.test.mjs scripts/tests/dev-tools-scripts.test.mjs build/ts-retirement
git commit -m "feat: inventory complete executable source family"
```

### Task 2: Closed Requirement, Test and Detector Graph Model

**Files:**
- Create: `governance/assurance-semantic-coverage.json`
- Create: `scripts/lib/assurance-fabric/semantic-graph.mjs`
- Test: `scripts/tests/assurance-semantic-graph.test.mjs`

**Interfaces:**
- Consumes: an exact object containing `schemaVersion`, `repositoryHead`, `requirements`, `routes`, `packages`, `tests`, `detectors`, `executableFamily`, and `legacyUnmapped`.
- Produces: `evaluateSemanticGraph(value) -> { kind: "accepted", value: SemanticGraphReport } | { kind: "refused", code, detail }` and `isSemanticGraphReport(value) -> boolean`.
- `SemanticGraphReport` exposes frozen nodes/edges, exact conservation totals, `verdictTrit`, `authorizing: false`, and an unforgeable in-process brand.

- [ ] **Step 1: Write failing model tests**

Use literal fixtures to prove:

```js
test("a release requirement needs positive and refusal evidence", () => {
  const result = evaluateSemanticGraph(graph({
    requirements: [requirement("VOK-SEM-001", "release")],
    tests: [testNode("positive", ["VOK-SEM-001"], "positive")],
  }));
  assert.equal(result.kind, "refused");
});

test("an unmapped baseline can shrink but cannot grow", () => {
  assert.equal(evaluateSemanticGraph(graph({
    legacyUnmapped: { baselineCount: 2, currentCount: 3, pathsDigest: "a".repeat(64) },
  })).kind, "refused");
});
```

Add cases for a dangling `TESTS` edge, duplicate test identity, a route without
parser provenance/file/line/method, inconsistent package fan counts, a detector
without a planted-defect mapping, a missing executable-family key, null,
non-finite values, sparse arrays, accessors and proxies.

- [ ] **Step 2: Run the model test and verify RED**

Run: `node --test scripts/tests/assurance-semantic-graph.test.mjs`

Expected: fail because `semantic-graph.mjs` does not exist.

- [ ] **Step 3: Implement the closed model**

Use exact enums:

```js
const TEST_CLASSES = new Set([
  "unit", "contract", "negative-refusal", "detector-self-test",
  "mutation", "integration", "platform", "durability-recovery",
  "differential-oracle", "system-contract",
]);
const POLARITIES = new Set(["positive", "refusal", "neutral"]);
```

Require unique bounded IDs and repository-relative NFC paths, exact lower-case
SHA-256 digests, finite integer counts and exact objects. A release requirement
must have at least one `positive` and one `refusal` `TESTS` edge. Each test has
either a non-empty requirement list or one exact `systemContractId`, never
both. Each detector rule has one `plantedDefectId` and one mapped
`detector-self-test` or `mutation` test. Package declared and derived fan-in /
fan-out counts must match. The executable-family total must equal the sum of
all seven keys. `legacyUnmapped.currentCount` may equal or shrink below its
baseline but never grow.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `node --test scripts/tests/assurance-semantic-graph.test.mjs`

Expected: all semantic-model tests pass with zero skips.

- [ ] **Step 5: Commit the closed model**

```powershell
git add -- governance/assurance-semantic-coverage.json scripts/lib/assurance-fabric/semantic-graph.mjs scripts/tests/assurance-semantic-graph.test.mjs
git commit -m "feat: add closed semantic assurance graph"
```

### Task 3: Parser-Proven Route and Package/Test Conservation Generator

**Files:**
- Create: `scripts/lib/assurance-fabric/semantic-coverage.mjs`
- Create: `scripts/gen-assurance-semantic-graph.mjs`
- Test: `scripts/tests/assurance-semantic-coverage.test.mjs`
- Create/Regenerate: `build/assurance-semantic-graph/semantic-graph.json`
- Create/Regenerate: `build/assurance-semantic-graph/SEMANTIC-GRAPH.md`
- Create/Regenerate: `build/assurance-semantic-graph/provenance.json`
- Modify: `governance/generator-policy.json`
- Modify: `scripts/tests/generator-contract.test.mjs`

**Interfaces:**
- Consumes: the closed semantic manifest, canonical compiler dist, registered workspace, all 100 `.graph/package-graph.json` files, project graph, Git-indexed test/source files and the complete retirement inventory.
- Produces: `deriveSemanticCoverage(root) -> accepted SemanticGraphReport | refused`, plus a generator CLI with default write and non-mutating `--check` modes.

- [ ] **Step 1: Write failing extraction and hostile-input tests**

Create a selected-root fixture with one real parsed `.fungi` route, a route-like
regex literal, a Markdown route example, two packages with one workspace edge,
one release requirement with positive/refusal tests and one planted detector
defect. Assert that only the AST route enters the graph and carries exact
`sourcePath`, one-based `line`, uppercase method, normalized path, flow and
`parserProvenance: "canonical-fungi-ast"`.

Add independent negative cases for a missing package graph, a package edge
present in only one of project/per-package views, wrong fan-in, an unregistered
test file, a missing requirement mapping, a detector test path that does not
exist, stale retirement totals, a symlinked input and a file changed during
derivation.

- [ ] **Step 2: Run extraction tests and verify RED**

Run: `node --test scripts/tests/assurance-semantic-coverage.test.mjs`

Expected: fail because the semantic-coverage adapter and generator do not exist.

- [ ] **Step 3: Implement bounded derivation**

Enumerate tracked files once through `git ls-files -z`, validate the registered
package set, then:

1. parse only tracked package `src/*.fungi` files with canonical `parseProgram`;
2. reject parser diagnostics before traversing `routeDecl` AST nodes;
3. pair AST route nodes with `buildRouteRegistry` results and require equal
   counts and identities;
4. read every package graph as a bounded regular file and derive workspace
   edges from `externalDeps.kind === "workspace"`;
5. compare that exact edge set and recomputed fan counts with project-graph
   `depends_on` edges;
6. classify every tracked `*.test.mjs`, `*.test.js`, `*.test.ts`, `*.spec.mjs`,
   `*.spec.js` and `*.spec.ts` under a declared requirement or registered
   package/system contract;
7. validate each named requirement and planted-defect evidence path;
8. cross-conserve the seven executable-family arrays and totals with the
   retirement inventory.

Hash length-prefixed path and bytes for every input and re-read every digest
before returning. On mismatch return `SEMANTIC_INPUT_CHANGED`, never partial
output.

- [ ] **Step 4: Implement governed publication**

The CLI accepts only `--root <path>` and `--check`. It derives all outputs in
memory, writes no partial set, uses `provenanceForCheck`, and publishes the
three exact files. Register those outputs under one new
`semantic-assurance-graph` generator-policy entry. Add generator-contract
fixtures proving missing, surplus and hand-edited outputs refuse.

- [ ] **Step 5: Run generator tests and verify GREEN**

Run: `node --test scripts/tests/assurance-semantic-graph.test.mjs scripts/tests/assurance-semantic-coverage.test.mjs scripts/tests/generator-contract.test.mjs`

Expected: all selected tests pass, including every planted semantic defect.

- [ ] **Step 6: Regenerate and commit the semantic graph**

```powershell
node scripts/gen-assurance-semantic-graph.mjs
node scripts/gen-assurance-semantic-graph.mjs --check
git add -- governance/assurance-semantic-coverage.json governance/generator-policy.json scripts/lib/assurance-fabric/semantic-coverage.mjs scripts/gen-assurance-semantic-graph.mjs scripts/tests/assurance-semantic-coverage.test.mjs scripts/tests/generator-contract.test.mjs build/assurance-semantic-graph
git commit -m "feat: generate semantic assurance coverage"
```

### Task 4: Evidence-DAG, Phase-Close and Roadmap Integration

**Files:**
- Modify: `governance/assurance-evidence-dependencies.json`
- Modify: `scripts/lib/assurance-fabric/roadmap-evidence.mjs`
- Modify: `scripts/tests/assurance-roadmap-evidence.test.mjs`
- Modify: `scripts/graph-all.mjs`
- Modify: `scripts/run-phase-close.mjs`
- Modify: `scripts/tests/dev-tools-scripts.test.mjs`
- Modify: `scripts/gen-roadmap.mjs`
- Modify: `scripts/tests/roadmap-subway-generator.test.mjs`
- Modify: `docs/superpowers/specs/2026-08-10-zero-trust-assurance-fabric-design.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Regenerate: graph, dev-tool, code, retirement, semantic, component-health, status, roadmap and provenance outputs.

**Interfaces:**
- Consumes: Tasks 1-3 and the existing Chapter 2 evidence DAG.
- Produces: one ninth-node roadmap report whose root depends on the semantic-coverage predecessor, a seven-child graph umbrella and one additional blocking phase-close gate.

- [ ] **Step 1: Write failing integration tests**

Extend roadmap fixtures with `semantic-coverage`. Prove its stale Git build
point makes the roadmap `UNKNOWN`, malformed provenance makes publication
refuse, and omission makes the descriptor fail exact-node validation. Add a
graph-all fixture expecting seven exact children and a phase-close fixture
proving the semantic check executes once and a nonzero result blocks closure.

- [ ] **Step 2: Run integration tests and verify RED**

Run: `node --test scripts/tests/assurance-roadmap-evidence.test.mjs scripts/tests/roadmap-subway-generator.test.mjs scripts/tests/dev-tools-scripts.test.mjs`

Expected: fail because the descriptor has no semantic predecessor and the two orchestrators do not schedule it.

- [ ] **Step 3: Bind the semantic predecessor and blocking cadence**

Add exactly one descriptor node:

```json
{
  "id": "semantic-coverage",
  "artifactPaths": [
    "build/assurance-semantic-graph/semantic-graph.json",
    "build/assurance-semantic-graph/SEMANTIC-GRAPH.md"
  ],
  "provenancePath": "build/assurance-semantic-graph/provenance.json",
  "toolPath": "scripts/gen-assurance-semantic-graph.mjs",
  "expectedTool": "semantic-assurance-graph",
  "predecessors": [],
  "externalInputPolicy": { "kind": "forbidden" },
  "evidencePath": "build/assurance-semantic-graph/SEMANTIC-GRAPH.md"
}
```

Make `roadmap-subway` depend on it, require the new exact node set in
`roadmap-evidence.mjs`, add the generator/check to `graph-all.mjs`, and add one
`semantic:coverage` blocking gate to `run-phase-close.mjs`. Do not remove or
rename any existing gate.

- [ ] **Step 4: Run integration and focused Chapter 1-3 tests**

Run the three integration files from Step 2 plus every
`scripts/tests/assurance-*.test.mjs` file through an explicit Node directory
enumeration. Expected: zero failures and zero unexpected skips.

- [ ] **Step 5: Regenerate owners in dependency order**

Run retirement, semantic graph, project/package/KB graphs, dev-tool index,
code index, source-capability inventory, component health, status, pinned SLIDE
and roadmap generators, followed by every owning check. `graph-all --check`
must report 7/7. The roadmap must display the semantic predecessor while
remaining non-authorizing.

- [ ] **Step 6: Run broad closure and update ledgers**

Run the complete package lane, complete tooling lane, generator contracts,
security/path/private-document audits, percentage/roadmap drift and normal
phase-close. Record every refused attempt and the final uninterrupted result.
Update the design, TODO and active roadmap with exact counts, current complete
executable-family denominator and the explicit K3 `0` boundary.

- [ ] **Step 7: Commit Chapter 3 and refresh indexes**

```powershell
git status --short
# Stage only the exact Chapter 3 paths shown by the reviewed status/diff.
git diff --cached --check
git commit -m "docs: close assurance fabric chapter three"
```

Refresh Myco. Retry codebase-memory moderate indexing and require status
`indexed`, nodes close to `expected_nodes`, `indexed_head_sha` equal to the new
commit and a successful query for `evaluateSemanticGraph` and
`deriveSemanticCoverage`. If the service transport remains closed, record the
gap as `UNKNOWN`; never manufacture graph freshness.

## Self-Review

- Spec coverage: semantic graph sections 5-6, the complete source-family chain,
  tests 8-10/16 and the corresponding acceptance criteria map to Tasks 1-4.
- Placeholder scan: every new interface, file, enum, refusal case, command and
  commit boundary is explicit; no deferred implementation blank remains.
- Type consistency: `buildRetirementGraph` supplies the executable-family facts
  consumed by `deriveSemanticCoverage`; that adapter supplies the branded
  `SemanticGraphReport`; the generator publishes the exact artifact consumed by
  `inspectGeneratedEvidence`; the roadmap root receives one additional closed
  predecessor without granting authority.
- Compatibility: existing TypeScript counts and consumers remain available,
  while terminal retirement switches to the complete executable family. The
  old runner remains authoritative and no Chapter 4 cadence/authority switch is
  performed here.
