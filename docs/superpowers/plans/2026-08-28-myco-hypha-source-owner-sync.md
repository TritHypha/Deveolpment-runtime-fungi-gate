# Myco and Hypha Source-Owner Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize Galerina's Myco and Hypha packages with their public source owners while keeping AGENTS as the sole Git/worktree controller.

**Architecture:** AGENTS selects and binds exact Git worktrees, then invokes public Myco or Hypha as single-root engines. Galerina retains repository-local packages with explicit source-owner provenance and worktree-safe synchronization tools.

**Tech Stack:** Node.js, TypeScript, MJS, Git worktrees, package-local Node tests, codebase-memory graphs.

**Spec:** `docs/superpowers/specs/2026-08-28-myco-hypha-source-owner-sync-design.md`

## Global Constraints

- Do not copy AGENTS Git orchestration into Myco or Hypha.
- Do not remove either Galerina package.
- Do not edit `.myco/index.json`.
- Do not create or modify `.fungi` or `.gate` files.
- Preserve Galerina-local Myco link scanning and Hypha `name-set-drift` semantics.
- Run tests and audits sequentially.
- Bind every PASS claim to an exact commit and fresh graph.

---

### Task 1: Freeze source-owner identities and baselines

**Files:**
- Verify: public Myco repository state
- Verify: public Hypha repository state
- Verify: Galerina synchronization worktree state

**Interfaces:**
- Consumes: exact Git refs and clean working sets.
- Produces: immutable base identities and baseline test evidence.

- [x] **Step 1: Fetch public remotes with finite Git deadlines and compare remote tips without modifying source files.**
- [x] **Step 2: Verify public Myco's hardening branch contains `main` and record its unique commit range.**
- [x] **Step 3: Run public Myco build and complete test suite.**
- [x] **Step 4: Run public Hypha complete self-test/package test suite.**
- [x] **Step 5: Run Galerina Myco and Hypha package baselines from the isolated worktree, supplying explicit upstream locators where the current scripts permit it.**
- [x] **Step 6: Record every expected stale/provenance failure as RED evidence; refuse unexpected baseline failures.**

### Task 2: Make source-owner lookup worktree-safe

**Files:**
- Modify: `packages-ts/galerina-tools-myco/scripts/audit-public-source-owner.mjs`
- Modify: `packages-ts/galerina-tools-myco/tests/public-source-owner-audit.test.ts`
- Modify: `packages-ts/galerina-devtools-hypha/scripts/vendor-extractor.mjs`
- Create: `packages-ts/galerina-devtools-hypha/tests/vendor-extractor.test.mjs`

**Interfaces:**
- Consumes: one optional absolute `--upstream <repo>`, one unambiguous mode, and an absolute Git common-directory identity.
- Produces: strict argument parsing, `sourceOwnerRootFromCommonDir(commonDir, ownerName)`, byte-exact CRLF-only transport comparison, and bounded path-free refusal on absent or malformed identity.

- [x] **Step 1: Add focused Myco controls proving that an absolute linked-worktree-shaped Git common directory resolves the sibling beside the primary repository and that relative or malformed identities refuse.**
- [x] **Step 2: Run the focused Myco test and verify RED from the old checkout-depth default.**
- [x] **Step 3: Implement bounded Git-common-directory resolution plus explicit-upstream precedence.**
- [x] **Step 4: Run the focused Myco test and existing audit self-test to verify GREEN.**
- [x] **Step 5: Add Hypha controls for absolute common-directory resolution, strict argument admission, missing-source path-safe refusal, source-symlink refusal and CRLF-only transport equivalence.**
- [x] **Step 6: Run the focused Hypha tests and verify RED from the old checkout-depth default.**
- [x] **Step 7: Implement the same resolution contract in the Hypha vendor generator without adding a shared runtime dependency.**
- [x] **Step 8: Run focused Myco and Hypha tests to verify GREEN, then inspect the exact diff.**
- [x] **Step 9: Commit only Task 2 paths.**

### Task 3: Reconcile Galerina Myco with public Myco 0.2.2

**Files:**
- Modify: `packages-ts/galerina-tools-myco/package.json`
- Modify: `packages-ts/galerina-tools-myco/package-lock.json`
- Modify: `packages-ts/galerina-tools-myco/README.md`
- Modify: `packages-ts/galerina-tools-myco/src/graph/index-contract.ts`
- Modify: `packages-ts/galerina-tools-myco/src/graph/model.ts`
- Modify: `packages-ts/galerina-tools-myco/src/graph/store.ts`
- Modify: `packages-ts/galerina-tools-myco/src/index.ts`
- Modify: `packages-ts/galerina-tools-myco/src/ingest/indexer.ts`
- Modify: `packages-ts/galerina-tools-myco/src/ingest/walk.ts`
- Modify: `packages-ts/galerina-tools-myco/src/query/search.ts`
- Test: existing Myco tests plus the source-owner audit.

