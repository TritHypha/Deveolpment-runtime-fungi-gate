# Benchmark Interpretation and SLIDE Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every generated benchmark row explain score direction, the admitted winner, production Galerina's place and green-tick meaning, while freezing an exact Galerina/Wasm archive for the future Galerina/SLIDE transition comparison.

**Architecture:** Add two pure modules: one derives per-workload interpretation from raw benchmark facts, and one validates and pairs a fixed archived Wasm lane with a future current SLIDE lane. `report.mjs` remains the filesystem orchestrator and renders only the pure model. The transition stays deferred until a real `slide` lane exists and fails closed on ambiguity.

**Tech Stack:** Node.js ESM, `node:test`, canonical JSON benchmark artifacts, generated Markdown/JSON/HTML, existing benchmark truth and freshness audits.

## Global Constraints

- Production Galerina means the generated Wasm production lane; `galerinaGoverned` remains a diagnostic interpreter.
- Higher-is-better rankings require an admitted unit-aligned throughput row.
- Memory rankings use non-negative heap bytes per operation; lower is better.
- Governance and uncertified rows receive no cross-runtime winner or place.
- The historical Wasm result is read from one exact archive and never reconstructed by rerunning Wasm.
- Missing, duplicate, malformed, non-finite or unit-mismatched transition inputs fail closed.
- Existing non-comparative SLIDE VADE evidence never becomes a benchmark lane.
- No new dependency or nested package is introduced.

---

### Task 1: Pure workload interpretation model

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/benchmark-interpretation.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/benchmark-interpretation.test.mjs`

**Interfaces:**
- Produces: `interpretBenchmark(benchmark, runtimeCatalog)` returning `{ direction, winner, galerinaPlace, explanation, memoryBytesPerOp }`.
- Produces: `bytesPerOperation(result)` for measured managed-runtime allocation only.
- Produces: `formatInterpretationCell(interpretation)` for Markdown-safe report text.
- Consumes: raw benchmark entries and the caller-owned runtime catalog.

- [ ] **Step 1: Write failing higher-is-better tests**

Use literal fixtures to require an aligned `mix-ops/s` row to name `Rust` as
winner and production `Galerina/Wasm` as `2nd of 3`, while excluding the
diagnostic interpreter from product placement.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test test/benchmark-interpretation.test.mjs`

Expected: module-not-found because the interpretation module does not exist.

- [ ] **Step 3: Implement the minimal throughput interpretation**

Export `interpretBenchmark`, validate finite non-negative rates, rank only the
catalog entries marked `ranked: true`, assign shared places to exact ties and
return `higher is better` only for admitted aligned throughput rows.

- [ ] **Step 4: Add failing memory, governance and uncertified tests**

Require lower non-negative bytes/op to win; negative heap deltas cannot win;
governance and unaligned rows must return `winner: no admitted winner` and no
Galerina ordinal.

- [ ] **Step 5: Run RED, implement the remaining branches, then run GREEN**

Run: `node --test test/benchmark-interpretation.test.mjs`

Expected final result: all interpretation tests pass.

- [ ] **Step 6: Commit the slice**

```text
git add packages-galerina/galerina-devtools-benchmarks/src/benchmark-interpretation.mjs packages-galerina/galerina-devtools-benchmarks/test/benchmark-interpretation.test.mjs
git commit -m "feat(bench): derive honest workload interpretations"
```

### Task 2: Frozen Galerina/Wasm to Galerina/SLIDE transition model

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/slide-transition.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/slide-transition.test.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/contracts/galerina-slide-transition-v1.json`
- Generate: `packages-galerina/galerina-devtools-benchmarks/results/archive/2026-08-02_galerina-wasm-before-slide/`

**Interfaces:**
- Produces: `validateTransitionContract(value)` returning a frozen admitted contract or throwing a bounded error.
- Produces: `buildSlideTransition({ contract, baseline, current })` returning `{ status, baselineLabel, candidateLabel, rows, exclusions }`.
- Consumes: archived `wasm` values and future current `slide` values only.

- [ ] **Step 1: Write failing deferred-state test**

Require a valid contract plus a current result with no `slide` lane to return
`DEFERRED_NO_SLIDE_LANE` and zero comparison rows.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test test/slide-transition.test.mjs`

Expected: module-not-found because the transition module does not exist.

- [ ] **Step 3: Implement strict contract validation and deferred state**

Accept only the exact schema and keys in the design; reject accessors/proxies,
duplicate workload IDs, unexpected lane names, malformed SHA-256 and absent
arrays before reading measurements.

- [ ] **Step 4: Add failing exact-pair and hostile-input tests**

Use literal same-unit fixtures to require archived `wasm=100` versus current
`slide=125` to report a 1.25x improvement. Require unit mismatch, missing
baseline work, non-finite values and duplicate IDs to produce explicit
exclusions or refusal according to the design.

- [ ] **Step 5: Run RED, implement pairing, then run GREEN**

Run: `node --test test/slide-transition.test.mjs`

