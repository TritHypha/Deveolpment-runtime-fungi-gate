# Galerina-SLIDE-Lyth-VOK Scalar-Chain Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute this plan task-by-task. Use `codex-querying-galerina-graphs` for cross-repository discovery and `codex-index-is-a-graph-not-a-warehouse` for graph/storage boundaries.

**Goal:** Prove one bounded ordinary `.fungi` program can cross the complete detached scalar chain in fresh processes and produce an independently verified VOK v3 terminal receipt, while every mutated edge and every Tower/Tri/Hypha authority substitution refuses.

**Architecture:** A Galerina child process emits only content-addressed source/snapshot/GIR references and transfer evidence. A SLIDE child process reads verified GIR bytes, selects the active scalar profile and produces a physical `.slide` package. A Lyth child process independently re-derives non-authorizing work evidence. A final SLIDE/VOK child process independently re-admits the package, obtains and consumes the VOK lease, executes the bounded program and returns a terminal v3 receipt. The filesystem is a test-only owner-local repository; the graph carries locators/provenance only.

**Tech Stack:** Node.js fresh child processes, `node:test`, strict TypeScript build output, SLIDE ESM APIs, Lyth `tsx` adapter, temporary owner-local repositories, SHA-256 mutation fixtures.

## Preconditions

- [ ] The detached detector plan is green and phase-close registered.
- [ ] The checked-snapshot/detached-GIR plan is green and committed locally.
- [ ] SLIDE commit `ebcbd05` or a freshly verified descendant contains `planRepresentationProfile`, `readCanonicalGirArtifact`, `compileDetachedCanonicalGirToScalarSlide`, `prepareDetachedScalarVok`, `executePreparedDetachedScalarVok` and `verifyTypedPackageExecutionReceiptV3`.
- [ ] Lyth-Weaver commit `f106172` or a freshly verified descendant contains `runDetachedScalarAdapter` and `lyth.admission-work.v2` handling.
- [ ] The graph build point for each repository is checked. Stale indexes may guide navigation but cannot prove absence or current behavior.
- [ ] No sibling repository path is hard-coded in committed code. The focused integration run receives roots through environment values resolved by the operator.

---

## Task 1: Build the fresh-process constellation harness

**Files:**

- Create: `packages-galerina/galerina-core-compiler/tests/helpers/detached-scalar-constellation-harness.mjs`
- Create: `packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs`

- [ ] Export this test-only harness surface:

  ```js
  export async function runDetachedScalarConstellation({
    galerinaRoot,
    slideRoot,
    lythRoot,
    sourceFile,
    repositoryRoot,
    authorityEpoch,
    authorityContextDigest,
    seed,
  }) {
    // returns a frozen versioned integration receipt or typed refusal
  }
  ```

- [ ] Validate all inputs as exact own-data records. Resolve roots only for process launch; never serialize absolute roots into artifacts or the final receipt.
- [ ] Use a fresh temporary repository with separate owner directories for Galerina, SLIDE, Lyth and VOK. Each child receives only its owner-local directory and exact incoming references.
- [ ] Launch each stage in a new process with a versioned JSON request on stdin and one JSON response on stdout. Reject extra stdout, malformed JSON, wrong schema, non-zero exit, timeout or missing receipt.
- [ ] The ordinary package test must assert that missing constellation roots produce `CONSTELLATION_CONFIGURATION_REFUSED`; it must not mark a skipped test green. The Task 8 focused command is the only evidence that closes the live cross-repository chain.
- [ ] Put process limits on every child: 30-second timeout, bounded stdout/stderr, no shell interpolation and explicit executable/argument arrays.
- [ ] Hash each stage request/response and record only digests, schemas, relative stage IDs and process exit metadata in the integration receipt.

## Task 2: Drive Galerina source to detached GIR

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs`
- Create: `packages-galerina/galerina-core-compiler/tests/fixtures/detached-scalar/branching-i32.fungi`

- [ ] Use a bounded valid program with one entry flow, primitive signed i32 inputs and one conditional branch. Keep it inside 3 functions, 8 blocks, 32 instructions, call depth 2 and work 96.
- [ ] Invoke Galerina `build-detached-scalar` in a fresh child process. Require source, snapshot and GIR references plus `ComputeTransferV1`; do not accept embedded bodies or a producer `ok` Boolean as downstream authority.
- [ ] Independently read the Galerina repository entries in the harness, recompute length/digest and reject any mismatch before launching SLIDE.
- [ ] Assert source bytes are unchanged after compilation and that the snapshot/GIR records contain no path, AST, callback, `Map`, `Set`, live capability or source body.
- [ ] Run the detached-authority audit over the exact Galerina entry closure and bind its ruleset/result digest into the integration evidence set.

## Task 3: Drive canonical GIR to physical scalar `.slide`

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/helpers/detached-scalar-constellation-harness.mjs`
- Reuse in `../SLIDE`: `../SLIDE/src/representation-profile-registry.mjs`
- Reuse in `../SLIDE`: `../SLIDE/src/checked-module-snapshot-scalar-compiler.mjs`
- Reuse in `../SLIDE`: `../SLIDE/src/galerina-artifact-reference.mjs`

