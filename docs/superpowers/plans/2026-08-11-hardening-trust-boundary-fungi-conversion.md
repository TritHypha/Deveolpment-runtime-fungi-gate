# Hardening Trust-Boundary Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the compiler's scalar K3 conjunction and fail-closed release boundary through exact `.fungi`, canonical GIR/WAT, physical SLIDE re-admission and typed VOK receipts without retiring TypeScript.

**Architecture:** A new package-owned Fungi asset mirrors only `combineTrust` and `boundaryTrusted` from `hardening-residency.ts`. One compiler-package test proves strict parsing and complete TypeScript/GIR parity; one repository integration test proves the exact bytes through SLIDE publication, independent re-admission, typed execution and mutation refusal.

**Tech Stack:** Galerina `.fungi` v1, TypeScript/ESM, Node `node:test`, canonical Galerina GIR/WAT, independent SLIDE checked-Fungi package compiler and VOK typed receipts.

## Global Constraints

- Use `Verdict`, never an untyped `Int`, for the closed `-1/0/+1` domain.
- Use an exhaustive K3 `check`; unknown and deny must never authorize release.
- No `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for` or `loop` in new Fungi.
- Do not modify or switch the TypeScript reference or its callers.
- Do not claim compiler fixpoint, retirement, release or production authority.
- Commit locally only; do not push.

---

### Task 1: Candidate-specific RED tests

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: `combineTrust(a, b)` and `boundaryTrusted(trust)` from `dist/index.js`.
- Produces: a requirement that `src/self-hosted/hardening-trust-boundary.fungi` export the same two flow names and complete finite-domain behavior.

- [ ] **Step 1: Write the missing-asset test**

Create a `node:test` suite that loads the package graph, requires
`src/self-hosted/hardening-trust-boundary.fungi`, compiles it with the built
compiler, instantiates its WAT, and compares `combineTrust` over all nine K3
pairs plus `boundaryTrusted` over all three K3 values with the imported
TypeScript functions.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs
```

Expected: FAIL because the package-owned asset is absent and is not listed in
`packageGraph.loadedAssets`.

- [ ] **Step 3: Record the exact RED reason**

Retain the failing assertion text in the task commentary or conversion dossier;
do not treat a syntax error or missing compiler build as the intended RED.

### Task 2: Minimal exact Fungi implementation

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`
- Test: `packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs`

**Interfaces:**
- Consumes: Fungi `Verdict` and `Bool`, exhaustive `check` and pure flows.
- Produces: `combineTrust(left: Verdict, right: Verdict) -> Verdict` and `boundaryTrusted(trust: Verdict) -> Bool`.

- [ ] **Step 1: Add the two pure flows**

Use this exact behavior:

```galerina
@version 1

/// Package-owned scalar trust operations. TypeScript remains the executing
/// compiler reference until bootstrap and retirement gates are proved.

pure flow combineTrust(left: Verdict, right: Verdict) -> Verdict
contract { intent { "Return the least-trusted K3 operand without manufacturing trust." } }
{
  check(left) {
    deny: { return left }
    ambig: {
      check(right) {
        deny: { return right }
        ambig: { return left }
        if: { return left }
      }
    }
    if: { return right }
  }
}

pure flow boundaryTrusted(trust: Verdict) -> Bool
contract { intent { "Release only a proven Allow verdict; Unknown and Deny remain closed." } }
{
  check(trust) {
    deny: { return false }
    ambig: { return false }
    if: { return true }
  }
}
```

- [ ] **Step 2: Register the exact asset**

Add `src/self-hosted/hardening-trust-boundary.fungi` once to the sorted
`packageGraph.loadedAssets` array.

- [ ] **Step 3: Run strict and parity checks**

Run:

```powershell
node galerina.mjs check packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi --strict-types --strict-governance
node --test packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs
npm run audit:fungi-golden
```