Expected final result: all transition tests pass without reading live files.

- [ ] **Step 6: Capture the exact old production baseline**

Run from the benchmark package:
`npm.cmd run snapshot -- galerina-wasm-before-slide`

Record the archive result SHA-256
`abc564389dd98e8da68a57afedcc57c6b4733e5b20d34ba3423e73f0acb77567`
and measured Galerina commit
`54c15058988ab6a178ce014a2c1fed36f5a7fd63` in the contract. Refuse if the
generated archive bytes do not match that digest.

- [ ] **Step 7: Commit the slice**

```text
git add packages-galerina/galerina-devtools-benchmarks/src/slide-transition.mjs packages-galerina/galerina-devtools-benchmarks/test/slide-transition.test.mjs packages-galerina/galerina-devtools-benchmarks/contracts/galerina-slide-transition-v1.json packages-galerina/galerina-devtools-benchmarks/results/archive/2026-08-02_galerina-wasm-before-slide
git commit -m "feat(bench): freeze Wasm to SLIDE transition baseline"
```

### Task 3: Generated report integration

**Files:**
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/report.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/report-model.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Modify: `packages-galerina/galerina-devtools-benchmarks/README.md`

**Interfaces:**
- Produces: `buildReportMarkdown(reportModel)` as a pure renderer.
- Extends report JSON with `interpretation` per cross-language row and top-level `slideTransition`.
- Consumes: Task 1 interpretation and Task 2 transition outputs.

- [ ] **Step 1: Write a failing generated-Markdown model test**

Require the rendered report to contain the `Better`, `Winner` and `Galerina`
columns, the exact green-tick explanation, an admitted winner/place, an
uncertified no-winner statement and a deferred SLIDE transition section.

- [ ] **Step 2: Run the focused test and observe RED**

Run: `node --test test/report-model.test.mjs`

Expected: missing export or absent columns/legend.

- [ ] **Step 3: Implement the pure renderer and wire `report.mjs`**

Keep filesystem reads/writes in `report.mjs`. Render table annotations from
the model, load the exact transition contract/archive, and include transition
data in `benchmark-report-latest.json`. Do not alter raw measurements.

- [ ] **Step 4: Run focused tests and regenerate reports**

Run:

```text
node --test test/benchmark-interpretation.test.mjs test/slide-transition.test.mjs test/report-model.test.mjs
npm.cmd run report
```

Expected: focused tests pass; Markdown/JSON/HTML regenerate; transition status
is deferred because no production `slide` lane exists.

- [ ] **Step 5: Update user documentation**

Document score directions, tick semantics, production Galerina identity and
the future archived-Wasm/current-SLIDE workflow in the package README.

- [ ] **Step 6: Commit the slice**

```text
git add packages-galerina/galerina-devtools-benchmarks/src/report.mjs packages-galerina/galerina-devtools-benchmarks/test/report-model.test.mjs packages-galerina/galerina-devtools-benchmarks/package.json packages-galerina/galerina-devtools-benchmarks/README.md packages-galerina/galerina-devtools-benchmarks/results
git commit -m "feat(bench): explain winners and Galerina placement"
```

### Task 4: Repository evidence and close

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Modify: generated `build/` indexes and graph evidence as required.

**Interfaces:**
- Consumes: completed benchmark interpretation and transition artifacts.
- Produces: current roadmap/TODO and clean generated-evidence checks.

- [ ] **Step 1: Run the affected package suite**

Run: `npm.cmd test --prefix packages-galerina/galerina-devtools-benchmarks`

Expected: every test passes.

- [ ] **Step 2: Run benchmark publication gates**

Run:

```text
npm.cmd run audit --prefix packages-galerina/galerina-devtools-benchmarks
node packages-galerina/galerina-devtools-benchmarks/src/audit-benchmark-integrity.mjs --stale-only --json
npm.cmd run bench:guard --prefix packages-galerina/galerina-devtools-benchmarks
```

Expected: truth audit passes, report is fresh/catalog complete and no
attributable regression is reported.

- [ ] **Step 3: Update roadmap and TODO**

Record the interpreted report, exact old-Wasm archive, deferred transition
status and the one non-blocking owner rubric choice. Do not mark the terminal
SLIDE benchmark complete.

- [ ] **Step 4: Regenerate and verify repository graphs/indexes**

Run:

```text
node scripts/graph-all.mjs
node scripts/graph-all.mjs --quiet --check
node scripts/code-index.mjs
node scripts/gen-code-registry.mjs
```

Regenerate the benchmark root `report.md` from `compare.mjs` only if the
staleness gate requires it.

- [ ] **Step 5: Run final integrity checks**

Run `git diff --check`, parse every changed JSON file, rerun focused tests and
confirm the worktree contains only this task's files.

- [ ] **Step 6: Commit without pushing**

```text
git add <verified task files>
git commit -m "docs(bench): record interpreted transition baseline"
```

Report the remaining non-blocking rubric choice and any genuinely unresolved
engineering gate. Never push.
