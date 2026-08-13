# Slice 90 `vNot` Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove or fail closed on one typed, reference-only Fungi replacement for Tower-Citizen's exported Kleene K3 `vNot` decision.

**Architecture:** A package-owned `Verdict -> Verdict` pure flow uses exhaustive `check` and only the three closed Verdict constructors. Package tests bind it to the independent TypeScript K3 oracle; a separate integration proof compiles and publishes a physical `.slide`, independently re-admits it through VOK and verifies typed receipts. TypeScript remains active.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, Galerina parser/type/effect checker and interpreter, independent SLIDE checked-Fungi package compiler, physical publication loader and VOK typed receipt verifier.

## Global Constraints

- Pin Galerina to the live branch head and SLIDE to `ed326eaa14f1a899841cbac8da353d400970367e` before physical proof.
- Preserve the exact table `-1 -> 1`, `0 -> 0`, `1 -> -1` as typed `Verdict` values.
- Never emit `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop` in the candidate.
- Use one `pure flow`, one exhaustive `check`, and explicit returns from `deny`, `ambig`, and `if`.
- Do not use an Int/Bool bridge, host projection, widened SLIDE limit or new authority.
- Retain TypeScript, the package export and all consumers; this slice grants no production, release, signing, retirement or push authority.
- If physical compilation, admission or execution refuses, remove the candidate and close the slice as `BLOCKED` with the exact receipt.
- Keep repository-wide closure `UNKNOWN`; do not run crash-linked full tooling, normal phase-close, `graph-all`, or monolithic memory evaluation.

---

### Task 1: Bind the package-owned candidate to the independent K3 oracle

**Files:**
- Create: `packages-galerina/galerina-tower-citizen/tests/verdict-not-fungi-conversion.test.mjs`
- Create after RED: `packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-not.fungi`
- Modify after RED: `packages-galerina/galerina-tower-citizen/package.json`

**Interfaces:**
- Consumes: exported TypeScript `vNot`, `Verdict`, the hand-authored three-row K3 table, Galerina `parseProgram`, `checkEffects` and `executeFlow`.
- Produces: `pure flow vNotVerdict(candidateVerdict: Verdict) -> Verdict` and one exact `packageGraph.loadedAssets` entry.

- [ ] **Step 1: Write the failing ownership and parity test**

Create a frozen table with `[Verdict.DENY, Verdict.ALLOW]`, `[Verdict.INDETERMINATE, Verdict.INDETERMINATE]`, and `[Verdict.ALLOW, Verdict.DENY]`. Require the governed asset and loaded-asset declaration, bind the exact exported TypeScript helper chain `asVerdict(negTrit(a))`, reject forbidden candidate syntax, and compare TypeScript plus interpreted Fungi results for all three rows.

- [ ] **Step 2: Run RED**

Run: `npm run build` in `packages-galerina/galerina-tower-citizen`, then run only `tests/verdict-not-fungi-conversion.test.mjs`.

Expected: FAIL because `src/self-hosted/verdict-not.fungi` and its loaded-asset declaration are absent.

- [ ] **Step 3: Add the minimal typed candidate and declaration**

```fungi
@version 1
pure flow vNotVerdict(candidateVerdict: Verdict) -> Verdict {
  check(candidateVerdict) {
    deny: { return Verdict.Allow }
    ambig: { return Verdict.Unknown }
    if: { return Verdict.Deny }
  }
}
```

Add `src/self-hosted/verdict-not.fungi` to `packageGraph.loadedAssets` without changing package exports or runtime entrypoints.

- [ ] **Step 4: Run GREEN and the source oracle**

Run the new focused test and `tests/three-valued-governance.test.mjs` against the freshly built package.

Expected: both pass; the new test proves 3/3 Fungi parity and the existing independent K3 oracle remains green.

- [ ] **Step 5: Commit the candidate wave**

Stage only the candidate, package declaration and new focused test. Commit with `add slice 90 verdict not candidate`.

### Task 2: Prove the typed physical SLIDE/VOK boundary

