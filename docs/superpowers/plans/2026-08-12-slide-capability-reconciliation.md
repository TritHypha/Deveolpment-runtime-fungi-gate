# SLIDE Capability Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, pin-bound capability matrix that re-adjudicates the shared physical blockers before Slice 63.

**Architecture:** A closed pin owner derives Galerina's SLIDE reference pin from one exact, clean SLIDE Git commit and its conserved 91-file manifest. A separate matrix runner verifies that pin, verifies the live sibling checkout byte-for-byte, executes bounded source probes, and publishes classifications without granting conversion or retirement authority. The conversion register consumes only exact matrix rows; no prose or constituent feature can imply composition support.

**Tech Stack:** Node.js ESM, `node:test`, strict JSON, Git object reads, existing SLIDE checked-Fungi compiler/publication/VOK APIs, Galerina generated-output and provenance helpers.

## Global Constraints

- Use the current checked-in SLIDE manifest; do not invent or hand-maintain a tool file list.
- A feature proof grants no composition authority beyond its exact matrix row.
- Null, NaN, exception syntax, `else if`, `for` and `loop` remain forbidden in new `.fungi` probe source. Iteration may use only a proved bounded Boolean `while` with monotonic progress and an explicit terminal exit.
- No host adapter may compute a Boolean, tag, discriminant, normalized String, length or packed record for a probe.
- Missing, stale, malformed, dirty or non-executable evidence classifies `UNKNOWN` or refuses publication.
- Matrix results are reference-only and non-authorizing; they grant no consumer switch, retirement, production admission, signing or release.
- Do not run Galerina full tooling, `graph-all`, normal phase-close or monolithic memory evaluation.
- Commit locally only. Do not push.

---

### Task 1: Exact SLIDE reference-pin owner

**Files:**
- Create: `scripts/gen-slide-reference-pin.mjs`
- Create: `scripts/tests/slide-reference-pin-generator.test.mjs`
- Modify: `scripts/lib/assurance-fabric/slide-reference-evidence.mjs`
- Modify: `docs/security/slide-reference-tool-pin.json`
- Regenerate: `build/slide-reference/reference.json`
- Regenerate: `build/slide-reference/provenance.json`

**Interfaces:**
- Produces: `deriveSlideReferencePin({ galerinaRoot, slideRoot, repositoryCommit }) -> { kind: "accepted", value: Pin } | { kind: "refused", code, detail }`.
- Produces: CLI modes `--print`, `--write`, `--check`, with mandatory `--slide-root` and optional exact `--commit` defaulting to the sibling checkout HEAD.
- Pin remains exact schema `galerina.slide.reference-tool-pin.v1` with `repositoryCommit`, `toolManifestDigest` and `toolFileCount`.

- [ ] **Step 1: Write pin-owner RED tests**

Create hermetic Git fixtures proving that derivation refuses a dirty tool path, a non-commit object, malformed manifest, surplus manifest field, count mismatch, digest mismatch, missing entrypoint and untracked tool input. Prove that one exact clean commit produces its commit hash, manifest digest and exact file count.

- [ ] **Step 2: Run the RED tests**

Run: `node --test scripts/tests/slide-reference-pin-generator.test.mjs`

Expected: FAIL because `gen-slide-reference-pin.mjs` and `deriveSlideReferencePin` do not exist.

- [ ] **Step 3: Extract closed manifest verification**

Export one shared verifier from `slide-reference-evidence.mjs` that accepts an explicit commit and returns the validated manifest facts. Preserve current byte ceilings, strict JSON, Git tree mode checks, entrypoint conservation and per-file hashes. Do not relax `verifySlideReferenceEvidence`.

- [ ] **Step 4: Implement the pin owner**

Require the requested commit to equal the clean SLIDE checkout HEAD for `--write`. Derive, never accept, count and digest. `--check` compares the exact candidate pin with `docs/security/slide-reference-tool-pin.json` and writes nothing. `--write` updates only the pin and then invokes the existing reference-evidence owner.

- [ ] **Step 5: Verify the pin owner**

Run:

```powershell
node --test scripts/tests/slide-reference-pin-generator.test.mjs scripts/tests/verify-slide-reference-evidence.test.mjs
node scripts/gen-slide-reference-pin.mjs --slide-root ..\SLIDE --commit 6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28 --write
node scripts/gen-slide-reference-pin.mjs --slide-root ..\SLIDE --check
node scripts/verify-slide-reference-evidence.mjs --check
```

Expected: all tests pass; pin and evidence bind `6de4d91ba20a7e86c53c8898fcdae2ef4b6cee28`, 91 files and the independently derived manifest digest.

- [ ] **Step 6: Commit Task 1**

Stage only the six Task 1 paths and commit `pin current SLIDE capability toolchain`.

---

