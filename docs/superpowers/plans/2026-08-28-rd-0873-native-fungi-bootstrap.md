# RD-0873 Native Fungi Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the corpus and conversion evidence foundations, then admit one bounded Galerina-native scalar `.fungi` conversion slice without widening product, profile or production authority.

**Architecture:** Reuse the existing AGENTS audit-map and bounded-tool-batch owners for approved read-only parallel work. Galerina owns deterministic corpus shards, exact-scope conversion receipts, queue regeneration, native source, semantic/GIR comparison and terminal evidence. Writers and final aggregation remain sequential.

**Tech Stack:** Node.js ESM, `node:test`, TypeScript 5.9.3, Galerina `.fungi`, canonical JSON, SHA-256, Git, Myco, Hypha, Code Logic Workbench and codebase-memory.

**Spec:** `docs/superpowers/specs/2026-08-28-rd-0873-native-fungi-bootstrap-design.md`

## Execution checkpoint - 2026-08-30

The task checkboxes below remain the plan's historical authoring record; current
state is governed by the first RD-0873 section in `docs/TODO.md` and the
restart-grade handover. The implementation branch is published through
`e77598e4f03b4181d3a26fd258bf682c2becddce`.

Tasks 2-5 have committed implementation evidence: the protected corpus completed
16/16 terminal shards over 2,719 files with zero unprocessed files; queue v3
classified 1,581/1,581 executable paths and retained seven scoped candidates;
conversion closure and queue phase-close authority were hardened; and focused
phase-close wiring verification passed 119/119 with independent Critical 0 /
Important 0 review.

Task 6 is **HOLD**, not started or approved. The provisional candidate is
`packages-ts/galerina-core-config/src/index.ts#isEnvironmentMode`; no target
`.fungi` source exists. The native graph cannot be translated into Workbench v1
without inventing semantics. The independently reviewed source-origin design is
owned by AGENTS at
`<AGENTS_ROOT>/docs/superpowers/specs/2026-08-30-galerina-source-origin-logic-aig-design.md`
on commit `0fcbcb8b5` and remains `Proposed for owner review`.

Before modifying Task 6 below, obtain owner approval of that design and write a
separate cross-repository implementation plan. The repaired Task 6 must require
the atomic `galerina-source-origin` gateway, one complete exact-head PROJECT
parent before WORKSET, exact unresolved-row intersection by `sourceNodeId`, a
digest-bound `ZERO_APPLICABLE` obligation and `REFUSE` as a hard stop. Task 7
remains closed until a separate selection artifact records
`candidateState: NOT_AUTHORED` and passes independent review.

## Global Constraints

- Work in isolated branches/worktrees; preserve the owner-visible process-root checkout.
- The KB stays on `main`; create no KB topic branch.
- Keep one semantic Trit in `{−1, 0, +1}` and physical profile `1` for this chapter.
- Every source and tool path is repository-relative in committed artifacts.
- Every branch, timeout, cancellation, crash and refusal has one terminal exit.
- No shell strings, ambient compiler, unbounded child, unbounded output or silent retry.
- Default read-only audit concurrency is two; maximum is four; writers are exclusive.
- Myco, Hypha, graph/index writers, complete estates and Git effects remain sequential.
- Preserve historical receipts; supersede living claims instead of rewriting dated evidence.
- No profile `64`/`256`, compatibility `32`, Trametes, `.gate`, TypeScript retirement, VOK authority, production admission or release.

---

### Task 1: Close the documentation and RD planning checkpoint

