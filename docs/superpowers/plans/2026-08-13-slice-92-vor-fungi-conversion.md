# Slice 92 `vOr` Fungi Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. This session executes it inline under the owner's standing full-auto approval.

**Goal:** Prove or fail closed on one typed, reference-only Fungi replacement for Tower-Citizen's `vOr` Kleene maximum.

**Architecture:** A package-owned pure flow accepts two typed Verdicts and implements the exact nine-row K3 maximum with nested exhaustive `check`. A package differential test binds it to the TypeScript oracle; a separate physical proof compiles, publishes and independently re-admits one `.slide` through VOK. TypeScript remains active.

**Tech Stack:** Galerina `.fungi`, Node.js `node:test`, Galerina parser/effect checker/interpreter, independent SLIDE checked-Fungi package compiler, publication loader and VOK typed receipt verifier.

## Global constraints

- Pin Galerina to the live Slice 92 branch head and SLIDE to the currently admitted clean sibling commit before physical proof.
- Preserve all nine literal `max(left, right)` rows as typed Verdicts.
- Never emit `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or `loop` in the candidate.
- Use one `pure flow`, nested exhaustive `check` and explicit terminal returns.
- Do not use an Int/Bool bridge, host projection, De Morgan helper graph, widened SLIDE profile or new authority.
- Retain TypeScript, exports and consumers; this slice grants no retirement, production, release, signing, push or authority permission.
- If valid physical compilation, admission or execution refuses, remove the candidate and close as `BLOCKED_BY_TYPED_TWO_VERDICT_PHYSICAL_PROFILE`.
- Keep repository-wide closure `UNKNOWN`; do not run full tooling, normal phase-close, `graph-all` or monolithic memory evaluation.

---

### Task 1: Bind the package candidate to the nine-row TypeScript oracle

**Files:**
- Create: `packages-galerina/galerina-tower-citizen/tests/verdict-or-fungi-conversion.test.mjs`
- Create after RED: `packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-or.fungi`
- Modify after RED: `packages-galerina/galerina-tower-citizen/package.json`

**Interfaces:**
- Consumes: exported TypeScript `vOr`, `Verdict`, a hand-derived nine-row K3 maximum table, Galerina `parseProgram`, `checkEffects` and `executeFlow`.
- Produces: `pure flow vOrVerdict(left: Verdict, right: Verdict) -> Verdict` and one exact `packageGraph.loadedAssets` entry.

- [ ] **Step 1: Write the failing ownership and parity test**

Create nine literal triples, require the missing asset and loaded-asset entry, bind the exported `return asVerdict(maxTrit(a, b))` source chain, reject forbidden syntax and compare TypeScript plus interpreted Fungi values for every row. Expectations must be literal and independent of `vOr`, `maxTrit`, numeric `Math.max` and the candidate.

- [ ] **Step 2: Run RED**

Build Tower-Citizen, then run only the new test. It must fail because `verdict-or.fungi` is absent, not because the fixture or imports are wrong.

- [ ] **Step 3: Add the minimal typed candidate and declaration**

```fungi
@version 1
pure flow vOrVerdict(left: Verdict, right: Verdict) -> Verdict {
  check(left) {
    deny: { return right }
    ambig: {
      check(right) {
        deny: { return Verdict.Unknown }
        ambig: { return Verdict.Unknown }
        if: { return Verdict.Allow }
      }
    }
    if: { return Verdict.Allow }
  }
}
```

Add `src/self-hosted/verdict-or.fungi` to `packageGraph.loadedAssets` without changing runtime exports or entrypoints.

- [ ] **Step 4: Run GREEN and strict checks**

Run the focused test, existing K3 truth-table tests and strict candidate check. All nine rows must pass with zero candidate diagnostics.

- [ ] **Step 5: Commit the candidate wave**

Stage only the test, candidate and package declaration. Commit `add slice 92 verdict or candidate`.

### Task 2: Prove the two-Verdict physical SLIDE/VOK boundary

**Files:**
- Create: `scripts/tests/tower-citizen-vor-fungi-slide.integration.test.mjs`

**Interfaces:**
- Consumes: exact candidate bytes and the pinned sibling SLIDE compiler, publication, re-admission, execution and receipt modules.
- Produces: one physical proof with parameter type IDs `[3, 3]`, result type ID `3` and safe-value type `verdict`.

- [ ] **Step 1: Write the physical proof**

Compile one package/export, require exact type IDs, publish to a fresh directory, re-admit for each of the nine rows, execute with bounded steps and verify the typed receipt with `fallbackInvoked: false` and `authorityReleased: false`.

- [ ] **Step 2: Add hostile-boundary assertions**

Require refusal for missing and surplus arguments; Boolean, String and object inputs; non-K3 integers in either position; exhausted work; mutated source, artifact, receipt fields and every safe-value-envelope byte.

- [ ] **Step 3: Run the exact physical test**

Set `GALERINA_SLIDE_REPO` to the clean pinned sibling and run only the new integration test. No skip is accepted.

- [ ] **Step 4: Fail closed on valid-path refusal**

Record the exact diagnostic, remove candidate and declaration, retain stable negative evidence and do not substitute integers, compose De Morgan helpers or widen SLIDE.

- [ ] **Step 5: Commit the physical proof**

Stage only the integration test. Commit `prove slice 92 through physical slide`.

### Task 3: Close the governed slice

**Files:**
- Create: `docs/reports/slice-92-verdict-or-fungi-conversion-2026-08-13.md`
- Modify: `docs/reports/fungi-conversion-batch-33-42-file-status.md`
- Modify: `docs/reports/galerina-conversion-and-assurance-status-2026-08-13.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Regenerate only registered relevant outputs after authored inputs are committed.

**Interfaces:**
- Consumes: candidate-specific package and physical results, current skill repository heads and registered owner outputs.
- Produces: one exact Slice 92 receipt, current ledgers and bounded generated evidence.

- [ ] **Step 1: Run the complete Tower-Citizen package lane**

Require the entire package suite to pass with no unexpected skip or warning.

- [ ] **Step 2: Review both private Fungi skills**

Record `NO_SKILL_UPDATE` if existing typed Verdict, nested check and physical-profile guidance already covers the result. Otherwise update privately RED-first, verify and record the exact local commit. Never publish or push.

- [ ] **Step 3: Write receipt and authored status**

Record the nine-row table, pinned identities, `Threadability: PARALLEL_PURE`, exact bounded result, skill disposition and explicit retention of TypeScript.

- [ ] **Step 4: Run bounded closure checks**

Run the slice-receipt audit and self-test, canonical counts, path/private leak gates, semantic graph check, percentage freshness, status and roadmap checks. Excluded aggregate lanes stay excluded.

- [ ] **Step 5: Commit, regenerate registered owners and refresh indexes**

Commit authored documents first. Regenerate registered roadmap/subway/project-graph owners against that commit, verify them and commit only their outputs. At final HEAD, moderately refresh codebase-memory and require exact expected nodes, exact `indexed_head_sha`, `stale: false` and a queryable Slice 92 symbol. Re-index Myco and report its bounded counts.
