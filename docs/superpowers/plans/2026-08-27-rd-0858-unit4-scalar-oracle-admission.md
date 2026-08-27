# RD-0858 Unit 4 Scalar-Oracle Admission Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admit and execute one fixed, hand-authored Galerina scalar-profile-1 `.fungi` flow through a source-free canonical checked artifact while preserving the existing clean-process boundary and non-authorizing receipts.

**Architecture:** Repository admission compiles one fixed canonical source into one closed checked-flow artifact. The protected registry binds the artifact bytes and identity; the launcher passes admitted bytes to a single-use worker; the worker decodes only the checked AST and executes it with the tree interpreter. Source parsing, compiler loading, retries, runtime profile rescue, GIR/SLIDE/VOK authority and TypeScript retirement remain outside this chapter.

**Tech Stack:** Galerina `.fungi`, TypeScript, Node.js test runner, Rust native launcher, SHA-256 canonical receipts, codebase-memory, Myco/Hypha controller, phased repository gates.

**Governing design:** `docs/superpowers/specs/2026-08-27-rd-0858-unit4-scalar-oracle-admission-design.md`

**Execution rule:** Work only on `codex/rd-0858-unit4-scalar-oracle` in its isolated worktree. Run checks sequentially. Commit locally at the end of each clean task. Do not push, merge, edit another worktree or touch an unrelated generated file.

---

## Task 1: Closed Checked-Flow Artifact Codec

**Files:**

- Create: `packages-ts/galerina-core-compiler/src/checked-flow-artifact.ts`
- Create: `packages-ts/galerina-core-compiler/tests/checked-flow-artifact.test.mjs`
- Modify: `packages-ts/galerina-core-compiler/src/index.ts`
- Modify: `packages-ts/galerina-core-compiler/package.json`

### Step 1: Write the failing closed-schema controls

Add focused tests for the exact v1 field set, fixed key order, terminal LF,
UTF-8/NFC strings, duplicate or unknown fields, missing fields, non-minimal
escapes, invalid numbers, depth/value/node/byte ceilings and top-level versus
checked-AST contract coherence.

The positive fixture must use:

```json
{
  "schema": "galerina.rd0858.checked-flow.v1",
  "productId": "galerina",
  "packageId": "rd0858-unit4-scalar-oracle",
  "flowLocator": "rd0858/unit4/scalar-oracle",
  "flowName": "scalarOracle",
  "runtimeProfile": "scalar-1"
}
```

Add one-field neighbours for every identity field. Add LF, physical-CRLF,
NFC/NFD and reordered-object controls that all assert exact canonical-byte
behaviour.

### Step 2: Prove RED capability

Run:

```powershell
npm --prefix packages-ts/galerina-core-compiler run build
node --test packages-ts/galerina-core-compiler/tests/checked-flow-artifact.test.mjs
```

Expected: FAIL because the codec exports do not exist. Preserve the exact
failure in the task receipt.

### Step 3: Implement the smallest closed codec

Implement and export:

```ts
encodeCheckedFlowArtifact(value)
decodeCheckedFlowArtifact(bytes)
validateCheckedFlowArtifact(value)
digestCheckedFlowArtifact(bytes)
```

Use a fixed schema writer, not generic caller-controlled key traversal. Decode
from bytes, reject surplus structure, independently derive the flow contract
from `checkedAst`, re-encode, and require byte equality. Enforce the design's
262,144-byte, depth-64, value-16,384 and AST-node-8,192 bounds before producing
an admitted value.

### Step 4: Verify GREEN and controlled mutations

Run the focused test again, then run each mutation self-control that weakens
one closed field/bound/re-encode comparison and require at least one permanent
test to turn red.

### Step 5: Commit exact paths

```powershell
git add -- packages-ts/galerina-core-compiler/src/checked-flow-artifact.ts packages-ts/galerina-core-compiler/tests/checked-flow-artifact.test.mjs packages-ts/galerina-core-compiler/src/index.ts packages-ts/galerina-core-compiler/package.json
git diff --cached --check
git commit -m "feat: add closed checked-flow artifact codec"
```

## Task 2: Fixed Canonical Source and Deterministic Generator

**Files:**

- Create: `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi`
- Create: `packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json`
- Create: `scripts/generate-rd0858-scalar-oracle-artifact.mjs`
- Create: `scripts/tests/rd0858-scalar-oracle-artifact.test.mjs`

### Step 1: Write generator and source-boundary RED controls

The generator test must refuse caller-selected input/output paths and must
exercise the one fixed repository source. Add controls for BOM, CRLF, lone CR,
NFD, invalid UTF-8, wrong version, extra flow, wrong name/signature/effects,
checker failure, stale source digest, stale toolchain digest and non-identical
two-process output.