- [ ] In a fresh SLIDE process call `planRepresentationProfile` with preferred `trit.scalar.v1`, the declared serial-reference target/provider and no packed fallback.
- [ ] Require `kind: "REPRESENTATION_PLAN"`, active scalar lifecycle and a non-authorizing `planDigest`. Refuse any result shaped as VOK admission or `ALLOW`.
- [ ] Call `compileDetachedCanonicalGirToScalarSlide` with the verified GIR reference, captured Galerina repository read capability, run/source/snapshot/policy identities and the scalar plan.
- [ ] Require the physical package manifest to bind source, snapshot, GIR, profile plan, target/provider, compiler/linker, integrity/numeric models, policy and resource work maximum.
- [ ] Write the physical bytes through the SLIDE owner-local repository, reread them and recompute identity before giving only the reference/manifest to Lyth.

## Task 4: Obtain non-authorizing Lyth evidence

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/helpers/detached-scalar-constellation-harness.mjs`
- Reuse in `../lyth-weaver`: `../lyth-weaver/tools/adapter/adapter.ts`

- [ ] Launch Lyth with `tsx` in a fresh process and call `runDetachedScalarAdapter` using a verified physical reference, Lyth-side repository capability, manifest and exact proof/registry/platform/crypto/epoch identities.
- [ ] Require `schema: "lyth.detached-scalar-evidence.v1"`, `adapterVersion: "lyth.adapter.detached-scalar.v1"`, `authenticity: "UNAUTHENTICATED-RESEARCH-EVIDENCE"` and `authorityReleased: false`.
- [ ] Prove the evidence object contains no `ALLOW`, VOK lease, repository path, cache key/store object or live SLIDE handle.
- [ ] Independently verify its `evidenceDigest`, closure identity, checked snapshot identity, GIR identity, physical identity and static-all-paths work bound before passing it to SLIDE/VOK.
- [ ] Exercise the no-production-DFE path and require full recomputation/evidence. A forged cache hit, stale epoch or provenance mismatch must refuse or return typed indeterminate, never authorize.

## Task 5: Re-admit in SLIDE and execute through VOK

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/helpers/detached-scalar-constellation-harness.mjs`
- Reuse in `../SLIDE`: `../SLIDE/src/typed-package-execution-receipt-v3.mjs`
- Reuse in `../SLIDE` tests: `../SLIDE/tests/detached-scalar-v3-fixture.mjs`

- [ ] In one fresh SLIDE/VOK child process remint the bounded test manifest/stage receipts around the real Galerina/SLIDE/Lyth digests. Use `buildDetachedScalarFixture` only for test authority/receipt plumbing; replace its synthetic GIR/physical/evidence identities with the real chain and recompute every bound digest.
- [ ] Call `prepareDetachedScalarVok(request)`. Require `verdict: 1`, `status: "VOK_LEASE_READY"`, one opaque handle and matching evidence/admission/attempt digests.
- [ ] Call `executePreparedDetachedScalarVok(handle, { arguments, stepMaximum, terminalDirective: "EXECUTE", cleanup })` once in the same process. The handle must never cross serialization.
- [ ] Require `SUCCEEDED`, exact scalar result, successful cleanup and terminal receipt schema `slide.package-execution.receipt.v3`.
- [ ] Call `verifyTypedPackageExecutionReceiptV3` against exact run identity, authority epoch, receipt digest, physical digest and status. A producer success result without this independent verification is insufficient.
- [ ] Attempt a second handle use and require refusal. Test cancellation, trap and cleanup-failure terminal classes separately.

## Task 6: Run a seeded mutation sweep at every arrow

**Files:**

- Modify: `packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs`

- [ ] Derive deterministic mutations from the supplied seed and flip one field/byte per case across:
  source, checker evidence, snapshot bytes/reference, transfer, GIR bytes/reference,
  profile plan, physical bytes/reference/manifest, Lyth evidence, stage receipts,
  authority epoch/context, VOK proposal/admission/lease input and terminal receipt.
- [ ] Execute at least one mutation for every arrow and one cross-run splice combining individually valid evidence from two runs.
- [ ] Require zero mutated paths to reach `VOK_LEASE_READY` or verified terminal success. Record the refusing stage and failure ID for every case.
- [ ] Add mutation controls that prove the sweep itself is live: the unmutated baseline succeeds and a known early digest mutation is observed by the expected stage.
- [ ] Keep the mutation matrix bounded and reproducible. Record seed, vector count and stage coverage digest in the integration receipt.

