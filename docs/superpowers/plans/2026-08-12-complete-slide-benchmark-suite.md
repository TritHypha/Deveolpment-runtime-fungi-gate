# Complete SLIDE Benchmark Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure all 18 governed benchmark groups through physical, independently re-admitted SLIDE reference artifacts and publish complete SLIDE-zero and historic-WASM reports.

**Architecture:** A closed Galerina manifest defines the 18 identities and their work-equivalence contracts. SLIDE compiles each governed source through composable checked-Fungi capability sets, independently admits and executes the artifact, and returns a non-authorizing observation that Galerina verifies before comparison. Compiler/profile work proceeds in semantic cohorts so every increment is testable and no fallback runtime can fill a missing row.

**Tech Stack:** Galerina `.fungi`, Node.js ESM, `node:test`, SLIDE V2-C GIR and bundle encoding, independent VOK execution, SHA-256 evidence, self-contained HTML/SVG.

## Global Constraints

- The closed population is exactly 18 benchmark identities from the design.
- Every admitted result is K3 `0`, `referenceOnly: true`, and `authorityReleased: false`.
- Production `slide` remains absent; only `slideReference` is expanded.
- No WASM, interpreter, manifest, passive, bytecode, TypeScript or Node wrapper can become a SLIDE observation.
- A row requires exact work count, canonical unit, matching checksum and independently re-admitted physical `.slide` bytes.
- `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, and `loop` are forbidden in new `.fungi`; iteration uses bounded Boolean `while`.
- Unknown constructs, effects, encodings, budgets or host contracts refuse rather than widen.
- Do not run the crash-linked full-tooling, normal phase-close, whole-memory evaluation or post-roadmap `graph-all` lanes.
- Commit locally with explicit paths; do not push.

---

### Task 1: Closed 18-workload manifest and coverage gate

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/contracts/slide-reference-suite-v1.json`
- Create: `packages-galerina/galerina-devtools-benchmarks/src/slide-reference-suite.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/slide-reference-suite.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/runner.mjs`

**Interfaces:**
- Consumes: the canonical `BENCHMARKS` entries and `benchmarkSpec(id)` unit definitions.
- Produces: `readSlideReferenceSuite()` returning a deeply frozen 18-entry exact object; `auditSlideReferenceSuite()` returning `{ verdict, status, failureId, expected, measured }`.

- [x] **Step 1: Write the RED manifest tests**

Assert the exact ordered 18 IDs, exact-object parsing, duplicate/surplus/missing refusal, canonical unit agreement, tracked source ownership, and failure when the runner or report claims a different denominator. Include one mutation per field class.

- [x] **Step 2: Prove RED**

Run `node --test packages-galerina/galerina-devtools-benchmarks/test/slide-reference-suite.test.mjs`. Require failure because the reader and contract do not exist.

- [x] **Step 3: Implement the minimum closed reader**

Parse UTF-8 bytes with duplicate-key detection, compare exact keys, freeze nested entries, and cross-check identity/unit/source facts against live imported owners. Do not accept an arbitrary manifest path.

- [x] **Step 4: Wire coverage without adding measurements**

Make the runner and history model derive the expected count from the closed suite. Existing output must remain `0/18` production and `1/18` reference until later tasks add admitted observations.

- [x] **Step 5: Prove GREEN and commit**

Run the focused manifest and history-report tests, then the 72-test benchmark package. Commit only Task 1 files.

---

### Task 2: Prove the successor registry and close bounded scalar loops

**Files:**
- Modify: `../SLIDE/src/checked-fungi-pure-scalar-compiler.mjs`
- Modify: `../SLIDE/tests/checked-fungi-pure-scalar-compiler.test.mjs`
- Create: `../SLIDE/tests/fixtures/benchmark-composable-scalar.fungi`
- Modify when required by the emitted registry contract: `../SLIDE/src/v2c-reference-compiler.mjs`
- Test its registered owner under `../SLIDE/tests/`

**Interfaces:**
- Consumes: the existing lowered-module capability flags, append-only checked V2-C successor registries and bounded-loop certificate.
- Produces: proof that the smallest containing successor composes straight-line checked operations, then bounded mutable `while` lowering composed with that successor.

- [x] **Step 1: Prove the existing straight-line successor composition**

Use fixed Fungi source with a transitive flow call, checked multiplication, division, remainder and subtraction. Assert compile verdict `1`, the exact checked-remainder successor registry, physical bytes, reference-only flags, exact result and zero-divisor refusal. This proof is committed in SLIDE as `1a3f3e8`; it demonstrates that no new composite registry ID is required.

- [x] **Step 2: Write and prove RED for bounded mutable `while` composition**

Use a fixed Fungi fixture containing a canonical bounded `while`, mutable induction/state, a transitive flow call and the already-proved checked arithmetic combination. Assert the current generic source compiler refuses this exact vector before implementation.

- [x] **Step 3: Implement the minimum bounded-loop composition**

