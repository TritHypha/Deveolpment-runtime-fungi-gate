# VOK Assurance Fabric Chapter 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the governed manifest the only live cadence source, derive complete transitive tool coverage, execute each test obligation once, enforce the legacy-control replacement lifecycle, and switch the public phase-close entry point from its source-coded schedule only after exact differential agreement.

**Architecture:** Preserve the current static runner byte-for-byte as a named legacy oracle. Build a closed cadence planner and manifest executor beside it, publish the complete live manifest, and compare both runners at one Git build point before the public entry point changes. The dev-tool index derives direct and transitive cadence custody from the accepted manifest dependency graph; a separate lifecycle evaluator refuses retirement unless every replacement condition is exact. The new runner remains repository-close evidence only: K3 production/VOK/release authority stays `0`.

**Tech Stack:** Node.js ESM, `node:test`, strict JSON decoding, SHA-256, owned process trees, suite leases, governed JSON manifests, existing assurance result/differential models, Git-index and generated-owner tooling.

## Global Constraints

- Zero trust: missing, stale, ambiguous, duplicated, cyclic, unbounded, platform-inapplicable or non-conserving evidence has a terminal refusal or K3 unknown/deny route.
- `null`, NaN, infinity, sparse arrays, proxies, accessors, surplus fields, shell command strings and ambient analyzer authority are forbidden.
- The manifest is the sole cadence authority after cutover; source scanning may verify the cutover but cannot supply a fallback schedule.
- The current source-coded runner remains an executable legacy oracle. It is renamed, not deleted, until a later admitted retirement decision proves zero live consumers.
- `changed`, `normal`, `nightly`, `exhaustive`, `release` and `on-demand` remain distinct; the existing `phase-close` tier is a compatibility alias for `normal`, not a second authority source.
- A stronger package-test entry may discharge an overlapping weaker obligation only when requirement identity, platform, subject kind and exact subject-set containment are independently proved. Ambiguous overlap refuses; tests are deduplicated, never removed.
- WAT, Wasm and DSS controls remain active. The live Chapter 4 manifest records them as active legacy controls because zero-consumer and admitted-successor evidence is absent.
- Analyzer output cannot express or mint `+1`. A green repository close is a non-production candidate and leaves VOK/release authority K3 `0`.
- The graph is an index, not a warehouse: store tool identities, dependency edges, cadence/lifecycle classifications, counts and digests, not copied tool source or outputs.
- Work remains on `codex/rd-0792-synthesize-only`; commit locally and do not push.

## Execution Order

Execute the task sections in dependency order **1 -> 3 -> 4 -> 2 -> 5**.
Task 2 needs the complete live manifest created by Task 4; running it earlier
would force an ungoverned temporary fallback and is forbidden.

---

### Task 1: Closed Cadence Planner and Obligation Deduplication

**Files:**
- Modify: `governance/phase-close-commands.schema.json`
- Modify: `scripts/lib/assurance-fabric/manifest.mjs`
- Create: `scripts/lib/assurance-fabric/cadence-plan.mjs`
- Modify: `scripts/tests/assurance-manifest.test.mjs`
- Create: `scripts/tests/assurance-cadence-plan.test.mjs`

**Interfaces:**
- Consumes: one branded manifest from `validateAssuranceManifest(value, root)` and `{ cadence, platform }`.
- Produces: `buildCadencePlan(manifest, options) -> { kind: "accepted", value: CadencePlan } | { kind: "refused", code, detail }`.
- `CadencePlan` is branded/frozen and exposes `entries`, `discharged`, `requirements`, `cadence`, `platform`, and `authorizing: false`.
- Each manifest entry adds exact field `satisfies` and replaces the bootstrap command field with a closed `execution` union. `satisfies` is a non-empty unique array of requirement IDs. `execution` is either `{ kind: "process", command }` or `{ kind: "predecessor-receipt", predecessorId, verifierId }`.

- [ ] **Step 1: Write failing closed-schema and planner tests**

