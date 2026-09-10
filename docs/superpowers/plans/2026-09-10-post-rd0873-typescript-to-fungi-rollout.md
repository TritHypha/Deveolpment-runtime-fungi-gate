# Post-RD-0873 TypeScript-to-Fungi Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry the owner-signed RD-0873 and RD-0858 closure into one bounded TypeScript-to-Fungi pilot without reopening completed assurance or widening production authority.

**Architecture:** Keep Galerina as the source and semantic owner, retain the TypeScript implementation as a differential shadow, and cross into Fungi only through an exact checked snapshot and canonical GIR. SLIDE independently re-derives and executes the selected subject, VOK performs exact-subject admission, and Lyth contributes proof-work only; no sibling repository can mint production authority.

**Tech Stack:** TypeScript 5.9.3, Galerina compiler and GIR, Fungi v0.1, Myco, Hypha, codebase-memory, SLIDE, VOK, Lyth-Weaver, Node.js `node:test`, canonical JSON and SHA-256 evidence.

**Spec:** `docs/superpowers/specs/2026-08-28-rd-0873-native-fungi-bootstrap-design.md`

## Global Constraints

- RD-0873 Tasks 7-9 and RD-0858 are owner-signed complete; the interrupted benchmark worker is not a reason to rerun the completed corpus assurance.
- Use the existing checkout topology; do not create a branch or worktree for the pilot.
- Keep the TypeScript shadow until the retirement gate proves every real consumer uses the admitted Fungi route.
- Select one small, deterministic Galerina subject first; do not begin a bulk translation batch.
- Preserve exact source, snapshot, GIR, physical artifact, SLIDE, VOK and review identities at every boundary.
- Treat Lyth evidence as experimental and non-authorizing; a Lyth eligibility result cannot mint `ALLOW`.
- Stop on a missing, stale, divergent or scope-less receipt; never convert an unknown state into PASS.

---

### Task 1: Reconcile current navigation records

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: owner-signed RD-0873/RD-0858 closure and the accepted benchmark/corpus evidence.
- Produces: one dated navigation checkpoint that supersedes stale HOLD wording without rewriting the historical ledger.

- [x] **Step 1: Record the signed-off closure**

Add a dated checkpoint that distinguishes the benchmark crash from a failed result and records that RD-0873 Tasks 7-9 and RD-0858 are complete.

- [x] **Step 2: State the next bounded queue**

Name the rollout packet, first pilot, retained TypeScript differential and exact SLIDE/VOK/Lyth boundary. Explicitly keep bulk authoring, consumer switching, retirement and production admission closed until the pilot gate is green.

- [x] **Step 3: Verify navigation consistency**

Search only the dated top sections and confirm that the new checkpoint is first, that older sections remain unchanged, and that no protected conversion-queue path was edited. The roadmap generator correctly refuses while its provenance input is dirty; the docs-index dry run self-test passes without writing generated indexes.

### Task 2: Build the first-pilot source-owner manifest

**Files:**
- Create: `docs/reports/rd0873-post-closure-translation-manifest.md`

**Interfaces:**
- Consumes: current Galerina package graph, code index, conversion register, RD-0858 owner record, and the source-owner locators for SLIDE, VOK and Lyth-Weaver.
- Produces: one exact, bounded pilot candidate with source path, symbol, callers, package identity, owner, source digest and explicit exclusions.

- [ ] **Step 1: Resolve the candidate through owner tools**

Use codebase-memory and the Galerina RD query route first. Record only locators, identities, build points and asserted relationships; keep source bodies in their owning repositories.

- [ ] **Step 2: Refuse ambiguous candidates**

Reject a candidate when the graph, package registry, conversion queue or source-owner record disagrees, is stale, incomplete or lacks an exact current-head binding.

- [ ] **Step 3: Freeze one deterministic pilot**

Choose a small pure or deterministic subject with bounded inputs, outputs and effects. Record why mutable state, callbacks, filesystem, network, cryptography and unbounded work are excluded from this pilot.

### Task 3: Prepare the semantic and admission packet

**Files:**
- Create: `docs/reports/rd0873-post-closure-pilot-admission.md`

**Interfaces:**
- Consumes: the frozen pilot manifest and the live translation and authoring skill references.
- Produces: a source dossier, semantic/effect ledger, differential test matrix, exact receipt checklist and a green/red admission decision.

- [ ] **Step 1: Write one ledger row per observable operation**

Capture input and output domains, absence, numeric behavior, mutation and aliasing, failures, ordering, authority and timing. Mark every unknown as blocked.

- [ ] **Step 2: Define the differential vectors**

Include normal, missing, malformed, ambiguous, overflow, timeout, cancellation, mutation and partial-progress cases. Require a negative control that can make the candidate fail.

- [ ] **Step 3: Bind the physical route**

Require checked snapshot, canonical GIR, SLIDE re-derivation, VOK exact-subject admission and independent review at one current build point. Keep Lyth evidence labelled non-authorizing.

### Task 4: Open the pilot authoring gate

**Files:**
- Modify: `docs/reports/rd0873-post-closure-pilot-admission.md`
- Create: one selected Galerina-native `.fungi` file under `packages/fungi/products/galerina/` only after this task is green

**Interfaces:**
- Consumes: the manifest, admission packet, owner-bound queue decision and current compiler/toolchain identity.
- Produces: one checked scalar pilot plus exact differential, GIR, SLIDE, VOK and independent-review receipts.

- [ ] **Step 1: Require the owner-bound reopen**

Verify that the current queue explicitly reopens this exact pilot and that the receipt names the current Galerina `HEAD`, source digest, compiler, profile and exclusion set.

- [ ] **Step 2: Author the smallest candidate**

Use `translating-typescript-to-fungi` for the source dossier and `writing-fungi` for syntax and compiler verification. Preserve typed absence and failure, exhaustive control flow and bounded Boolean `while`; never infer syntax from a design document or occurrence count.

- [ ] **Step 3: Prove and review the pilot**

Run strict checking, differential vectors, canonical GIR comparison, independent SLIDE re-derivation, VOK admission and the independent review. Any missing or divergent receipt keeps the rollout closed.

### Task 5: Decide whether to schedule bulk translation

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/reports/rd0873-post-closure-pilot-admission.md`

**Interfaces:**
- Consumes: the complete pilot receipt chain and independent review.
- Produces: either a bounded batch schedule or a recorded refusal; never an implicit bulk authoring permission.

- [ ] **Step 1: Check retirement and consumer boundaries**

Prove every real consumer, fallback and declaration surface before discussing TypeScript retirement or a consumer switch. A checker-clean Fungi file alone is insufficient.

- [ ] **Step 2: Set batch limits**

If the pilot is green, schedule small source-owner batches with explicit file, time, output and review ceilings. Keep each batch independently receipted and reversible.

- [ ] **Step 3: Record the decision**

Update the navigation records with the exact pilot build point and the next approved batch, or preserve `HOLD` with the first missing receipt and the safe next action.
