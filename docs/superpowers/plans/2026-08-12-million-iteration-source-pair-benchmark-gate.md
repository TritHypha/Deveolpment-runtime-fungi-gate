# Million-Iteration Source-Pair Benchmark Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the existing checked-versus-verified million-iteration benchmark to the two exact `.fungi` source files and refuse semantic or identity drift.

**Architecture:** A benchmark-owned exact manifest names and hashes the checked and verified source subjects. A focused verifier reads bounded regular files, runs the live compiler gates, proves their closed role split and executable-body equivalence, and returns a frozen non-authorizing receipt. The existing benchmark runner and audit consume that receipt without creating another benchmark group.

**Tech Stack:** Node.js ESM, `node:test`, Galerina compiler `dist` APIs, SHA-256, existing benchmark adapter/report tooling.

## Global Constraints

- Keep one `verified-native-operation` benchmark group; do not inflate coverage.
- Checked means permission absent, candidate `false`, K3 `-1`.
- Verified means permission present, candidate `true`, K3 `0`.
- Both lanes remain `referenceOnly: true` and `authorityReleased: false`.
- No source syntax, SLIDE measurement or production authority changes.
- Refuse unknown, proxy, accessor, inherited, symlinked, missing, surplus or digest-mismatched input.
- Do not run crash-linked full tooling, normal phase-close, graph-all or the monolithic memory evaluator.

---