Reuse the existing certified counted-control successor and loop certificate. Add only the source/IR bridge needed for canonical mutable `while` state, exact induction progress and the existing arithmetic/call operations. Preserve every existing registry ID and reject unsupported source or registry combinations.

- [x] **Step 4: Add hostile combinations**

Test missing component, reordered flags, surplus registry, altered digest, excessive blocks, excessive calls, overflow, division by zero and remainder by zero. Every hostile case must refuse without authority release.

- [x] **Step 5: Prove GREEN and commit SLIDE**

Run the focused compiler, reference compiler, executor, bundle and admission tests. Commit the exact SLIDE paths locally.

Task 2 closed at SLIDE `5108cb0`. The admitted source shape is deliberately
narrow: one canonical constant-bound loop (`1..8`), exact zero start, unit
induction progress, unique mutable Int state, and no conditional/nested loop
body. It composes transitive calls and checked arithmetic through the existing
certified-counted-control successor. Focused compiler, executor, bundle,
contract, forbidden-state, path-leak and 93-test regression evidence passed;
the result remains reference-only and releases no authority.

---

### Task 3: Scalar benchmark cohort execution

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/slide-reference-runner.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/slide-reference-runner.test.mjs`
- Create or modify the governed source for `spectral-norm` under its benchmark directory
- Add the manifest-driven runner contract to the 11 scalar cohort directories without duplicating compiler logic
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/runner.mjs`

**Interfaces:**
- Consumes: one closed manifest entry, tracked source bytes and the registered SLIDE compiler/admission/execution entry points.
- Produces: `{ verdict, status, failureId, benchmark, result, workCount, throughput, throughputUnit, phases, provenance, referenceOnly, authorityReleased }`.

- [x] **Step 1: Write RED runner tests**

Start with `call-chain`. Assert exact result against its Node oracle, exact 50,000 work count, `chains/s`, positive finite throughput, physical artifact digests and reference-only flags. Add source mutation, wrong entry flow, wrong work count, wrong unit, wrong checksum and forged-authority refusals.

- [x] **Step 2: Prove RED**

Run the new runner test and require failure because no generic admitted runner exists.

- [x] **Step 3: Implement the smallest admitted runner**

Read only the manifest-owned source, compile, independently re-admit, execute fixed arguments, verify result and calculate timing outside the executed program. Never accept a caller-supplied function or path.

- [ ] **Step 4: Expand one workload at a time**

In this order add `compute-mix`, `collection-pipeline`, `low-memory`, `gpu-compute`, `matrix-multiply`, `tri-logic`, `data-query`, `nbody`, `mandelbrot`, then the newly authored `spectral-norm`. For each, first add a failing exact-result/work test, then make the minimum compiler/profile or source correction, strict-check the exact `.fungi`, and run the distinguishing vector.

- [ ] **Step 5: Prove cohort closure and commit**

Require 11/11 admitted reference observations, all peer checksum controls, compiler refusal tests and benchmark package tests. Commit Galerina source/runner evidence separately from generated output.

Chapter checkpoint, 2026-08-12: the reusable closed runner now admits
`call-chain`, `compute-mix`, and `collection-pipeline`; together with the
existing `verified-native-operation`, published reference coverage is **4/18**
while production remains **0/18**. The complete benchmark owner exited 0 in
349.7 seconds and retained physical-bundle, independent-prepare, exact
work/unit/checksum, K3 `0`, reference-only and no-authority constraints. Task 3
is intentionally still open: the remaining eight scalar profiles have not
been measured, and `record-allocation` belongs to Task 4 because scalar locals
are not evidence of real record allocation. End-of-chapter skill review:
`NO_SKILL_UPDATE`; this slice changed compiler/benchmark infrastructure but no
reusable `.fungi` authoring or TypeScript-to-Fungi translation rule.

---

### Task 4: Recursion, text/array and real-record cohorts

**Files:**
- Modify: `../SLIDE/src/checked-fungi-pure-scalar-compiler.mjs`
- Modify the exact SLIDE compiler/executor registry files selected by RED evidence
- Add focused SLIDE tests for bounded recursion, text/array composition and record construction
- Modify: `packages-galerina/galerina-devtools-benchmarks/benchmarks/record-allocation/benchmark.fungi`
- Modify: `packages-galerina/galerina-devtools-benchmarks/benchmarks/binary-trees/benchmark.fungi`
- Add runner tests for `tower-of-hanoi`, `binary-trees`, `json-parse`, and `record-allocation`

**Interfaces:**
- Consumes: Task 2 capability-set compiler and Task 3 admitted runner.
- Produces: four additional independently admitted observations with exact work-shape policies.

- [ ] **Step 1: RED bounded recursion**

Assert Tower of Hanoi result `42452`, 65,535 moves and a fixed recursion/work budget. Assert over-depth and over-work refusal. Then add binary-tree tests that require real node construction/traversal rather than count-only substitution.