## Task 7: Prove retained component boundaries

**Files:**

- Create: `packages-galerina/galerina-core-compiler/tests/retained-tower-tri-boundaries.test.mjs`
- Reuse: `packages-galerina/galerina-tower-citizen/.graph/BOUNDARY.md`
- Reuse: `packages-galerina/galerina-tri-pipe/.graph/BOUNDARY.md`
- Reuse: `packages-galerina/galerina-core-compiler/tests/wat-tri-fuse-a-elision.test.mjs`
- Reuse: `packages-galerina/galerina-core-compiler/tests/wat-tri-fuse-b-deny-sentinel.test.mjs`

- [ ] Use graph-first call/import discovery plus an exact bounded source fallback to prove the detached chain imports none of Tower, Tri-Pipe, Tri-Fuse or Hypha.
- [ ] Assert Tower may be represented only as a selected sink/reference owner. It cannot mint, inspect, consume, revoke or reinterpret the VOK lease/receipt.
- [ ] Assert Tri-Pipe may plan/route compute only before a new package/admission chain. Its plan cannot substitute for a SLIDE profile plan or VOK decision.
- [ ] Assert Tri-Fuse WAT tests are historical evidence only. No WAT/Wasm module is reachable from the detached integration entry. Any future Tri-Fuse transform creates a new physical artifact and requires fresh SLIDE/VOK admission.
- [ ] Assert Hypha has no import/runtime edge and the graph/index contains no artifact body. The test should inspect relationships/locators and a bounded body-leak signature set.
- [ ] Preserve all component packages and their existing boundaries; this plan removes or merges none of Tower-Citizen, Tri-Pipe or Tri-Fuse.

## Task 8: Run the focused live constellation command

- [ ] From the Galerina repository, configure roots without committing them:

  ```powershell
  $env:GALERINA_SLIDE_ROOT = (Resolve-Path ..\SLIDE).Path
  $env:GALERINA_LYTH_ROOT = (Resolve-Path ..\lyth-weaver).Path
  $env:GALERINA_CONSTELLATION_INTEGRATION = "1"
  node --test packages-galerina/galerina-core-compiler/tests/detached-scalar-slide-vok.integration.test.mjs
  node --test packages-galerina/galerina-core-compiler/tests/retained-tower-tri-boundaries.test.mjs
  ```

- [ ] Also run the package-native SLIDE/Lyth focused evidence:

  ```powershell
  node --test ..\SLIDE\tests\representation-profile-registry.test.mjs
  node --test ..\SLIDE\tests\galerina-artifact-reference.test.mjs
  node --test ..\SLIDE\tests\checked-module-snapshot-scalar-compiler.test.mjs
  node --test ..\SLIDE\tests\typed-package-execution-receipt-v3.test.mjs
  node --test ..\SLIDE\tests\detached-scalar-vok-boundary.test.mjs
  Push-Location ..\lyth-weaver
  npx tsx tools/adapter/kat-adapter.ts
  npx tsx tools/admission/kat-schema.ts
  Pop-Location
  ```

- [ ] A standard suite run without the integration environment may prove only `CONSTELLATION_CONFIGURATION_REFUSED`; it cannot close this task. Preserve the focused live receipt as the closure evidence.

## Task 9: Review, commit and refresh indexes

- [ ] Run an independent read-only review of authority ownership, mutation coverage, child-process isolation, path leakage and false-green configuration behavior.
- [ ] Run case-collision, exact-byte duplicate and normalized shadow checks on every new/changed file.
- [ ] Confirm no conversion report or conversion-wave `.fungi` output is present. The 40-new-`.fungi` report-bearing commit rule does not apply to this integration-test commit.
- [ ] Commit the Galerina integration tests locally with explicit paths only. Do not stage sibling repositories, converter work or unrelated `.fungi` files; do not push.
- [ ] Refresh Galerina, SLIDE and Lyth code graphs after their owning commits. For each, verify indexed status, node count, exact indexed head and `stale=false`, then probe one new/critical symbol.
- [ ] Update the master detached-scalar handoff plan Task 12 checkbox only after the live focused receipt and independent review are both green.

## Exit Criteria

- One bounded branching `.fungi` program completes source→snapshot→GIR→physical `.slide`→Lyth evidence→SLIDE re-admission→VOK lease→execution→verified v3 receipt in fresh processes.
- Every seeded mutation and cross-run splice refuses before verified success.
- VOK exclusively owns lease entry, consumption and terminal receipt authority.
- Tower-Citizen, Tri-Pipe and Tri-Fuse remain present but non-authorizing on this route; Hypha remains absent.
- No artifact body enters the graph/index and no absolute repository path enters a committed receipt.