### Task 1: Exact source-pair manifest and verifier

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/contracts/million-iteration-source-pair-v1.json`
- Create: `packages-galerina/galerina-devtools-benchmarks/src/million-iteration-source-pair.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/million-iteration-source-pair.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`

**Interfaces:**
- Produces: `verifyMillionIterationSourcePair({ repositoryRoot, manifestPath }): Promise<Readonly<Receipt>>`
- Receipt fields: exact schema, verdict `1`, status `VERIFIED_NON_AUTHORIZING`, both subject paths/digests/roles, `referenceOnly: true`, `authorityReleased: false`.

- [ ] **Step 1: Write the failing identity and role test**

```js
test("binds the exact checked and verified million-iteration sources", async () => {
  const receipt = await verifyMillionIterationSourcePair({ repositoryRoot, manifestPath });
  assert.equal(receipt.verdict, 1);
  assert.deepEqual(receipt.subjects.map(({ role, path }) => [role, path]), [
    ["CHECKED_PERMISSION_ABSENT", "docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi"],
    ["VERIFIED_PERMISSION_PRESENT", "docs/examples/VERIFIED-MILLION-ITERATION-LOOP.fungi"],
  ]);
  assert.equal(receipt.referenceOnly, true);
  assert.equal(receipt.authorityReleased, false);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `node --test test/million-iteration-source-pair.test.mjs`

Expected: module/function missing; the test must not fail because a fixture path is wrong.

- [ ] **Step 3: Add the exact manifest**

Use schema `galerina.benchmark.million-iteration-source-pair.v1`, repository-relative forward-slash paths, lowercase SHA-256 digests, exact roles, flow `readMillionValues`, iterations `1000000`, result `999999`, and `authorityReleased: false`.

- [ ] **Step 4: Implement closed reading and compiler verification**

The verifier must:

```js
const parsed = parseProgram(source, sourcePath, { requireVersionHeader: true });
const effects = checkEffects(parsed.flows, parsed.ast);
const proposal = analyzeMillionReadLoopEnvelope(parsed.ast, "readMillionValues");
```

Require zero production errors from parse, type, value-state, effect and governance gates. Require the exact candidate/verdict/failure ID for each role. Compare the parsed flow name, parameter types, return type and executable body with `assert`-equivalent deep canonical data inside the verifier; return refusal on any mismatch.

- [ ] **Step 5: Add hostile manifest and source tests**

Cover role swap, wrong digest, extra/missing subject, inherited/accessor/proxy manifest, changed permission, changed loop body, wrong bound and symlink/non-regular source. Every hostile input returns verdict `-1` without authority.

- [ ] **Step 6: Run focused GREEN**

Run: `node --test test/million-iteration-source-pair.test.mjs`

Expected: all tests pass with zero skips.

- [ ] **Step 7: Commit Task 1**

```powershell
git add -- packages-galerina/galerina-devtools-benchmarks/contracts/million-iteration-source-pair-v1.json packages-galerina/galerina-devtools-benchmarks/src/million-iteration-source-pair.mjs packages-galerina/galerina-devtools-benchmarks/test/million-iteration-source-pair.test.mjs packages-galerina/galerina-devtools-benchmarks/package.json
git commit -m "feat: bind million-iteration benchmark source pair"
```

### Task 2: Benchmark and audit integration

**Files:**
- Modify: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/bench-slide-reference.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/runner.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/audit.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/verified-native-operation-report.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-integration.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-report.test.mjs`

**Interfaces:**
- Consumes: `verifyMillionIterationSourcePair(...)` from Task 1.
- Produces: one benchmark observation carrying a frozen `sourcePair` receipt; audit and report must refuse its absence or mutation.

- [ ] **Step 1: Write failing integration tests**

Assert that the real runner result contains both exact filenames/digests, and that report rendering names `CHECKED-MILLION-ITERATION-LOOP.fungi` and `VERIFIED-MILLION-ITERATION-LOOP.fungi`. Assert that a missing or authority-bearing receipt refuses.

- [ ] **Step 2: Run integration tests and confirm RED**

Run: `node --test test/verified-native-operation-integration.test.mjs test/verified-native-operation-report.test.mjs`

Expected: source-pair receipt/report fields are absent.

- [ ] **Step 3: Gate benchmark admission**

Run the source-pair verifier before `admitVerifiedNativeOperationEvidence`. If its verdict is not `1`, return a benchmark refusal. On success, attach only the frozen receipt to the existing observation; do not create a third runtime lane.

- [ ] **Step 4: Gate package audit and render exact subjects**

The audit independently reruns the verifier. The focused Markdown/SVG names both source subjects and states that checked is permission absent while verified is permission present, K3 `0`, reference-only and non-authorizing.

- [ ] **Step 5: Run focused GREEN**

Run: `node --test test/million-iteration-source-pair.test.mjs test/verified-native-operation-integration.test.mjs test/verified-native-operation-report.test.mjs`

Expected: all tests pass with zero skips.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/bench-slide-reference.mjs packages-galerina/galerina-devtools-benchmarks/src/runner.mjs packages-galerina/galerina-devtools-benchmarks/src/audit.mjs packages-galerina/galerina-devtools-benchmarks/src/verified-native-operation-report.mjs packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-integration.test.mjs packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-report.test.mjs
git commit -m "feat: audit checked and verified million-loop subjects"
```

### Task 3: Publication and bounded closure

**Files:**
- Modify generated benchmark outputs under `packages-galerina/galerina-devtools-benchmarks/results/`
- Modify: `docs/examples/VERIFIED-NATIVE-OPERATION-BOUNDARY.md`
- Modify: `docs/TODO.md`
- Modify generated project graph owner: `build/graph/Galerina_GRAPH_REPORT.md`

**Interfaces:**
- Consumes: source-pair receipt and renderer from Tasks 1-2.
- Produces: current focused benchmark report/chart and a documented completed check without production authority.

- [ ] **Step 1: Regenerate focused verified-native-operation output**

Run the existing focused runner and report owner. Do not rerun the unrelated full 18-group benchmark unless its registered stale check requires it.

- [ ] **Step 2: Run bounded verification**

```powershell
node --test test/*.test.mjs
npm run audit
node src/audit-benchmark-integrity.mjs --stale-only --json
```

Expected: zero failures, source-pair audit admitted, existing reference authority remains false.

- [ ] **Step 3: Update boundary documentation and TODO**

Record that both exact files are now bound into the benchmark check. Retain the distinction between frontend proof, reference measurement and production authority.

- [ ] **Step 4: Refresh the documented project graph owner**

Run: `node packages-galerina/galerina-core-cli/dist/index.js graph --out build/graph`

- [ ] **Step 5: Commit generated evidence and docs**

Stage only the focused report/chart, boundary doc, TODO and registered graph output. Commit with `chore: publish million-iteration source-pair check`.

- [ ] **Step 6: Re-index and verify custody**

Index the Galerina repository in moderate mode. Require `nodes == expected_nodes`, `edges == expected_edges`, and a graph lookup for `verifyMillionIterationSourcePair`. If the indexed head does not advance because the last commit is documentation/generated-only, report the exact code buildpoint rather than claiming freshness.
