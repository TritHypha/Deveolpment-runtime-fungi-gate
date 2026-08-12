# Galerina/SLIDE and Galerina/Wasm Historical Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one provenance-bound historical HTML chart containing only Galerina/SLIDE and Galerina/Wasm without claiming a comparison the JSON evidence cannot support.

**Architecture:** A small pure model/renderer reads admitted benchmark arrays and metadata supplied by a publication entry point. The model counts exact lane observations and refuses lane promotion; the renderer publishes a two-row evidence chart with no speed ratio when there is no shared production workload.

**Tech Stack:** Node.js ESM, `node:test`, self-contained HTML and SVG, SHA-256.

## Global Constraints

- Only an exact `slide` lane is production SLIDE.
- `slideReference` remains reference-only.
- No winner, ranking, or speed percentage is allowed without the same admitted workload and unit.
- Output contains no external dependency or executable browser script.
- All published source records carry an exact relative path, timestamp, Git revision where available, and SHA-256 digest.

---

### Task 1: Historical evidence model and renderer

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/slide-wasm-history-report.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/slide-wasm-history-report.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`

**Interfaces:**
- Consumes: parsed benchmark arrays plus an exact provenance record.
- Produces: `buildSlideWasmHistoryModel(input)` and `buildSlideWasmHistoryHtml(model)`.

- [ ] **Step 1: Write the failing tests**

Test that a Wasm archive plus a current `slideReference` produces exactly two
product rows, labels SLIDE reference-only and production-unmeasured, includes
exact digests/timestamps, and emits no winner or speed percentage. Test that
`slideReference` cannot become production `slide` and malformed provenance
refuses.

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test test/slide-wasm-history-report.test.mjs` from the benchmark
package. Expected: module-not-found because the report module does not exist.

- [ ] **Step 3: Implement the minimal pure model and HTML renderer**

Validate plain data, exact source metadata, finite measurements, and admitted
unit state. Count `wasm`, `slide`, and `slideReference` observations separately.
Render only the Galerina/SLIDE and Galerina/Wasm rows; disclose the missing
shared production workload instead of calculating a ratio.

- [ ] **Step 4: Run focused and package tests**

Run `node --test test/slide-wasm-history-report.test.mjs`, then `npm.cmd test`.
Expected: zero failures.

### Task 2: Provenance-bound publication

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/build-slide-wasm-history.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/results/benchmark-slide-vs-wasm-history-latest.html`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`

**Interfaces:**
- Consumes: the frozen Wasm archive, the dated 2026-08-12 result record, and its metadata.
- Produces: an atomic HTML publication at the named result path.

- [ ] **Step 1: Add a failing publication test**

The test requires source digests to be recomputed before rendering and requires
an existing output to remain unchanged when a digest is wrong.

- [ ] **Step 2: Run the publication test and verify RED**

Run the focused test. Expected: missing publication function.

- [ ] **Step 3: Implement exact reads, digest checks, and atomic publication**

Read the two JSON records and metadata with bounded size, hash the raw bytes,
verify the recorded digest, build the model, and replace the latest HTML only
after the complete page is ready.

- [ ] **Step 4: Generate and inspect the artifact**

Run `node src/build-slide-wasm-history.mjs`. Confirm the output names only the
two products, records the source timestamps and digests, and states that no
production speed comparison exists.

- [ ] **Step 5: Run benchmark integrity verification**

Run `npm.cmd test` and `npm.cmd run audit`. Expected: zero failures and no
integrity refusal.

### Task 3: Commit, regenerate owners, and refresh the graph

**Files:**
- Modify only outputs required by registered owners after the package change.

**Interfaces:**
- Consumes: the verified source and generated artifact.
- Produces: local commits and a graph index whose build point equals final HEAD.

- [ ] **Step 1: Review the exact diff and commit source plus chart**

Stage only the spec, plan, benchmark module, test, package manifest, and chart.
Commit locally; do not push.

- [ ] **Step 2: Run registered package/output owners**

Regenerate only outputs that report drift, in dependency order, and commit
those outputs separately.

- [ ] **Step 3: Re-run focused verification at final HEAD**

Run the focused test, package test, benchmark audit, and registered drift
checks. Record exact exit codes and counts.

- [ ] **Step 4: Refresh and verify codebase-memory**

Index the repository in moderate mode. Require `status=indexed`, node counts
near expected, `indexed_head_sha` equal to final HEAD, and a symbol lookup for
`buildSlideWasmHistoryModel`.