Add a parent control proving the committed artifact is absent or stale before
the implementation is created.

### Step 2: Prove RED capability

```powershell
node --test scripts/tests/rd0858-scalar-oracle-artifact.test.mjs
```

Expected: FAIL because the fixed generator and admitted pair do not exist.

### Step 3: Add the one hand-authored source

Create exactly:

```fungi
@version 1
pure flow scalarOracle(subject: Verdict) -> String
contract { effects {} }
{
  check(subject) {
    deny: { return "deny" }
    ambig: { return "ambig" }
    if: { return "allow" }
  }
}
```

The source is native Galerina work. Do not derive it from, compare it to or
retire a TypeScript implementation.

### Step 4: Implement fixed-input generation

Run the maintained parser, resolver, type, value-state, effect, governance,
escape and naming checks. Select exactly `scalarOracle`, call the maintained
checked-flow snapshot boundary, bind the complete toolchain identity envelope,
and serialize only through Task 1's codec.

Support only:

```text
--check   compare an isolated candidate with the committed artifact
--write   atomically publish an already revalidated byte-identical candidate
--self-test
```

Generate twice in separate Node processes, verify held source/toolchain
identities before and after both runs, and refuse drift without overwriting the
committed file.

### Step 5: Generate and verify the committed pair

```powershell
node scripts/generate-rd0858-scalar-oracle-artifact.mjs --self-test
node scripts/generate-rd0858-scalar-oracle-artifact.mjs --write
node scripts/generate-rd0858-scalar-oracle-artifact.mjs --check
node --test scripts/tests/rd0858-scalar-oracle-artifact.test.mjs
```

Expected: all PASS; a stale-source and stale-toolchain controlled neighbour
must refuse.

### Step 6: Commit exact paths

```powershell
git add -- packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.fungi packages/fungi/products/galerina/rd0858-unit4-scalar-oracle/scalar-oracle.checked.json scripts/generate-rd0858-scalar-oracle-artifact.mjs scripts/tests/rd0858-scalar-oracle-artifact.test.mjs
git diff --cached --check
git commit -m "feat: add RD-0858 scalar oracle artifact"
```

## Task 3: Protected Registry Artifact Admission

**Files:**

- Modify: `scripts/build-requirement-launcher.mjs`
- Modify: `scripts/native/requirement-launcher/src/identity.rs`
- Modify: `scripts/native/requirement-launcher/src/main.rs`
- Modify: `scripts/native/requirement-launcher/src/protocol.rs`
- Modify: `scripts/native/requirement-launcher/src/windows.rs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`

### Step 1: Write RED registry controls

Add tests proving registry creation refuses unless Task 2 `--check` passes.
Require exact product/package/flow/profile/schema/compiler-graph identity, direct
regular-file identity, byte length and artifact digest. Add `.fungi`, symlink,
junction, reparse, case-alias, replaced-file and held-handle drift neighbours.

### Step 2: Prove RED capability

```powershell
node --test scripts/tests/requirement-launcher.test.mjs
```

Expected: the new artifact-registry assertions FAIL while existing bootstrap
controls remain green.

### Step 3: Implement held artifact admission

Extend the registry schema and Rust protocol with exact closed fields. Open
and hold the artifact before identity checks; hash the held bytes; recheck
metadata after hashing; retain the handle through worker resume; send the
admitted bytes through the owned worker channel. Never send or reopen a source
path.

### Step 4: Verify focused launcher behaviour

Run the generator check, launcher build, Rust tests and launcher Node tests
sequentially. Run the direct-file replacement and `.fungi`-registry mutation
controls explicitly.

### Step 5: Commit exact paths

Stage only the seven named launcher paths and commit:

```powershell
git commit -m "feat: bind launcher to checked scalar artifact"
```

## Task 4: Single-Use Tree Interpreter Execution

**Files:**

- Modify: `packages-ts/galerina-core-compiler/src/requirement-process-protocol.ts`
- Modify: `packages-ts/galerina-core-compiler/src/requirement-process-worker.ts`
- Modify: `packages-ts/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`
- Modify: `packages-ts/galerina-core-compiler/tests/requirement-process-worker.test.mjs`
- Modify: `packages-ts/galerina-core-compiler/tests/requirement-process-root-red.test.mjs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`

### Step 1: Write the exact 3-way execution RED controls

Add canonical `Verdict.Deny`, `Verdict.Unknown` and `Verdict.Allow` request
vectors and require `deny`, `ambig` and `allow` respectively. Add malformed,
surplus and aliased argument controls; artifact/product/profile/digest
mismatches; unsupported AST; dynamic import/compiler/source access; fast-tier
use; nonce replay; second frame and second request.