### Task 2: Capability-matrix model and hostile self-test

**Files:**
- Create: `scripts/lib/slide-capability-matrix.mjs`
- Create: `scripts/tests/slide-capability-matrix.test.mjs`
- Create: `governance/slide-capability-probes.json`

**Interfaces:**
- Produces: `deriveSlideCapabilityMatrix({ galerinaRoot, slideRoot, executeProbe }) -> MatrixResult`.
- `MatrixResult` is either `{ kind: "accepted", value: Matrix }` or `{ kind: "refused", code, detail }`.
- Each matrix row has exact keys: `id`, `blockedSlices`, `sourceDigest`, `parameterShape`, `resultShape`, `classification`, `failureId`, `compilerProfileId`, `registrySetId`, `registrySetDigest`, `receiptDigest`, `hostTransform`, `referenceOnly`, `authorityReleased`.

- [ ] **Step 1: Write schema and anti-neutering RED tests**

Test exact-object parsing, unique row IDs, non-empty blocked-slice sets, sorted rows, allowed classifications, `hostTransform: "NONE"` for `PHYSICAL_SUPPORTED`, and mandatory absent-state strings for non-success evidence. Add planted controls proving that an empty matrix, missing probe, optimistic constituent-feature inference, stale pin and host-precomputed Boolean are refused.

- [ ] **Step 2: Run the RED tests**

Run: `node --test scripts/tests/slide-capability-matrix.test.mjs`

Expected: FAIL because the model does not exist.

- [ ] **Step 3: Add the twelve exact probe declarations**

Declare exactly these IDs and affected slices: `repeated-string-args` (45), `flat-scalar-record` (41), `optional-record-field` (41), `two-record-args` (46,54), `record-array-field` (50), `array-option-boundary` (50), `bytes-option-traversal` (62), `safe-integer-wide` (31,51,52), `unicode-normalization` (43,47,55,58), `governed-regex` (47,48,49,55), `wide-control-helper-composition` (35,37), and `heterogeneous-record-union` (56,57,59,60,61).

- [ ] **Step 4: Implement exact classification**

Map only a fully verified publication/VOK result to `PHYSICAL_SUPPORTED`. Map an exact compiler/profile refusal to `COMPOSITION_BLOCKED`; a proved narrower admitted type to `DOMAIN_NARROWER`; a required host transformation to `AUTHORITY_BLOCKED`; compiler/runtime self-hosting to `BOOTSTRAP_FLOOR`; and every incomplete case to `UNKNOWN`.

- [ ] **Step 5: Run Task 2 tests**

Run: `node --test scripts/tests/slide-capability-matrix.test.mjs`

Expected: all schema, hostile and anti-neutering cases pass.

- [ ] **Step 6: Commit Task 2**

Stage the three Task 2 paths and commit `add closed SLIDE capability matrix model`.

---

### Task 3: Pin-verified probe executor and generated owner

**Files:**
- Create: `scripts/slide-capability-matrix.mjs`
- Create: `scripts/tests/slide-capability-matrix.integration.test.mjs`
- Generate: `build/slide-capabilities/matrix.json`
- Generate: `build/slide-capabilities/MATRIX.md`
- Generate: `build/slide-capabilities/provenance.json`

**Interfaces:**
- CLI: `node scripts/slide-capability-matrix.mjs --slide-root ..\SLIDE --write|--check|--self-test`.
- Executor imports only manifest-listed files from a checkout whose HEAD equals the pin and whose relevant worktree bytes match every pinned digest.
- Produces one exact row per declaration and one aggregate digest over the pin, declarations and row evidence.

- [ ] **Step 1: Write executor RED integration tests**

Cover: current pin accepted; checkout ahead/behind pin refused; dirty manifest file refused; missing SLIDE refused; proxy/accessor input refused; source mutation changes the matrix digest; receipt mutation cannot produce support; repeated two-String probe remains `COMPOSITION_BLOCKED`; no result sets `authorityReleased: true`.

- [ ] **Step 2: Run the RED integration tests**

Run: `node --test scripts/tests/slide-capability-matrix.integration.test.mjs`

Expected: FAIL because the CLI/executor does not exist.

- [ ] **Step 3: Implement verified module loading**

First run the shared exact pin verifier. Require checkout HEAD equals the pin and require no diff or untracked file among manifest paths. Re-hash each working-tree tool file against the pinned manifest before importing any SLIDE module. Refuse before execution on any mismatch.

- [ ] **Step 4: Implement bounded probes**

Use `compileCheckedFungiPureScalarModule`, package publication, independent preparation, typed execution and typed receipt verification. Probes must pass original typed arguments directly. Record failure IDs and absent evidence; do not catch a refusal and relabel it as support.

- [ ] **Step 5: Implement write/check/self-test modes**