**Files:**
- Create: `docs/superpowers/specs/2026-08-28-rd-0873-native-fungi-bootstrap-design.md`
- Create: `docs/superpowers/plans/2026-08-28-rd-0873-native-fungi-bootstrap.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Create in KB main: `private/research/rd/RD-0873-native-fungi-bootstrap-and-bounded-parallel-assurance-PRIVATE.md`

**Interfaces:**
- Consumes: exact process-root HEAD, RD-0863, the completed scalar-oracle receipts and current `93/96` phase-close evidence.
- Produces: one current plan locator and one private RD authority record; no native-source authority.

- [x] **Step 1: Verify exact custody**

Record Galerina branch, HEAD, tree, staged/tracked/untracked state and every registered worktree. Record KB `main`, HEAD and dirt. Refuse an overlapping owner or non-main KB checkout.

- [x] **Step 2: Validate the documentation pair**

Require the spec and plan to agree on the three blockers, package roots, profile order, parallel lanes, exclusive barriers and completion-state names.

- [x] **Step 3: Write the private RD on KB main**

Use RD-0873 because exact retained Git refs reserve RD-0864 through RD-0872. End the record with the required house-verdict table. The record grants planning authority only.

- [x] **Step 4: Refresh KB metadata and navigation**

Run the KB session-close generation sequence in `tools/README.md` sequentially. Preserve any path, encoding, link or memory refusal; do not push through red.

- [x] **Step 5: Commit exact documentation paths**

Commit the KB RD and generated KB indexes with explicit pathspecs on KB `main`. Commit the Galerina spec, plan, TODO, roadmap and required generated documentation outputs separately on the planning branch.

### Task 2: Define Corpus Audit v2 receipts and deterministic shards

**Files:**
- Create: `scripts/lib/fungi-corpus-receipt.mjs`
- Create: `scripts/tests/fungi-corpus-receipt.test.mjs`
- Create: `scripts/lib/fungi-corpus-shards.mjs`
- Create: `scripts/tests/fungi-corpus-shards.test.mjs`

**Interfaces:**
- Produces: `validateCorpusRequest`, `validateShardReceipt`, `aggregateCorpusReceipts`, `deriveCorpusShards`.
- Receipt status: `PASS | FINDING | REFUSED`; higher-level incomplete coverage maps to `HOLD`.

- [ ] **Step 1: Write closed-schema RED controls**

Use this exact request identity:

```js
{
  schema: "galerina.fungi-corpus-request.v2",
  profile: "WORKSET",
  productId: "galerina",
  repositoryHead: "0".repeat(40),
  repositoryTree: "1".repeat(40),
  compilerDigest: `sha256:${"a".repeat(64)}`,
  fileSetDigest: `sha256:${"b".repeat(64)}`,
  shardCount: 1,
  files: [{
    path: "packages/fungi/products/galerina/fixture/fixture.fungi",
    digest: `sha256:${"c".repeat(64)}`,
    expectationDigest: `sha256:${"d".repeat(64)}`,
    mode: "plain"
  }]
}
```

Add one-field neighbours for unknown keys, duplicate/case aliases, unsorted files, repeated paths, wrong product/profile, zero bounds, absolute/traversal paths and stale identities.

- [ ] **Step 2: Prove RED capability**

Run:

```powershell
node --test scripts/tests/fungi-corpus-receipt.test.mjs scripts/tests/fungi-corpus-shards.test.mjs
```

Expected: non-zero because both modules are absent, while the fixtures themselves parse.

- [ ] **Step 3: Implement canonical validation and partitioning**

Partition the lexically ordered file array into at most the admitted shard count without overlap or omission. Bind each shard ID, range, request digest and positive file/byte/time/output ceilings. Reject accessors, Proxies, symbols, non-NFC strings and unsafe integers.

- [ ] **Step 4: Verify GREEN and mutations**

Run the two focused tests. Mutate file ordering, one digest, one range boundary and one terminal status; each mutation must turn a permanent test red.

- [ ] **Step 5: Commit the four exact paths**

Inspect the staged list and commit `feat: define resumable Fungi corpus receipts`.

### Task 3: Implement isolated corpus shard execution

**Files:**
- Modify: `scripts/audit-fungi-corpus-check.mjs`
- Modify: `scripts/tests/fungi-corpus-ownership.test.mjs`
- Create: `scripts/tests/fungi-corpus-shard-execution.test.mjs`
- Modify: `governance/phase-close-commands.json`

**Interfaces:**
- Consumes: the Task 2 request/shard contracts.
- Produces: `runCorpusShard` and `runCorpusAggregate`; no source or shared-cache write.

- [ ] **Step 1: Add execution RED controls**

Cover content-digest cache identity, disjoint shards, exact stderr/stdout bounds, timeout, cancellation, crash, output overflow, missing result, changed compiler, changed HEAD and sequential/parallel digest parity.

- [ ] **Step 2: Prove the current failure shape**

Run the focused corpus suites and a fixture whose final worker exceeds its deadline. Expected: current code lacks a terminal shard receipt or resumable aggregate.

- [ ] **Step 3: Replace time/size authority with exact digests**

Retain size/time only as non-authorizing hints. Read each tracked direct regular file under held identity, hash admitted bytes, execute the strict checker under one shard deadline and emit a receipt even when unfinished.

- [ ] **Step 4: Add deterministic aggregation and resume**

Accept prior receipts only when request, file-set, compiler, HEAD and shard identities match exactly. Missing or foreign receipts return `HOLD`. Emit ordered result digests without source or diagnostic bodies.

- [ ] **Step 5: Run focused GREEN and controlled mutations**

Require identical result digests for concurrency one and two. Mutate the shard count, cache content digest and timeout mapping; each must produce a focused failure.

- [ ] **Step 6: Commit the four exact paths**

Commit `feat: make the Fungi corpus audit resumable`.

### Task 4: Admit bounded parallel execution through AGENTS

**Files:**
- Create: `governance/rd0873-native-fungi-audit-map.json`
- Create: `scripts/tests/rd0873-native-fungi-audit-map.test.mjs`
- Modify: `governance/tooling-policy.json` only if Galerina requires a declared external-owner locator.

**Interfaces:**
- Consumes: canonical AGENTS `audit-map.mjs` and `bounded-tool-batch.mjs` supplied through `AGENTS_ROOT`.
- Produces: one exact-head approved audit DAG; does not copy or modify AGENTS tools.

- [ ] **Step 1: Write the manifest RED controls**

Declare disjoint corpus shard tasks as `parallel-read`, static snippet checks as `snapshot-read`, and generated-state/final checks as `exclusive` barriers. Assert default concurrency two, hard ceiling four and exact per-node timeout/output/exit algebra.

- [ ] **Step 2: Prove refusal of unsafe overlap**

Fixtures must refuse Myco refresh, graph/index writers, Git commands, shared `dist` writers, shell strings, missing bounds, cyclic dependencies and an unlisted tool.

- [ ] **Step 3: Validate through the canonical AGENTS owner**

Run the AGENTS tool self-tests, then check and draw the exact manifest. An unavailable, stale or wrong AGENTS owner is `REFUSED`, not a sequential fallback claim.

- [ ] **Step 4: Prove semantic parity**

Run the same approved fixture once normally and once with `--sequential`. Require identical ordered task outcomes and output digests; record elapsed time as measurement only.

- [ ] **Step 5: Commit exact Galerina paths**

Commit `test: bind RD-0873 bounded audit execution`.

### Task 5: Close conversion queue and receipt scope

**Files:**
- Modify: `scripts/conversion-queue.mjs`
- Modify: `scripts/tests/conversion-queue.test.mjs`
- Modify: `scripts/audit-conversion-slice-close.mjs`
- Modify: `scripts/tests/audit-conversion-slice-close.test.mjs`
- Modify: `scripts/lib/bounded-closure-receipt.mjs`
- Modify: `scripts/tests/bounded-closure-receipt.test.mjs`

**Interfaces:**
- Produces: conversion queue schema v3 and `galerina.conversion-slice-receipt.v2`.
- Consumes: exact retirement ledger, decisions and Task 2 PROJECT corpus receipt.

- [ ] **Step 1: Add exact-scope RED controls**

Require product/package/file/symbol scope, source HEAD/tree/content digest, target locator/candidate digest, plan/RD digests, scalar profile, ordered gate evidence and exclusions. Replaying any historical scope-less receipt must refuse.

- [ ] **Step 2: Regenerate the current queue under RED**

Run queue check at the exact branch HEAD. Expected: stale generated bytes or the old schema fails without changing historical receipts.

- [ ] **Step 3: Implement minimal schema upgrades**

Conserve every executable path exactly once. Reject unknown, duplicate, reordered, unscoped, bootstrap-floor-overriding or product-mismatched decisions. Bind the PROJECT corpus receipt digest.

- [ ] **Step 4: Verify GREEN and permanent red capability**

Run all three focused suites. Mutate source scope, candidate scope, one required gate and one exclusion; each must fail.

- [ ] **Step 5: Commit source and regenerated queue separately**

Commit code/tests first. Regenerate queue artifacts deterministically and commit only their declared outputs in a second exact-path commit.

### Task 6: Select and approve the first post-oracle slice

**Files:**
- Create: `docs/reports/rd-0873-first-native-slice-selection.md`
- Modify: `governance/conversion-decisions.json` through its owning generator or exact schema route.

**Interfaces:**
- Consumes: fresh code graph, queue v3, corpus PROJECT PASS, Myco, Hypha and Code Logic Workbench receipts.
- Produces: one product-specific exact file/symbol scope; no source change.

- [ ] **Step 1: Query structural owners**

Use codebase-memory first for call/data-flow and package boundaries. Use Myco for exact locators, Hypha for passive gaps and Code Logic Workbench for the scoped logic view. Require worktree/branch/HEAD in every receipt.

- [ ] **Step 2: Apply the closed selection filters**

Reject platform/host effects, bootstrap-floor ownership, unbounded loops/recursion, ambiguous exits, unresolved dependencies, cross-product policy and a slice too large for one review unit.

- [ ] **Step 3: Record one selected scope and controls**

The report names exact locators, symbols, input/output/effect/exit contracts, reference evidence, risk controls and rejection reasons for near neighbours. It stores no source body.

- [ ] **Step 4: Obtain independent plan review**

Require independent Critical 0 / Important 0 review plus a model-diverse multi-vector challenge covering authority, semantics, exits, lifecycle and assurance. External advice remains non-authorizing.

- [ ] **Step 5: Commit the selection evidence**

Commit only the report and exact decision artifact with `docs: select RD-0873 native slice`.

### Task 7: Author one scalar Galerina-native slice

**Files:**
- Create: `packages/fungi/products/galerina/rd0873-first-native-slice/slice.fungi`
- Create: `packages/fungi/products/galerina/rd0873-first-native-slice/slice.checked.json`
- Create: `packages-ts/galerina-core-compiler/tests/rd0873-first-native-slice.test.mjs`
- Modify only exact registry/artifact owners proved necessary by Task 6.

**Interfaces:**
- Consumes: approved Task 6 scope and writing-fungi/translating-typescript-to-fungi skill contracts.
- Produces: one native scalar implementation and non-authorizing artifact evidence.

- [ ] **Step 1: Write semantic and exit RED controls**

Assert every declared input class reaches exactly one allow, ambiguous, deny, typed error, cancellation or timeout exit. Add source/reference semantic and GIR comparisons before source creation.

- [ ] **Step 2: Prove RED**

Run only the new focused tests. Expected: missing native package/symbol failures, not setup or locator errors.

- [ ] **Step 3: Write the smallest native source**

Use `@version 1`, exact value/effect contracts and explicit terminal paths. Add no general framework, compatibility alias, packed-width type, ambient host effect or fallback.

- [ ] **Step 4: Bind product and artifact identity**

Require explicit `galerina`, scalar `1`, source/GIR digest, policy digest and build mode. Unknown or omitted values refuse before execution.

- [ ] **Step 5: Verify focused GREEN and mutations**

Mutate each exit, product, profile, semantic digest and effect declaration. Each mutation must turn an exact test red.

- [ ] **Step 6: Commit one reviewable native slice**

Commit only the approved package, tests and necessary registry/artifact paths.

### Task 8: Sequential assurance and exact-head closure

**Files:**
- Create: `docs/reports/rd-0873-native-fungi-assurance.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Regenerate only declared graph/index/registry outputs.