Retain all four existing hostile process-root attacks and require
byte-equivalent clean-worker semantic value and audit evidence.

### Step 2: Prove RED capability

Run protocol, worker, process-root RED and launcher tests sequentially.
Expected: new flow controls FAIL; pre-existing controls remain green.

### Step 3: Implement tree-only flow execution

Decode admitted artifact bytes with Task 1, independently revalidate the AST,
decode exactly one canonical Verdict argument, and invoke the maintained
interpreter with optimized/compiled paths disabled. Require the reported tier
to be `tree`, the output to be one admitted decision label and audit evidence
to remain bounded. Erase input/AST state before emitting one frame and close on
every completion/refusal/error.

### Step 4: Verify GREEN and permanent red capability

Run the four focused suites. Apply controlled mutations for source parsing,
fast-tier enablement, second-request admission and ambiguous-to-allow collapse;
each mutation must turn an exact permanent test red.

### Step 5: Commit exact paths

Stage only the six named paths, run `git diff --cached --check`, and commit:

```powershell
git commit -m "feat: execute scalar oracle in clean worker"
```

## Task 5: Total Terminal Receipts and Parent Adapter

**Files:**

- Create: `packages-ts/galerina-core-compiler/src/requirement-process-adapter.ts`
- Create: `packages-ts/galerina-core-compiler/tests/requirement-process-adapter.test.mjs`
- Modify: `packages-ts/galerina-core-compiler/src/index.ts`
- Modify: `packages-ts/galerina-core-compiler/package.json`
- Modify: `packages-ts/galerina-core-compiler/src/requirement-process-protocol.ts`
- Modify: `packages-ts/galerina-core-compiler/tests/requirement-process-protocol.test.mjs`
- Modify: `scripts/native/requirement-launcher/src/protocol.rs`
- Modify: `scripts/native/requirement-launcher/src/main.rs`
- Modify: `scripts/tests/requirement-launcher.test.mjs`

### Step 1: Write one RED control for every terminal row

Cover every Section 12 condition from the design, including missing/truncated
worker evidence, timeout, crash, caller cancellation and unclassified worker
exception. Assert exactly one bounded receipt, `authorizing: false`, exact
state/code reachability and no unknown condition becoming `COMPLETE`.

### Step 2: Prove RED capability

Run adapter, protocol and launcher tests. Expected: the missing adapter and
new terminal rows FAIL.

### Step 3: Implement the non-authorizing adapter and terminal algebra

The adapter may validate and recompute evidence only. It cannot mint an
execution lease, call VOK, execute production effects, retry a worker or
substitute a profile. Make missing worker output explicit evidence and close
all catches through the bounded terminal table.

### Step 4: Verify GREEN and causal red mutations

Run the focused suites, then mutate each terminal mapper and the
`authorizing:false` invariant one at a time. Each must turn a permanent test
red without relying on a text-only assertion.

### Step 5: Commit exact paths

Stage only the nine named paths and commit:

```powershell
git commit -m "feat: close scalar worker terminal receipts"
```

## Task 6: Sequential Assurance and Attack Matrix

**Files:**

- Modify only if a test gap is proven in Tasks 1-5.
- Create: `docs/reports/rd-0858-unit4-scalar-oracle-assurance-2026-08-27.md`

### Step 1: Run focused LF controls

Run, one process at a time:

```powershell
npm --prefix packages-ts/galerina-core-compiler run build
node --test packages-ts/galerina-core-compiler/tests/checked-flow-artifact.test.mjs
node --test scripts/tests/rd0858-scalar-oracle-artifact.test.mjs
node --test packages-ts/galerina-core-compiler/tests/requirement-process-protocol.test.mjs
node --test packages-ts/galerina-core-compiler/tests/requirement-process-worker.test.mjs
node --test packages-ts/galerina-core-compiler/tests/requirement-process-root-red.test.mjs
node --test packages-ts/galerina-core-compiler/tests/requirement-process-adapter.test.mjs
node --test scripts/tests/requirement-launcher.test.mjs
```

### Step 2: Run physical-CRLF copies

Create isolated temporary physical-CRLF copies of the focused test estate,
run them sequentially, record exact counts and remove only the verified
temporary copies. Do not rewrite repository files.

### Step 3: Run sibling and package gates sequentially

Run the core-compiler typecheck/build/full package test, Rust launcher tests,
product-boundary self-tests/check, Fungi golden audit and the maintained
phased impact/phase-close runner. Stop on the first nonzero result, preserve
the exact failure and repair only a demonstrated root. The owner-approved
scalar-local integration addendum preserves `audit:conversion-slice-close`
and `fungi:corpus-check` as global blocking `HOLD` gates; it does not authorize
rewriting historical receipts or widening this chapter to repair broad
conversion/corpus ownership. Continue scalar-local assurance only when every
scalar-specific phase result is green and both global outcomes remain recorded
as non-PASS.