- [ ] **Step 2: GREEN bounded recursion**

Add explicit depth and step accounting to the checked profile and executor. Do not enable general unbounded recursion. Prove both positive workloads and hostile budget vectors.

- [ ] **Step 3: RED then GREEN text/array composition**

Use `json-parse` to require split, length, checked `Array.get`, `Option` matching, loops and transitive calls in one registry set. Assert the checksum `12500` and refuse missing execution/text-comparison budgets.

- [ ] **Step 4: RED then GREEN real records**

Author a record type and construct one record per `record-allocation` iteration. Tests must distinguish it from scalar locals through allocation/accounting evidence. Refuse missing/surplus fields, wrong types, proxies/accessors at the host boundary and altered record descriptors.

- [ ] **Step 5: Strict-check, prove 15/18 and commit**

Run candidate-specific Galerina strict checks, focused SLIDE compiler/admission/execution tests and the benchmark runner tests. Commit each repository independently with explicit paths.

---

### Task 5: Existing verified operation and governed package boundaries

**Files:**
- Preserve and verify: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/bench-slide-reference.mjs`
- Create governed sources in `benchmarks/spore-container/` and `benchmarks/framework-pipeline/`
- Create component-specific SLIDE package compilers/adapters only where existing registered primitives cannot express the boundary
- Add focused tests in both repositories for exact package identity, grants, inputs, outputs and refusal behavior

**Interfaces:**
- Consumes: the existing verified-operation publication plus exact spore and app-kernel contracts.
- Produces: the final three observations, bringing the suite to 18/18.

- [ ] **Step 1: Reverify the existing operation**

Run the pinned publication, admission and mutation tests. Keep the current one-million-read result as a distinct evidence producer under the common suite contract.

- [ ] **Step 2: Build the spore source dossier and RED test**

Pin the exact container bytes, hash/root algorithm, work count, output digest and host/crypto boundary. Write a test that refuses any TS/Node fallback and requires the admitted `.slide` package to produce the golden container/root.

- [ ] **Step 3: Implement the minimum spore package path**

Reuse only registered deterministic crypto/container primitives with closed grants. If a primitive is absent, add it first with independent conformance vectors and mutation tests; do not invent a host API.

- [ ] **Step 4: Build the framework source dossier, RED test and implementation**

Represent the exact 12-gate request pipeline, K3 decisions and typed exits in `.fungi`. Require the same accepted/rejected request counts and fixed work count as the Node/Python controls. Bind every plugin/import/contract identity and deny broken or missing seals.

- [ ] **Step 5: Prove 18/18 and commit**

Require all three observations, package-specific refusal suites, strict checks, independent admission and exact peer checksums. Commit source and evidence separately.

---

### Task 6: Full measurement, reports and bounded closure

**Files:**
- Update through owners: `packages-galerina/galerina-devtools-benchmarks/results/**`
- Modify through tested report owners: the SLIDE-zero chart/table and historic-WASM page
- Update: `README.md`, `docs/TODO.md`, and `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- Update registered generated indexes, graph and subway outputs
- Review both public skill repositories and update only reusable verified guidance

**Interfaces:**
- Consumes: 18 admitted observations plus exact native peer results and archived WASM JSON.
- Produces: date-stamped raw JSON, SLIDE-zero chart, HTML table, historic-WASM page, provenance metadata and close report.

- [ ] **Step 1: Run the full benchmark once**

Build native controls, run the unfiltered non-quick owner with fixed environment metadata, and preserve raw stdout/stderr/exit evidence. Do not reuse a quick or partial record as latest.

- [ ] **Step 2: RED/GREEN publication coverage**

Before publication, assert exactly 18 unique admitted `slideReference` rows and reject missing, duplicate, surplus, non-finite, unit-mismatched or checksum-mismatched rows. Generate only after the RED gate becomes GREEN.

- [ ] **Step 3: Generate both requested report families**

Primary: SLIDE zero, signed Rust/Rust-AVX2/Node/Python/Go deltas, winner and Galerina place per workload. Secondary: historic WASM zero using only exact archived matches. Both must show population and coverage counts.

- [ ] **Step 4: Analyse unusual results**

Calculate variance and repeat any outlier in the same pinned environment. Label unexplained results non-causal. Never remove an outlier solely because it is inconvenient.

- [ ] **Step 5: Run bounded verification**

Run benchmark package tests, truth audit, freshness audit, publication self-test, path-leak audit, candidate-specific SLIDE suites, Golden audit, code-index check and roadmap/subway check. Keep repository-wide closure `UNKNOWN` unless the crash-linked lanes receive separate authority and complete successfully.

- [ ] **Step 6: Review skills, refresh indexes and commit locally**

Record a reusable skill update or `NO_SKILL_UPDATE`, refresh codebase-memory to the final commit and verify the exact indexed head plus a new symbol. Commit generated outputs separately and do not push.