**Interfaces:**
- Consumes: public commit `c4ff2ca3c53e8c8cb8b5f6a7a589a096d85a1fd6` and Galerina's local link extension.
- Produces: a reproducible `PARTIAL_FORK` declaration and compatible Myco 0.2.2 package.

- [x] **Step 1: Run the source-owner audit against the new upstream commit while metadata still names the old snapshot; verify the expected RED classification.**
- [x] **Step 2: Refresh upstream-only shared files from the exact public commit.**
- [x] **Step 3: Three-way reconcile model, store and indexer against the declared old snapshot, preserving link nodes and Galerina-only behavior.**
- [x] **Step 4: Update version, lock data, README differences and the exact `galerinaVendor` classification.**
- [x] **Step 5: Run the source-owner audit and verify GREEN reproduction of the declared partial fork.**
- [x] **Step 6: Run Myco typecheck, build and complete tests sequentially.**
- [x] **Step 7: Re-run the fenced Markdown link regression family to prove the local extension survived.**
- [x] **Step 8: Inspect the exact diff and commit only Task 3 paths.**

### Task 4: Regenerate Galerina Hypha from public Hypha

**Files:**
- Modify: `packages-ts/galerina-devtools-hypha/src/extract.mjs`
- Modify: `packages-ts/galerina-devtools-hypha/src/provenance.json`
- Modify: `packages-ts/galerina-devtools-hypha/README.md` only if the command contract changed.
- Test: `packages-ts/galerina-devtools-hypha/tests/hypha-devtool.test.mjs`

**Interfaces:**
- Consumes: exact public Hypha `src/extract.js` bytes at commit `9a15296b2589794cb92fed423953a711db7b36c7`.
- Produces: deterministic ESM extractor bytes and matching SHA-256 provenance.

- [x] **Step 1: Run `vendor:check` against the explicit current public source and verify the expected stale RED.**
- [x] **Step 2: Run the vendor generator in write mode against that exact source owner.**
- [x] **Step 3: Run `vendor:check` and verify GREEN byte/provenance identity.**
- [x] **Step 4: Run Hypha self-test and complete package tests sequentially.**
- [x] **Step 5: Verify the passive scan leaves the worktree unchanged.**
- [x] **Step 6: Inspect generated-only changes and commit only Task 4 paths.**

### Task 5: Cross-repository compatibility and governance

**Files:**
- Modify: `docs/superpowers/plans/2026-08-28-myco-hypha-source-owner-sync.md` checkboxes only.
- Modify: governed generated indexes/reports only when their owning commands require regeneration.

**Interfaces:**
- Consumes: synchronized Galerina packages and verified public engines.
- Produces: exact compatibility, governance and graph receipts.

- [x] **Step 1: Run AGENTS Myco worktree-controller current-only and registered-worktree probes against the public Myco engine.**
- [x] **Step 2: Run AGENTS Hypha worktree-controller current-only and registered-worktree probes against the public Hypha engine.**
- [x] **Step 3: Run Galerina package-root lock, tooling policy, product-boundary and affected package-graph checks sequentially.**
- [x] **Step 4: Run the bounded affected phase-close route; do not run all audits concurrently.**
- [x] **Step 5: Refresh the exact candidate graph with zero undisclosed exclusions and verify required symbols.**
- [x] **Step 6: Commit only required generated artifacts and plan status changes.**

### Task 6: Independent review and integration

**Files:**
- Create: one exact-revision independent review receipt under `docs/independent-audits/` if repository policy requires a durable receipt.

**Interfaces:**
- Consumes: clean exact candidate commit, plan and graph receipt.
- Produces: PASS/HOLD with Critical/Important/Minor inventory and integration evidence.

- [ ] **Step 1: Freeze the exact candidate commit and obtain independent source/diff review with LF and physical-CRLF controls.**
- [ ] **Step 2: Repair every sustained Critical or Important finding RED-first and repeat exact review until C0/I0 or HOLD.**
- [ ] **Step 3: Fetch again and confirm public Myco/Hypha and Galerina base branches have not drifted.**
- [ ] **Step 4: Merge the verified public Myco hardening branch into public `main`, rerun build/tests, and push non-force.**
- [ ] **Step 5: Verify public Hypha `master` remains exact and push only if a committed change exists.**
- [ ] **Step 6: Merge the verified Galerina synchronization branch into `codex/rd-0858-unit4-process-root`, rerun affected merged-state gates and refresh its exact graph.**
- [ ] **Step 7: Push approved merged branches non-force, then remove only proven integrated topic branches/worktrees.**
- [ ] **Step 8: Report exact heads, tests, graphs, residual branches, protected files and any HOLD.**