### Step 4: Run Myco, Hypha and Code Logic Workbench through the controller

Use snippet scope for the changed files first, then the selected worktree
profile. Require explicit branch/worktree/head identity in every receipt.
`REFUSED`, stale, ambiguous or branch-mismatched evidence is not PASS.

### Step 5: Write the assurance receipt

Record exact Git commit/tree, commands, counts, controlled-red evidence,
duration, platform, graph names, exclusions and remaining HOLD boundaries.
The report must not contain source bodies or absolute local paths.

### Step 6: Commit the exact receipt and any proven test-only repair

```powershell
git add -- docs/reports/rd-0858-unit4-scalar-oracle-assurance-2026-08-27.md
git diff --cached --check
git commit -m "test: close RD-0858 scalar oracle assurance"
```

## Task 7: TODO, Roadmap and Audit-Map Closure

**Files:**

- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/audit-map.json` only through its maintained generator.

### Step 1: Add exact chapter status

Mark the old pre-conversion stop as superseded only for this one fixed
hand-authored scalar artifact. Record that TypeScript retirement, broader
conversion, profile `64`/`256`, GIR/SLIDE/VOK admission, `.gate`, Trametes and
production authority remain HOLD.

### Step 2: Regenerate instead of hand-editing generated views

Run the maintained roadmap/audit-map generators from the exact clean build
point. Reject nondeterministic second-run output and any body-bearing graph or
memory entry.

### Step 3: Verify documentation and stale locators

Run docs-index to a fixed point, KB index checks, link/path-leak checks, TODO
coverage and the locator-only working-set check. Preserve `REVIEW` or
`REFUSED`; never normalize either to PASS.

### Step 4: Commit exact documentation paths

Stage the exact changed documents/generated views, inspect the staged list and
commit:

```powershell
git commit -m "docs: record scalar oracle chapter closure"
```

## Task 8: Exact Graph, Independent Review and Integration Gate

**Files:**

- Create: `docs/reports/rd-0858-unit4-scalar-oracle-independent-review-2026-08-27.md`
- Create: `docs/reports/rd-0858-unit4-scalar-oracle-model-review-2026-08-27.md`

### Step 1: Freeze the candidate

Require clean status and staged-empty state. Record exact branch, HEAD, tree,
changed-path set relative to `9a64384f10b150609331935108e6ac056c82075f`
and the unchanged state of every other registered worktree.

### Step 2: Refresh every maintained graph/index sequentially

Run `scripts/graph-all.mjs` under its phased bounds, then each required fixed
point/index verifier. Build a full external codebase-memory graph at the exact
candidate HEAD with zero unexpected exclusions. Require the new artifact
codec, generator, adapter and worker execution symbols to be discoverable.

### Step 3: Obtain independent exact-revision review

Review the frozen commit against the governing design, source/artifact fixed
point, complete hash envelope, worker source exclusion, all terminal rows,
controlled-red capability and exact LF/physical-CRLF evidence. Any Critical or
Important finding returns the chapter to RED-first repair and requires a fresh
commit, exact graph and new immutable review.

### Step 4: Obtain model-diverse multi-vector review

Use the governed external-review prompt tool. Ask at least five independent
vectors: authority/substitution, canonical replay, execution/failure,
product/lifecycle and assurance/red-capability. Preserve provider/model,
timestamps, complete prompt/reply bytes and digests. Adjudicate locally; the
external model cannot mint PASS.

### Step 5: Commit review receipts

Commit only the two review receipts after the candidate and reviews agree at
one exact build point.

### Step 6: Apply the local integration gate

Recompute ancestry, changed-path intersections, branch/worktree custody and
target status. Merge into `codex/rd-0858-unit4-process-root` only when every
scalar-local gate is PASS at one exact build point, both independent review
modes have no Critical or Important finding, the target is clean and no
concurrent path ownership exists. The canonical phase-close receipt must still
show the two retained global blocking HOLDs; it is not a chapter PASS and
cannot authorize `main`, release, production, broader conversion or another
native source. Delete the feature worktree/branch only after ancestor and
recoverability proof. Do not push and do not merge to `main` in this chapter.

## Completion boundary

The chapter may state `RD0858_UNIT4_SCALAR_EVIDENCE_CONFIRMED` only when Tasks
1-8 are complete at one exact commit with clean custody. It still cannot state
production admission, VOK authority, TypeScript retirement, general `.fungi`
conversion, profile `64`/`256`, Trametes or `.gate` synthesis completion.