Extend `validEntry()` with:

```js
satisfies: ["REQ-ASSURANCE-001"],
execution: { kind: "process", command: ["node", "fixture.mjs"] },
```

Add tests that refuse duplicate `satisfies`, unknown receipt predecessors,
receipt self-reference, an unsupported verifier ID, a platform with no explicit
result, duplicate command identity with incomparable subjects, and a dependency
cycle introduced only through `execution.predecessorId`.

Add the exhaustive containment case:

```js
const result = buildCadencePlan(acceptedManifest([
  packageRunner("tests:core", ["compiler", "core"], ["normal", "exhaustive"]),
  packageRunner("tests:all", ["compiler", "core", "cli"], ["exhaustive"]),
]), { cadence: "exhaustive", platform: process.platform });
assert.equal(result.kind, "accepted");
assert.deepEqual(result.value.entries.map((entry) => entry.id), ["tests:all"]);
assert.deepEqual(result.value.discharged, [{
  requirementId: "REQ-PACKAGE-TESTS",
  subjectId: "compiler",
  executorId: "tests:all",
  overlappedEntryIds: ["tests:core"],
}]);
```

Add a mutant where the stronger entry omits `compiler`; planning must refuse
rather than silently drop `tests:core`.

- [ ] **Step 2: Run planner tests and verify RED**

Run:

```powershell
node --test scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-cadence-plan.test.mjs
```

Expected: fail because the new exact fields and planner do not exist.

- [ ] **Step 3: Extend the manifest without weakening Chapter 1 checks**

Add the exact tagged execution validator and include `satisfies`/`execution` in
`ENTRY_KEYS`. Accept only these receipt verifier identities:

```js
const RECEIPT_VERIFIERS = new Set(["graph-all-semantic-v1"]);
```

Require receipt entries to name an existing predecessor and have no command
field at any level. Process entries alone own the existing bounded command
array. Preserve branding,
deep freezing, path confinement, bounded commands, strict arrays and closed
vocabularies.

- [ ] **Step 4: Implement deterministic planning**

Select the requested cadence, add the complete predecessor closure, filter by
the exact platform, and topologically sort with ordinal UTF-8 byte comparison.
Build obligations as `(requirementId, subjects.kind, subjectId, platform)`.
For one obligation, choose a unique entry whose subject set is a strict or equal
superset of every competing entry and whose lifecycle is not retired. If there
is no unique dominating entry, return `ASSURANCE-CADENCE-OVERLAP`. Receipt-only
entries consume their predecessor result and never launch a second process.

- [ ] **Step 5: Run planner tests and verify GREEN**

Run the command from Step 2. Expected: all tests pass with the omission,
ambiguity, cycle and duplicate-execution mutants red.

- [ ] **Step 6: Commit the planner**

```powershell
git add -- governance/phase-close-commands.schema.json scripts/lib/assurance-fabric/manifest.mjs scripts/lib/assurance-fabric/cadence-plan.mjs scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-cadence-plan.test.mjs
git diff --cached --check
git commit -m "feat: plan closed assurance cadences"
```

### Task 2: Manifest-Derived Transitive Tool Index

**Files:**
- Modify: `scripts/lib/tooling-inventory.mjs`
- Modify: `scripts/dev-tool-index.mjs`
- Modify: `scripts/audit-tooling-contract.mjs`
- Modify: `scripts/tests/tooling-contract.test.mjs`
- Modify: `scripts/tests/dev-tool-index.test.mjs`
- Regenerate: `build/dev-tool-index/index.json`
- Regenerate: `build/dev-tool-index/INDEX.md`

**Interfaces:**
- Consumes: the strict live manifest plus the discovered `scripts/*.mjs|cjs` inventory.
- Produces: `inventory.cadenceCoverage`, one frozen record per tool with `tool`, `directEntryIds`, `transitiveEntryIds`, `via`, `cadences`, `lifecycle`, and `disposition`.
- `disposition` is one of `scheduled`, `self-test-transitive`, `on-demand`, `legacy-active`, or `exception`; absent or conflicting disposition is a violation.

