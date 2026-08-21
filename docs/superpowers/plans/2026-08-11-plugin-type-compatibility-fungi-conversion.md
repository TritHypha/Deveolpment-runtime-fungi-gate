# Plugin Type Compatibility Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the private plugin Int-to-Float compatibility decision as an exact package-owned Fungi flow through compiler and physical SLIDE/VOK execution without retiring TypeScript.

**Architecture:** Add one isolated `plugin-type-compatibility.fungi` asset and one focused compiler parity test. Add a separate physical integration test that reuses the existing independent checked-Fungi package publication boundary.

**Tech Stack:** Galerina `.fungi`, TypeScript reference code, Node.js `node:test`, canonical GIR/WAT/Wasm, independent SLIDE/VOK.

## Global Constraints

- Only `"Int"` to `"Float"` returns true; every other String pair returns false.
- No null, NaN, `else if`, exception syntax, `for`, or `loop` in the Fungi source.
- TypeScript and `validatePluginInput` remain active.
- No release, production, signing, plugin-execution, bootstrap, or retirement authority.
- Commit locally only; do not push.

---

### Task 1: Focused compiler RED

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/plugin-type-compatibility-fungi-conversion.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: `validatePluginInput`, compiler parse/effect/GIR/WAT/interpreter exports, and the pinned private TypeScript source.
- Produces: a test contract requiring `src/self-hosted/plugin-type-compatibility.fungi` and `isCompatibleType(String, String) -> Bool`.

- [x] Add the package asset declaration and focused test before the source exists.
- [x] Require exact private-source anchoring, complete canonical matrix parity, hostile String negatives, strict compilation, and typed interpretation.
- [x] Run the focused test and retain the missing-source RED result.

### Task 2: Exact Fungi implementation

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/plugin-type-compatibility.fungi`

**Interfaces:**
- Consumes: two admitted `String` arguments.
- Produces: one deterministic `Bool` with the exact Int-to-Float compatibility policy.

- [x] Implement the flow with nested `if` statements and a terminal false exit.
- [x] Run strict checking and the focused compiler test.
- [x] Run the complete compiler package.
- [x] Commit the source, package declaration, and focused test locally.

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/plugin-type-compatibility-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact package-owned Fungi bytes and independent SLIDE at its clean pinned build point.
- Produces: one physical reference-only `.slide` export and independently verified typed Bool receipts.

- [x] Prove canonical and hostile String vectors through physical publication and VOK re-admission.
- [x] Refuse wrong argument types/counts, source mutation, and one-byte physical artifact mutation.
- [x] Run the focused integration with zero skips and commit it locally.

### Task 4: Closure

**Files:**
- Create: `docs/reports/plugin-type-compatibility-fungi-conversion-2026-08-11.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: generated owner outputs selected by their owning tools

**Interfaces:**
- Consumes: focused compiler/physical proof and current repository owner commands.
- Produces: a non-retiring conversion record with current counts and fresh indexes.

- [x] Record exact hashes, vectors, checks, blockers, and non-authority claims.
- [ ] Run aggregate, tooling, owner, roadmap, and phase-close checks.
- [ ] Refresh Myco and primary codebase-memory at the final commit.
- [ ] Commit explicit outputs locally and do not push.
