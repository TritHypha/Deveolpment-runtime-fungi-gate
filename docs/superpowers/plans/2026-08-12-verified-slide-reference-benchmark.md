# Verified SLIDE Reference Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a real, work-equivalent SLIDE-reference comparison with SLIDE at zero while keeping production SLIDE explicitly deferred.

**Architecture:** Refresh the existing SLIDE verified-loop publication, admit it through the existing closed Galerina contract, and extend the history model with a separate reference comparison panel. The archived WASM panel and all production-authority rules remain unchanged.

**Tech Stack:** Node.js ESM, `node:test`, self-contained HTML, SHA-256, SLIDE VOK reference evidence.

## Global Constraints

- Never relabel `slideReference` as production `slide`.
- The reference panel must preserve K3 `0`, `referenceOnly: true`, and `authorityReleased: false`.
- Only exact one-million-read, `element-reads/s`, result-`999999` observations may be compared.
- Missing Go is disclosed, not synthesized.
- Historic WASM stays in a separate digest-bound panel.
- No push and no repository-wide crash-linked closure lanes.

---

### Task 1: Reference comparison model

**Files:**
- Modify: `packages-galerina/galerina-devtools-benchmarks/test/slide-wasm-history-report.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/slide-wasm-history-report.mjs`

**Interfaces:**
- Consumes: the existing `current` benchmark record passed to `buildSlideWasmHistoryModel(input)`.
- Produces: `model.slideReferenceComparison` with status, baseline, admitted peers, winner, Galerina place, and exclusions.

- [ ] **Step 1: Write the failing model tests**

Add a literal `verified-native-operation` fixture with SLIDE reference `100`, Rust `150`, Node `80`, Python `10`, and no Go. Assert SLIDE is `0`, Rust is `+50%`, Node is `-20%`, Python is `-90%`, Go is unavailable, Rust wins, and Galerina is second. Add a hostile fixture where `referenceOnly` is false and assert the comparison refuses.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test packages-galerina/galerina-devtools-benchmarks/test/slide-wasm-history-report.test.mjs`

Expected: failures because `slideReferenceComparison` is absent.

- [ ] **Step 3: Implement the smallest comparison derivation**

Derive the panel only from the exact `verified-native-operation` row. Require the fixed workload, unit, iteration count, result, positive finite rate, and reference/authority flags. Calculate deltas from the SLIDE reference rate and order admitted entries by rate descending.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run the same focused command and require zero failures.

### Task 2: Approved chart rendering

**Files:**
- Modify: `packages-galerina/galerina-devtools-benchmarks/test/slide-wasm-history-report.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/slide-wasm-history-report.mjs`

**Interfaces:**
- Consumes: `model.slideReferenceComparison`.
- Produces: a self-contained first panel with `SLIDE reference = 0`, signed peer bars, winner/place, and an explicit non-production statement.

- [ ] **Step 1: Write the failing rendering tests**

Assert the HTML contains the zero label, signed Rust/Node values, winner and Galerina place, missing-Go disclosure, `MEASURED_NON_AUTHORIZING`, and the historic WASM panel. Assert it contains neither `<script` nor `http://` nor `https://`.

- [ ] **Step 2: Run the focused test to verify RED**

Run the focused test and confirm failure is caused by the missing panel.

- [ ] **Step 3: Implement the panel**

Render the reference comparison above the historic WASM panel using the existing zero-axis visual language. Escape all dynamic text and keep the document mobile-first and offline.

- [ ] **Step 4: Run benchmark package verification**

Run the focused test, the benchmark package test suite, and the benchmark truth audit. Require zero failures.

### Task 3: Fresh measurement and publication

**Files:**
- Refresh through SLIDE owner: `../SLIDE/build/benchmarks/verified-loop-slide-object-latest.*`
- Update: `packages-galerina/galerina-devtools-benchmarks/evidence/slide-verified-native-operation-reference.json`
- Update: `packages-galerina/galerina-devtools-benchmarks/contracts/slide-verified-native-operation-admission-v1.json`
- Update through benchmark owners: `packages-galerina/galerina-devtools-benchmarks/results/**`
- Update after evidence: `docs/TODO.md`
- Update after evidence: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: the fresh SLIDE verified-loop publication and the full Galerina benchmark runner.
- Produces: a digest-bound admitted reference result plus refreshed chart, table, history page, report, and dated raw record.

- [ ] **Step 1: Run and verify the SLIDE owner**

Run `npm run benchmark:verified-loop-slide` in SLIDE, then its focused verifier/test. Require `MEASURED_NON_AUTHORIZING`, K3 `0`, exact result `999999`, nine samples, and no authority release.

- [ ] **Step 2: Refresh the Galerina admission packet**

Copy the exact verified publication into the evidence file, update the byte digest and bound fields in the contract, and run the existing adapter tests before any report generation.

- [ ] **Step 3: Run the bounded full benchmark**

Build native benchmark binaries, run the non-quick benchmark once, then generate the report and both charts. Do not run full tooling, normal phase-close, whole-memory evaluation, or post-roadmap graph-all.

- [ ] **Step 4: Verify and analyse**

Run package tests, truth audit, publication-integrity check, path-leak audit, and the registered benchmark owner checks. Report winner, Galerina place, signed deltas, missing Go, variance, and the production-deferred boundary.

- [ ] **Step 5: Refresh bounded owners and commit locally**

Update the TODO and roadmap with exact evidence, refresh only their registered owners and the codebase graph, verify a clean intended diff, and commit without pushing.