- [ ] **Step 1: Write the nested-orchestrator RED tests**

Create a fixture manifest in which `graph:all` invokes `scripts/graph-all.mjs`
and exact predecessor entries name `scripts/package-graph-generator.mjs` and
`scripts/gen-assurance-semantic-graph.mjs`. Assert that both children are
transitively covered through `graph:all`, even when neither filename appears in
the public runner source. Add hostile fixtures for an unknown predecessor,
multiple incomparable `via` paths, an undeclared nested script, an `on-demand`
tool without policy reason/owner/review date, and a legacy tool labelled
retired without admitted lifecycle evidence.

- [ ] **Step 2: Run tooling tests and verify RED**

Run:

```powershell
node --test scripts/tests/tooling-contract.test.mjs scripts/tests/dev-tool-index.test.mjs
```

Expected: nested tools remain absent because the inventory scans only direct
filename literals in `run-phase-close.mjs`.

- [ ] **Step 3: Replace source-literal cadence discovery**

Decode `governance/phase-close-commands.json` with `parseStrictJsonBytes`,
validate it with `validateAssuranceManifest`, and derive tool nodes and
predecessor edges from the accepted object. A process entry's second
`execution.command`
token is a repository tool only when it is a confined `scripts/*.mjs|cjs`
path. Walk predecessors from each cadence root, retain every distinct `via`
route, and fail if a manifest tool is missing, untracked, a symlink, or not a
regular file. Do not fall back to scanning runner source.

- [ ] **Step 4: Tighten contract coverage**

Change `validateToolingContract()` so every audit/lint tool has exactly one
manifest-derived disposition or one still-valid policy exception. Preserve the
existing fail-closed self-test meta-gate, but record it as an explicit
`self-test-transitive` edge rather than treating source text as cadence custody.

- [ ] **Step 5: Run focused tests, regenerate, and commit**

```powershell
node --test scripts/tests/tooling-contract.test.mjs scripts/tests/dev-tool-index.test.mjs scripts/tests/dev-tools-scripts.test.mjs
node scripts/dev-tool-index.mjs
node scripts/dev-tool-index.mjs --check
node scripts/audit-tooling-contract.mjs
git add -- scripts/lib/tooling-inventory.mjs scripts/dev-tool-index.mjs scripts/audit-tooling-contract.mjs scripts/tests/tooling-contract.test.mjs scripts/tests/dev-tool-index.test.mjs scripts/tests/dev-tools-scripts.test.mjs build/dev-tool-index
git diff --cached --check
git commit -m "feat: index transitive cadence custody"
```

### Task 3: Legacy-Control Replacement and Retirement Gate

**Files:**
- Create: `scripts/lib/assurance-fabric/legacy-lifecycle.mjs`
- Create: `scripts/audit-assurance-legacy-lifecycle.mjs`
- Create: `scripts/tests/assurance-legacy-lifecycle.test.mjs`
- Modify: `governance/phase-close-commands.schema.json`
- Modify: `scripts/lib/assurance-fabric/manifest.mjs`
- Modify: `scripts/tests/assurance-manifest.test.mjs`

**Interfaces:**
- Consumes: an accepted manifest, transitive tool inventory, semantic coverage report, executable-family retirement report and evidence DAG.
- Produces: `evaluateLegacyLifecycle(inputs) -> { kind: "accepted", controls, authorizing: false } | { kind: "refused", code, controlId, detail }`.
- `lifecycle.evidence` is exact tagged state: `{ kind: "absent", reason }` or `{ kind: "present", consumerCount, successorId, invariantIds, negativeTestIds, mutationTestIds, replacesEdgeId, retirementGateId, historicalEvidenceId }`.

- [ ] **Step 1: Write premature-retirement RED tests**