**Files:**
- Create: `scripts/tests/tower-citizen-vnot-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: the exact package-owned Fungi bytes and the pinned sibling SLIDE modules for package compilation, publication, independent re-admission, typed execution and receipt verification.
- Produces: one physical Slice 90 proof for package `@galerina/tower-citizen`, export `vNotVerdict`, parameter type ID `3`, result type ID `3`, and safe-value type `verdict`.

- [ ] **Step 1: Write the physical proof before accepting the candidate**

Load SLIDE only from `GALERINA_SLIDE_REPO`. Compile one package/export, require `parameterTypeIds` exactly `[3]` and `resultTypeId` exactly `3`, publish to a fresh temporary directory, re-admit the publication for each row, execute with bounded steps, verify the typed receipt and require `authorityReleased: false` and `fallbackInvoked: false`.

- [ ] **Step 2: Add hostile-boundary assertions**

Require refusal for `[]`, surplus arguments, Boolean/String/object inputs, and integers outside `[-1, 0, 1]`. Require refusal on an exhausted step budget, one-byte source mutation, published artifact mutation, receipt schema/digest/authority mutation and every single-byte safe-value-envelope mutation.

- [ ] **Step 3: Run the exact physical test**

Set `GALERINA_SLIDE_REPO` to the sibling SLIDE checkout and run only `scripts/tests/tower-citizen-vnot-fungi-slide.integration.test.mjs`.

Expected: physical compile, publication, VOK re-admission, all three typed results and all hostile refusals pass with no skip.

- [ ] **Step 4: Fail closed on any physical refusal**

If the valid candidate refuses, record the exact compiler/admission diagnostic, remove the candidate and loaded-asset entry, retain only stable negative evidence, and classify Slice 90 `BLOCKED_BY_TYPED_VERDICT_PHYSICAL_PROFILE`. Do not substitute integers or widen SLIDE.

- [ ] **Step 5: Commit the physical proof**

Stage only the new integration test and commit with `prove slice 90 through physical slide`.

### Task 3: Verify the owning package and close the governed slice

**Files:**
- Create: `docs/reports/slice-90-vnot-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/reports/galerina-conversion-and-assurance-status-2026-08-13.md`
- Modify: `docs/TODO.md`
- Modify: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Regenerate only registered relevant outputs after authored inputs are committed.

**Interfaces:**
- Produces: one governed Slice 90 receipt, current conversion routing and bounded owner evidence.

- [ ] **Step 1: Run the complete package lane**

Run `npm test` in `packages-galerina/galerina-tower-citizen`.

Expected: every Tower-Citizen test passes without an unexpected skip or warning.

- [ ] **Step 2: Review both private Fungi skills**

Record `NO_SKILL_UPDATE` when the typed Verdict, exhaustive check, physical proof and refusal rules already cover the result. If a reusable gap exists, update the private skill RED-first, verify it GREEN and record its exact private-skill commit. Never publish or push either repository.

- [ ] **Step 3: Write the receipt and authored status updates**

The receipt must contain exactly one skill disposition, `Threadability: PARALLEL_PURE`, `Bounded closure: COMPLETE` or the exact physical blocker, the pinned SLIDE build point, the three-row truth table and an explicit statement that TypeScript remains active.

- [ ] **Step 4: Run bounded closure checks**

Run the governed slice-receipt audit and self-test, canonical count owner/self-test, path-leak and private-doc leak audits, semantic graph check, percentage freshness, status drift and roadmap checks. Do not run excluded aggregate lanes.

- [ ] **Step 5: Commit authored documents, regenerate registered owners, and refresh indexes**

Commit authored Slice 90 documents first. Regenerate roadmap/subway and project graph owners against that exact commit, verify their checks, and commit only registered outputs. At final HEAD, run moderate codebase-memory indexing and require `nodes == expected_nodes`, exact `indexed_head_sha`, `stale: false`, and a queryable Slice 90 symbol. Re-index Myco and report its bounded file/term counts.