`--write` publishes the exact JSON, Markdown and provenance set. `--check` derives afresh and byte-compares all three without writing. `--self-test` runs the planted hostile controls without contacting the full Galerina suite.

- [ ] **Step 6: Verify and publish the current matrix**

Run:

```powershell
node --test scripts/tests/slide-capability-matrix.test.mjs scripts/tests/slide-capability-matrix.integration.test.mjs
node scripts/slide-capability-matrix.mjs --slide-root ..\SLIDE --self-test
node scripts/slide-capability-matrix.mjs --slide-root ..\SLIDE --write
node scripts/slide-capability-matrix.mjs --slide-root ..\SLIDE --check
```

Expected: deterministic outputs; every one of the twelve rows is present; unsupported compositions remain explicit refusals.

- [ ] **Step 7: Commit Task 3**

Stage only Task 3 source, tests and generated outputs; commit `publish pin-bound SLIDE capability matrix`.

---

### Task 4: Policy integration and blocker re-adjudication

**Files:**
- Modify: `governance/phase-close-commands.json`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Modify: `C:/Users/phill/Documents/GitHub/skills/translating-typescript-to-fungi/SKILL.md` only if a fresh no-skill baseline misses the pin/composition rule
- Test: `scripts/tests/slide-capability-matrix.integration.test.mjs`

**Interfaces:**
- The tooling manifest registers the matrix check and self-test as bounded owners; it does not add them to the crash-linked aggregate execution in this task.
- Every Slice 35-62 row links one exact matrix row and retains its prior classification unless the matrix proves `PHYSICAL_SUPPORTED` for the complete source boundary.

- [ ] **Step 1: Add RED conservation tests**

Require all Slice 35-62 physical blockers to reference a current matrix row and digest. Mutate the pin, remove a row and change a classification; each mutation must make the integration test fail.

- [ ] **Step 2: Run the RED test**

Run: `node --test scripts/tests/slide-capability-matrix.integration.test.mjs`

Expected: FAIL because register mappings do not exist.

- [ ] **Step 3: Register the bounded owners**

Add the matrix test, check and self-test to the exact tooling subject lists, update their exact count, and keep the commands out of the excluded aggregate invocation for this bounded chapter.

- [ ] **Step 4: Re-adjudicate the register**

For every Slice 35-62 blocker, record its exact row, classification, pin and matrix digest. Change a slice to eligible only when its complete input and output shape is `PHYSICAL_SUPPORTED` and its authority/custody conditions are independently satisfied.

- [ ] **Step 5: Review both public Fungi skills**

Run a fresh-context baseline without the skills against one stale-pin and one optimistic-composition scenario. If it fails either, add the reusable rule to `translating-typescript-to-fungi`; otherwise record `NO_SKILL_UPDATE`. Do not duplicate the rule in `writing-fungi` unless the error concerns authored `.fungi` syntax or semantics.

- [ ] **Step 6: Select the next bounded batch**

Choose at most ten `PHYSICAL_SUPPORTED` scopes. If none exist, stop slice enumeration and produce a design for the single missing composition that unlocks the largest mapped cluster.

- [ ] **Step 7: Verify Task 4**

Run the focused matrix tests, matrix check/self-test, conversion queue check, slice-close audit, Golden audit, path-leak audit and relevant owning-package tests. Do not run excluded aggregate lanes.

- [ ] **Step 8: Commit Task 4**

Stage explicit paths, commit `bind conversion policy to SLIDE capability matrix`, and do not push.

---

### Task 5: Bounded documentation and navigation closure

**Files:**
- Regenerate only registered package/project/KB/dev-tool/Fungi/semantic/percentage/status/code-index/roadmap owners affected by Tasks 1-4.
- Refresh the primary codebase graph and Myco once after the final source commit.

**Interfaces:**
- Final report distinguishes owner checks from excluded repository-wide closure.
- Exact-head graph freshness is required; a retained older build point is `UNKNOWN` even when graph content is unchanged.

- [ ] **Step 1: Run individual owners in dependency order**

Run each owner separately with its check mode. Do not substitute `graph-all`.

- [ ] **Step 2: Publish roadmap and subway**

Update the authored checkpoint, regenerate `build/component-health/roadmap-subway.svg`, and require the roadmap owner to pass 5/5 plus its self-test.

- [ ] **Step 3: Refresh navigation indexes**

Index Galerina in moderate mode and require nodes equal expected nodes and `indexed_head_sha` equal final HEAD. Refresh Myco and prove the matrix owner and one re-adjudicated slice are queryable. Record any transport or build-point mismatch as `UNKNOWN`.

- [ ] **Step 4: Final custody**

Require a clean tracked tree, exact local commits and no push. Report matrix classifications, reopened scopes, remaining shared blockers and the next ten-slice batch or next shared-capability design.