Build fixtures for active `wat`, `wasm` and `dss` legacy-oracle entries. Mutate
each independently to `retired` while retaining one transitive consumer and
assert refusal. Add independent mutants for zero consumers but absent successor,
missing invariant coverage, missing negative test, missing mutation test,
missing `REPLACES` edge, non-green retirement gate and historical evidence that
still claims live authority.

The admitted fixture requires every field and remains non-authorizing:

```js
assert.deepEqual(result.controls.map((item) => item.state), [
  "ACTIVE_LEGACY", "ACTIVE_LEGACY", "ACTIVE_LEGACY",
]);
assert.equal(result.authorizing, false);
```

- [ ] **Step 2: Run lifecycle tests and verify RED**

Run:

```powershell
node --test scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-legacy-lifecycle.test.mjs
```

Expected: fail because retirement evidence is not represented or evaluated.

- [ ] **Step 3: Implement the exact lifecycle evaluator**

For `active` and `shadow`, report the state without granting removal. For
`retirement-candidate` and `retired`, require all seven design conditions:
exact zero consumers; an active admitted successor; complete invariant IDs;
non-empty negative and mutation evidence; a real semantic `REPLACES` edge; a
current independent retirement gate; and reproducible historical evidence with
`authorizing: false`. Any missing or contradictory fact refuses.

- [ ] **Step 4: Prepare the blocking audit and keep live legacy controls active**

The CLI accepts only `--root` and `--self-test`. It reads owner artifacts
without writing them, emits no private paths, and exits non-zero on refusal.
Task 4 registers it in the live manifest for normal through release cadences.
The Task 4 WAT/Wasm/DSS entries use `retirement: "active"` and absent evidence
reasons that name their remaining bootstrap/differential/oracle consumers.

- [ ] **Step 5: Run focused lifecycle verification and commit**

```powershell
node --test scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-legacy-lifecycle.test.mjs
node scripts/audit-assurance-legacy-lifecycle.mjs --self-test
node scripts/audit-assurance-legacy-lifecycle.mjs --root .
git add -- governance/phase-close-commands.schema.json scripts/lib/assurance-fabric/manifest.mjs scripts/lib/assurance-fabric/legacy-lifecycle.mjs scripts/audit-assurance-legacy-lifecycle.mjs scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-legacy-lifecycle.test.mjs
git diff --cached --check
git commit -m "feat: enforce legacy control lifecycle"
```

### Task 4: Complete Live Manifest and Manifest-Only Runner

**Files:**
- Create: `governance/phase-close-commands.json`
- Create: `scripts/run-phase-close-legacy.mjs`
- Modify: `scripts/run-phase-close.mjs`
- Create: `scripts/lib/assurance-fabric/cadence-runner.mjs`
- Modify: `scripts/run-assurance-shadow.mjs`
- Modify: `scripts/tests/run-phase-close.test.mjs`
- Modify: `scripts/tests/run-assurance-shadow.test.mjs`
- Modify: `scripts/tests/dev-tools-scripts.test.mjs`

**Interfaces:**
- `runCadencePlan(plan, context) -> CadenceRunReport`, where every entry result uses the existing branded result model and includes exact process-control evidence.
- `run-phase-close.mjs --cadence <changed|normal|nightly|exhaustive|release|on-demand> [--report-only] [--json] [--root <path>]` is the public manifest-only entry point.
- `--tier phase-close|exhaustive` remains a deprecated exact alias to `normal|exhaustive`; supplying both refuses.
- `run-phase-close-legacy.mjs` retains the previous static schedule and accepts only its old interface for differential/oracle use.

- [ ] **Step 1: Freeze the legacy runner and write cutover RED tests**

Copy the current tracked `run-phase-close.mjs` bytes to
`run-phase-close-legacy.mjs` before changing the public runner. Add tests that
prove the public runner refuses a missing, malformed, duplicate-key, cyclic or
surplus-field manifest and does not execute any child. Assert that its source
contains no static `run("gate-name", ...)` cadence list and no missing-manifest
fallback. Assert the legacy runner still exposes the exact former 91-gate
normal schedule.