Expected: strict check has zero errors/warnings; all finite-domain parity tests
pass; Golden is current.

- [ ] **Step 4: Commit the local scalar implementation**

Stage only the new source, its focused test and compiler package manifest; make
one local feature commit.

### Task 3: Physical SLIDE/VOK RED and GREEN

**Files:**
- Create: `scripts/tests/hardening-trust-fungi-slide.integration.test.mjs`
- Test: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi`

**Interfaces:**
- Consumes: the exact Fungi source bytes, SLIDE's checked package compiler,
  physical publisher, independent publication loader and typed receipt verifier.
- Produces: two physical `.slide` artifacts and verified Bool/Verdict receipts
  for the complete finite domain.

- [ ] **Step 1: Write the physical integration test**

Compile package identity `@galerina/core-compiler`, version
`1.0.0-beta.2`, and exports `combineTrust` and `boundaryTrusted` from the same
source byte array. Publish to a temporary directory, require two `.slide`
files, prepare each export independently, execute all nine plus three vectors,
and compare verified values with the TypeScript references.

- [ ] **Step 2: Add negative assertions**

Require malformed Verdict arguments such as `2` to return `REFUSED`, require
both release values `-1` and `0` to verify as Boolean false, and flip one byte
of one physical artifact before requiring re-admission verdict `-1`.

- [ ] **Step 3: Run the test and verify the profile boundary**

Run with the explicit repository path:

```powershell
$env:GALERINA_SLIDE_REPO=(Resolve-Path ..\SLIDE).Path
node --test scripts/tests/hardening-trust-fungi-slide.integration.test.mjs
```

Expected: first RED is any exact unsupported Bool/Verdict profile boundary or
missing test source; after only necessary test/source corrections, PASS with no
skips. Do not widen SLIDE unless an independently tested exact blocker proves a
missing existing scalar contract.

- [ ] **Step 4: Run affected SLIDE checks if SLIDE changes**

If no SLIDE source changes, reuse its pinned clean build point and run the
focused physical test. If a SLIDE source change is required, apply its own TDD,
contract manifest, complete suite and local commit before returning here.

### Task 4: Dossier, governed owners and closure

**Files:**
- Create: `docs/reports/hardening-trust-boundary-fungi-conversion-2026-08-11.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate: `build/component-health/roadmap-subway.svg`
- Regenerate: registered graph, index, status, Golden, percent and retirement owners as required by their drift checks.

**Interfaces:**
- Consumes: source/toolchain digests, exact caller list, finite-domain parity,
  physical receipt evidence and negative/refusal results.
- Produces: one honest `PHYSICAL_REFERENCE_SLICE_PROVED_NON_RETIRING` record
  with no TypeScript-retirement credit.

- [ ] **Step 1: Write the source dossier and decision/effect ledger**

Record source commit/digest, Node/npm versions, exact exports/callers, full
input/output mapping, no-effect/no-loop facts, malformed-input refusal and the
bootstrap-retirement blocker.

- [ ] **Step 2: Update active TODO and roadmap**

Record the proved slice, exact focused/full counts and explicit remaining
compiler fixpoint/consumer-switch/retirement boundary. Do not mark the parent
TypeScript file complete.

- [ ] **Step 3: Run focused, package and tooling checks**

Run the compiler package, the exact two conversion tests, Golden, graph-all,
semantic coverage, retirement, canonical count, code-index, percent and roadmap
freshness checks. Fix owner-generated drift only through the registered owner.

- [ ] **Step 4: Run the final normal phase-close once**

Run `node scripts/run-phase-close.mjs --tier phase-close`, capture its actual
exit and duration, and report the first refusal without relabelling it as green.

- [ ] **Step 5: Commit generated evidence locally and refresh indexes**

Commit explicit governed output paths, rerun final non-mutating owner checks,
refresh Myco, attempt codebase-memory refresh once, and record `UNKNOWN` if its
transport remains closed. Do not push.
