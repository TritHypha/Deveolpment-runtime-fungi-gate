# Dated SLIDE-Zero Benchmark Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a dated, provenance-bound SLIDE-zero chart and HTML table alongside the existing benchmark report.

**Architecture:** Add a pure target-comparison model and two offline renderers. The publication layer captures exact repository, toolchain, input-digest, transition-contract, and archived-Wasm references once and writes stable latest plus immutable dated artifacts.

**Tech Stack:** Node.js ESM, `node:test`, SVG, self-contained HTML, SHA-256, Git and local toolchain probes.

## Global Constraints

- Production `slide` is the only allowed zero baseline.
- `wasm` and `slideReference` remain separately labelled non-substitutes.
- Missing production SLIDE yields `DEFERRED_NO_SLIDE_LANE`, no invented winner or place.
- Comparison peers are Rust, Go, Node.js, and Python.
- One UTC timestamp binds all files from one report generation.
- HTML contains no script and no external resource.

---

### Task 1: Pure target comparison model

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/slide-zero-report.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/slide-zero-report.test.mjs`

**Interfaces:**
- Consumes: admitted cross-language rows and a metadata object.
- Produces: `buildSlideZeroModel(report, metadata)`, `buildSlideZeroChartHtml(model)`, and `buildSlideZeroTableHtml(model)`.

- [ ] **Step 1: Write failing pure tests**

Use literal fixtures to assert SLIDE equals zero, a faster Rust rate produces a positive percentage, a slower Python rate produces a negative percentage, the winner and Galerina place are correct, and no production SLIDE produces `DEFERRED_NO_SLIDE_LANE` with no ranking. Assert hostile labels are escaped and rendered HTML has no `<script>` or URL.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test packages-galerina/galerina-devtools-benchmarks/test/slide-zero-report.test.mjs`

Expected: module-not-found failure.

- [ ] **Step 3: Implement the minimal pure model and renderers**

Select only keys `slide`, `rust`, `go`, `nodejs`, and `python`. Admit percentage differences only for aligned positive rates. Derive `((peer - slide) / slide) * 100`; render SVG bars around the zero axis and a semantic HTML table containing status, winner, place, references, and exclusions.

- [ ] **Step 4: Run focused tests**

Run: `node --test packages-galerina/galerina-devtools-benchmarks/test/slide-zero-report.test.mjs`

Expected: all tests pass.

---

### Task 2: Provenance-bound publication

**Files:**
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/report.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Test: `packages-galerina/galerina-devtools-benchmarks/test/slide-zero-report.test.mjs`

**Interfaces:**
- Consumes: `results/latest.json`, transition contract/archive, Git revisions, and toolchain version commands.
- Produces: `results/benchmark-slide-zero-latest.html`, `results/benchmark-slide-zero-table-latest.html`, `results/benchmark-run-metadata-latest.json`, and timestamped counterparts under `results/runs/<UTC stamp>/`.

- [ ] **Step 1: Add failing metadata/publication tests**

Assert the rendered pages show one exact UTC timestamp, Galerina revision, SLIDE revision, latest-result SHA-256, archived Wasm directory and digest, and Node/Python/Rust/Go versions. Assert malformed or missing required metadata refuses.

- [ ] **Step 2: Observe RED**

Run: `node --test packages-galerina/galerina-devtools-benchmarks/test/slide-zero-report.test.mjs`

Expected: missing metadata validation/publication behaviour fails.

- [ ] **Step 3: Add one-shot metadata capture and atomic publication**

Capture the timestamp once, probe each revision/toolchain with bounded child processes, hash `latest.json`, validate every string, create the dated directory, and publish each file through a temporary sibling followed by rename. Keep the existing report/chart outputs unchanged.

- [ ] **Step 4: Run package verification**

Run: `npm.cmd --prefix packages-galerina/galerina-devtools-benchmarks test`

Run: `npm.cmd --prefix packages-galerina/galerina-devtools-benchmarks run audit`

Expected: both exit 0.

---

### Task 3: Regenerate and benchmark

**Files:**
- Update through registered owners: `build/**`
- Update through benchmark owner: `packages-galerina/galerina-devtools-benchmarks/results/**`
- Modify after evidence: `docs/TODO.md`
- Modify after evidence: `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`

**Interfaces:**
- Consumes: authoritative generator policy, safe package rebuild, native benchmark builders, full benchmark runner.
- Produces: fresh registered build outputs, fresh unsigned package artifacts, full raw results, dated chart/table, and an evidence-backed roadmap record.

- [ ] **Step 1: Inventory protected build custody**

Record relative paths and SHA-256 hashes of key/certificate/signature-shaped files before regeneration. Never print file contents.

- [ ] **Step 2: Regenerate without deletion**

Run the core-chain builder, `rebuild-fusable-packages.mjs --strict --rebuild-all`, then every `generate` command declared by `governance/tooling-policy.json` in dependency order. Run every matching policy `check` command after publication.

- [ ] **Step 3: Verify protected custody**

Re-hash the protected inventory and refuse if any ceremony-owned file changed without its registered owner explicitly requiring it.

- [ ] **Step 4: Build and run the full benchmark**

Run the native builder, then the full non-quick benchmark runner. Generate the report, dated chart, and dated table. Do not substitute a quick or reference lane.

- [ ] **Step 5: Analyse unusual results**

Report unit exclusions, missing Go implementations, variance over 10%, work-equivalence refusals, winner/place for each admitted benchmark, and whether production SLIDE existed. Do not assign a winner/place where the production lane is absent.

- [ ] **Step 6: Update roadmap evidence and owners**

Record the exact timestamp, revisions, result digest, Wasm archive reference, outcome, and remaining blocker. Regenerate status, subway, code index, dev-tool index, project graph, and knowledge graph through their owners.

- [ ] **Step 7: Final verification and commit**

Run focused benchmark tests/audits and every registered generator check in bounded commands. Verify Git status and hashes, then commit only the owned changes locally; do not push.