- [ ] **Step 2: Publish the complete governed manifest**

Translate every current normal gate and the exhaustive all-package gate into
one exact entry. Preserve command, cwd, timeout, generated-output mutation,
platform and outcome behavior. Give all-package testing the same package-test
requirement and all 100 package subjects so the planner discharges the smaller
core package-test obligation once at exhaustive cadence. Model
`semantic:coverage` as `predecessor-receipt` over `graph:all` with verifier
`graph-all-semantic-v1`, so semantic generation executes exactly once.

Every entry must appear in at least one cadence; explicit `on-demand` and
legacy exclusions carry lifecycle evidence and an owner/review reason through
the governed tooling policy. The manifest includes the new blocking legacy
lifecycle audit and retains all existing security, private-document, path,
generator, Golden, graph, registry, tooling and governance-diff gates.

- [ ] **Step 3: Implement the manifest-only executor**

Strict-decode and validate the manifest, call `buildCadencePlan`, acquire the
existing suite lease, and execute only branded plan entries through
`runOwnedProcessSync`. Analyzer environments use the Chapter 1 allow-list and
cannot inherit secrets or suite authority unless the exact entry is the owned
all-test runner. Receipt-only entries verify their predecessor's bounded stdout
inside the private host and launch no process. A zero exit remains a
`LEGACY_EXIT` observation until the host independently checks subject count,
outcome policy and required receipt shape.

The report exposes typed tags and separate conceptual Tri-1 coordinates. It may
state repository-close success, but must use `authorizing: false` and
`releaseVerdict: "UNKNOWN"`; no phase-close report mints VOK or production
authority.

- [ ] **Step 4: Repoint differential comparison**

`run-assurance-shadow.mjs` runs `run-phase-close-legacy.mjs` as the old side and
the manifest planner/executor as the candidate side at one exact Git head. Add
small, unlinked hostile tests for missing candidate IDs, candidate-only IDs,
subject-count changes, process-control changes, duplicate execution and one
legacy/candidate command difference. Agreement remains
`SHADOW_AGREEMENT_NON_AUTHORIZING`.

- [ ] **Step 5: Run focused cutover verification**

```powershell
node --test scripts/tests/assurance-manifest.test.mjs scripts/tests/assurance-cadence-plan.test.mjs scripts/tests/run-phase-close.test.mjs scripts/tests/run-assurance-shadow.test.mjs scripts/tests/assurance-legacy-lifecycle.test.mjs scripts/tests/tooling-contract.test.mjs scripts/tests/dev-tool-index.test.mjs scripts/tests/dev-tools-scripts.test.mjs
node scripts/run-assurance-shadow.mjs --root . --manifest governance/phase-close-commands.json --cadence normal --json
```

Expected: all focused tests pass; the real differential report is exact
agreement and `authorizing: false`. Any mismatch blocks the cutover and the
public entry point remains the legacy runner until repaired.

- [ ] **Step 6: Commit the manifest cutover**

```powershell
git add -- governance/phase-close-commands.json scripts/run-phase-close-legacy.mjs scripts/run-phase-close.mjs scripts/lib/assurance-fabric/cadence-runner.mjs scripts/run-assurance-shadow.mjs scripts/tests/run-phase-close.test.mjs scripts/tests/run-assurance-shadow.test.mjs scripts/tests/dev-tools-scripts.test.mjs
git diff --cached --check
git commit -m "feat: switch phase close to governed manifest"
```

### Task 5: Chapter 4 Evidence, Documentation and Terminal Close