**Interfaces:**
- Consumes: Tasks 2-7 at one frozen commit.
- Produces: exact build-point evidence and a defensible PASS or HOLD.

- [ ] **Step 1: Run WORKSET before PROJECT**

Require the changed-file WORKSET receipt first. Then run affected packages and the PROJECT corpus using approved bounded parallel shards. Do not overlap complete package estates or writers.

- [ ] **Step 2: Run LF and physical-CRLF controls**

Use isolated copies; never rewrite repository files. Require exact counts and semantic result digests.

- [ ] **Step 3: Run final gates sequentially**

Run Myco/Hypha, graph/index/registry writers, the complete package estate and phase-close in their governed order. A timeout or skipped owner remains non-green.

- [ ] **Step 4: Reach deterministic fixed points**

Regenerate docs, code, diagnostic, contract, unit, KB, package, project, assurance and roadmap outputs until each owner reports no second-run write.

- [ ] **Step 5: Freeze and review exact revision**

Build a zero-unexpected-exclusion external graph and require discoverability of the new native symbols. Obtain independent exact-revision review and a chapter-close multi-vector Grok review of implementation evidence plus the next-profile plan.

- [ ] **Step 6: Update living documents**

Record exact completed tasks, current blockers and the next safe action. Do not rewrite RD-0863 or scalar historical receipts.

