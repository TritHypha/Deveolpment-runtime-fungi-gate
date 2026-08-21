# Governance Shape Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Physically execute the exact String-equality decision inside TypeScript `sharesGovernanceShape` as package-owned Fungi without changing or retiring ProofGraph construction or consumers.

**Architecture:** Add one dedicated pure Fungi flow that accepts the two already-extracted `signatureHash` Strings and returns exact equality. Differential evidence compares it with the live TypeScript function; independent SLIDE/VOK evidence compiles, publishes, re-admits, executes, and verifies the physical Bool result without releasing authority.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, compiler interpreter, SLIDE checked-Fungi package compiler, VOK typed receipt verifier.

## Global Constraints

- Preserve JavaScript strict String-value equality exactly.
- Do not validate, trim, normalize, decode, or case-fold either String.
- Keep TypeScript ProofGraph extraction and every consumer active.
- Equality is not authentication and every physical receipt retains `authorityReleased: false`.
- Add no null, NaN, `else if`, `else`, throw, try/catch, `for`, `while`, or `loop`.
- Commit locally and never push.
- Exclude full tooling, normal phase-close, and monolithic memory evaluation.

---

### Task 1: RED differential contract

**Files:**
- Create: `packages-galerina/galerina-core-compiler/tests/proof-governance-shape-fungi-conversion.test.mjs`

**Interfaces:**
- Consumes: TypeScript `sharesGovernanceShape(a, b)` and the future Fungi source.
- Produces: a failing expectation for `sharesGovernanceShapeFungi(leftSignatureHash: String, rightSignatureHash: String) -> Bool`.

- [ ] **Step 1: Add equal and unequal canonical-looking, empty, length, case, whitespace, Unicode, prototype-shaped, and embedded-NUL vectors.**
- [ ] **Step 2: Compare the live TypeScript result with `executeFlow` over the future Fungi export.**
- [ ] **Step 3: Run the exact test and require `Flow 'sharesGovernanceShapeFungi' not found`.**
- [ ] **Step 4: Commit only the RED test.**

### Task 2: Minimal package-owned Fungi flow

**Files:**
- Create: `packages-galerina/galerina-core-compiler/src/self-hosted/proof-governance-shape.fungi`
- Modify: `packages-galerina/galerina-core-compiler/package.json`

**Interfaces:**
- Consumes: two declared String arguments.
- Produces: exact Bool equality with one Boolean `if` and terminal false return.

- [ ] **Step 1: Add this exact checked-language shape:**

```fungi
@version 1
pure flow sharesGovernanceShapeFungi(leftSignatureHash: String, rightSignatureHash: String) -> Bool {
  if leftSignatureHash == rightSignatureHash { return true }
  return false
}
```

- [ ] **Step 2: Register the asset in `packageGraph.loadedAssets`.**
- [ ] **Step 3: Strict-check the exact Fungi file.**
- [ ] **Step 4: Re-run the differential test and require every vector to pass.**
- [ ] **Step 5: Commit the source and package ownership change.**

### Task 3: Physical SLIDE/VOK proof

**Files:**
- Create: `scripts/tests/proof-governance-shape-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: exact source bytes and export `sharesGovernanceShapeFungi`.
- Produces: one independently verified physical `.slide` Bool-receipt family.

- [ ] **Step 1: Add a physical test that compiles and publishes the exact export.**
- [ ] **Step 2: Pin the exact registry identity and digest returned by successful independent re-admission.**
- [ ] **Step 3: Execute every differential vector and verify the typed Bool value plus `authorityReleased: false`.**
- [ ] **Step 4: Refuse wrong arity/types, invalid Unicode, exhausted work, source mutation, receipt mutation, every envelope byte mutation, and artifact mutation.**
- [ ] **Step 5: Run the exact physical test with the local SLIDE repository bound.**
- [ ] **Step 6: Commit the physical proof.**

### Task 4: Bounded owner closure

**Files:**
- Modify owner-generated Golden, retirement, graph, code-index, component-health, roadmap, and count outputs only when their checks report drift.
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Create: `docs/reports/governance-shape-fungi-conversion-2026-08-12.md`

**Interfaces:**
- Consumes: committed source and physical proof.
- Produces: current generated owners and an explicit non-retirement custody record.

- [ ] **Step 1: Run the compiler package and canonical package owner as isolated monitored processes.**
- [ ] **Step 2: Regenerate only owners that correctly refuse as stale.**
- [ ] **Step 3: Update TODO, roadmap, SVG, and the report without claiming authentication, consumer switch, or retirement.**
- [ ] **Step 4: Run the final bounded owner matrix and commit all intended outputs locally.**
- [ ] **Step 5: Refresh Myco and attempt the primary graph index once; retain closed transport as `UNKNOWN`.**