**Files:**
- Modify: `governance/generator-policy.json` when an owner artifact set changes
- Modify: `docs/superpowers/specs/2026-08-10-zero-trust-assurance-fabric-design.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: `build/dev-tool-index/*`
- Regenerate: `build/code-index/*`
- Regenerate: `build/assurance-semantic-graph/*`
- Regenerate: `build/component-health/*`
- Regenerate: all other owner-declared outputs changed by Tasks 1-4

**Interfaces:**
- Consumes: Tasks 1-4 and all Chapter 1-3 owner evidence.
- Produces: one reviewed Chapter 4 checkpoint with manifest-only cadence custody, exact differential agreement, active legacy controls, no duplicate package obligation, current owner outputs and K3 release/VOK authority `0`.

- [ ] **Step 1: Run the complete focused assurance surface**

Enumerate every tracked `scripts/tests/assurance-*.test.mjs` file through a
bounded explicit directory read and run them with `node --test`. Run the runner,
tooling, generator-contract, roadmap, retirement and semantic tests. Require
zero failures and zero unexpected skips.

- [ ] **Step 2: Regenerate owners in dependency order**

Run retirement, semantic graph, package/project/KB graphs, dev-tool index, code
index, Fungi capability inventory, Golden Pack, percentage evidence, status,
pinned SLIDE and roadmap/subway owners, followed by each `--check`. Use the
manifest-derived graph umbrella; require its exact seven children and current
semantic receipt.

- [ ] **Step 3: Prove cadence shape and non-duplication**

Run `changed`, `normal`, `nightly`, `exhaustive` and report-only `release`
planning. Do not execute release-only external/platform authority when inputs
are absent; require an explicit `UNKNOWN`/refusal. Execute normal and exhaustive
once each. The exhaustive receipt must show the complete all-package runner and
must not also execute the overlapping core package test obligation.

- [ ] **Step 4: Run terminal repository closure**

Run the complete package lane, complete tooling lane, all graph/audit/index
checks and one uninterrupted manifest-driven normal phase-close with captured
exit status and log. Preserve refused attempts as negative evidence. Only a
terminal exit `0` with every blocking row current may close Chapter 4.

- [ ] **Step 5: Update the binding ledgers and roadmaps**

Add a Chapter 4 checkpoint to the design, a new first dated section to
`docs/TODO.md`, and the current checkpoint to the active roadmap. Record exact
counts, the old/new differential result, transitive tool coverage, deduplicated
obligation count, WAT/Wasm/DSS active lifecycle, legacy-oracle custody and the
explicit statement that VOK/release authority remains K3 `0`. Regenerate
`build/component-health/roadmap-subway.svg` through its owner; do not hand-edit
generated regions.

- [ ] **Step 6: Review, commit and refresh indexes**

Run an independent requirements and security review of the complete Chapter 4
diff. Fix every Critical/Important finding with TDD before closure. Stage only
reviewed Chapter 4 and owner-output paths, run `git diff --cached --check`, and
commit locally without pushing.

Refresh Myco. Retry codebase-memory moderate indexing and require `status` =
`indexed`, `nodes` close to `expected_nodes`, `indexed_head_sha` equal to final
HEAD, `stale: false`, and a graph query for `buildCadencePlan`,
`evaluateLegacyLifecycle` and `runCadencePlan`. If transport remains closed,
record codebase-memory freshness as `UNKNOWN`; never substitute the displayed
Git head for index proof.

## Self-Review

- Spec coverage: cadence scheduler, transitive tool indexing, typed result and terminal exits, duplicate exhaustive planning, legacy WAT/Wasm/DSS lifecycle, source-fallback removal, differential parity and the full-close gate map to Tasks 1-5.
- Placeholder scan: the plan names exact files, interfaces, tagged states, refusal mutants, commands, owner order and commit boundaries; it contains no deferred implementation blank.
- Type consistency: the branded manifest feeds `buildCadencePlan`; the plan feeds `runCadencePlan`; its receipts feed the differential runner; the same manifest graph feeds tooling custody and legacy lifecycle.
- Authority consistency: the public schedule switches only after agreement, the legacy runner remains a named oracle, active controls are not retired, generated evidence remains non-authorizing, and VOK/release authority remains K3 `0`.
- Compatibility: `--tier phase-close|exhaustive` is retained as a closed alias, while every real cadence decision comes from the governed manifest.