- [ ] **Step 7: Commit closure evidence**

Commit exact reports and generated outputs only after all receipts bind the same HEAD.

### Task 9: Git integration and branch retirement

**Files:** No source file is inherently modified by this task.

**Interfaces:**
- Consumes: clean implementation branch, independent PASS, exact graph and fresh Git Custody receipt.
- Produces: integrated process-root ancestry or an exact HOLD.

- [ ] **Step 1: Recompute custody and intersections**

Inventory local/remote branches, worktrees, upstreams, unpublished commits and exact changed-path intersections. Preserve unknown or dirty worktrees.

- [ ] **Step 2: Integrate only the admitted branch**

Fast-forward or merge into `codex/rd-0858-unit4-process-root` only when the Git Custody plan admits that exact action. Do not merge to `main` in this chapter.

- [ ] **Step 3: Verify integrated exact HEAD**

Run the focused native controls, aggregate receipt validation, graph freshness and status/staged-empty checks at the integrated build point.

- [ ] **Step 4: Publish only with separate current authority**

If push authority is current, fetch first, require zero divergence surprises and publish the exact process-root branch. Otherwise report `committed locally; not pushed`.

- [ ] **Step 5: Retire only proven-contained worktrees/branches**

Remove a clean feature worktree and delete its branch only after ancestor and recoverability proof. Never force-delete unknown or dirty custody.

## Completion boundary

`RD0873_PLAN_READY` covers Task 1 only. `RD0873_AUDIT_FOUNDATION_CONFIRMED`
requires Tasks 2-5 and a green complete phase-close. `RD0873_FIRST_SLICE_CONFIRMED`
requires Tasks 6-9 at one exact integrated build point. None authorizes profile
`64`, TypeScript retirement, Trametes, `.gate`, VOK leasing, production or
release.
