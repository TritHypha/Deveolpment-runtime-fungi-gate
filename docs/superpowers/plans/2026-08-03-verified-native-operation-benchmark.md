# Verified Native-Operation Comparison Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an honest one-million-read Node.js/Python/Rust/SLIDE-reference
comparison while preserving the production SLIDE authority gate.

**Architecture:** Ordinary runtime controls live in one benchmark directory.
A strict adapter consumes one pinned SLIDE publication and exposes both its
checked-peer rate and its VOK demand rate, plus all phase medians, as two
non-authorizing, unranked reference lanes. The existing benchmark unit,
integrity and report models own comparison admission.

**Tech Stack:** Node.js ESM, Node test runner, Python 3, standalone `rustc`,
JSON contracts/evidence, Markdown.

## Global constraints

- Zero trust: verify, do not assume; any unknown evidence state refuses.
- Fail closed: missing or malformed SLIDE evidence never releases authority.
- The laboratory lanes are `checkedReference` and `slideReference`; production
  remains exclusively `slide`.
- All runtime lanes perform exactly 1,000,000 signed 32-bit indexed reads and
  return `999999`.
- Demand throughput is `element-reads/s`; SLIDE preparation, compilation and
  total times remain separately visible and lower-is-better.
- No absolute workstation paths appear in committed files.
- Child processes remain serial and bounded; Node process counts are checked.
- Commit locally and never push.

---

### Task 1: Strict SLIDE reference evidence adapter

**Files:**

- Create: `packages-galerina/galerina-devtools-benchmarks/src/verified-native-operation-adapter.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/contracts/slide-verified-native-operation-admission-v1.json`
- Create: `packages-galerina/galerina-devtools-benchmarks/evidence/slide-verified-native-operation-reference.json`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-adapter.test.mjs`

**Interfaces:**

- Produces: `admitVerifiedNativeOperationEvidence(path, hostFacts?)` returning
  a frozen `{ verdict, status, failureId, referenceOnly, authorityReleased,
  iterations, result, checkedReference, slideReference, phases, provenance }`
  record. Each reference subrecord carries its own `operationsPerSecond`.
- Produces: `readVerifiedNativeOperationContract()` for the pinned closed
  contract.

- [ ] **Step 1: Write the failing positive and hostile-mutation tests**

Use the real committed evidence. Assert the literal accepted result
`iterations = 1000000`, `result = 999999`, both reference rates,
`referenceOnly = true`, and `authorityReleased = false`. Clone the evidence
into a temporary directory and
mutate one sample, one median, one phase total, the commit, the platform and the
publication digest; every mutation must return verdict `-1`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --test-concurrency=1 test/verified-native-operation-adapter.test.mjs
```

Expected: failure because the adapter module does not exist.

- [ ] **Step 3: Implement the smallest closed verifier**

Read at most the contract's declared byte ceiling, reject links/directories,
parse canonical UTF-8 JSON, require exact records, reproduce both domain-
separated digests, verify every phase sample and derived number, then return a
rate derived only from the admitted SLIDE demand median.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run the Step 2 command. Expected: all tests pass with zero skips.

### Task 2: Equivalent native controls

**Files:**

- Create: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/node.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/python.py`
- Create: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/bench.rs`
- Create: `packages-galerina/galerina-devtools-benchmarks/benchmarks/verified-native-operation/bench-slide-reference.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/verified-native-operation-controls.test.mjs`

**Interfaces:**

- Each executable prints one JSON object containing `runtime`, `iterations`,
  `result`, `samplesNs`, `medianNs`, `operationsPerSecond`, `unit` and
  `antiElision`.
- `bench-slide-reference.mjs` produces both `checkedReference` and
  `slideReference` surfaces plus `phases`, `referenceOnly` and
  `authorityReleased` from Task 1.

- [ ] **Step 1: Write a failing integration test for the Node control**

Spawn only `node.mjs`; assert the literal result/iteration/unit contract and an
odd positive sample set. Expected RED: the file is absent.

- [ ] **Step 2: Implement and pass the Node control**

Prepare `Int32Array(1000000)` outside timing, use two warmups and nine demand
samples, traverse every index, retain an anti-elision observation, and print
one JSON record.

- [ ] **Step 3: Extend the test to Python and verify RED**

Probe `python3`, then `python`; skip only when neither executable exists. Assert
the same literal semantic contract. Expected RED: `python.py` is absent.

- [ ] **Step 4: Implement and pass the Python control**

Use `array('i', range(1000000))`, `perf_counter_ns`, two warmups and nine
samples. Preparation remains outside timing.

- [ ] **Step 5: Extend the test to Rust and verify RED**

Compile `bench.rs` into a temporary output with `rustc -O`, run it, and assert
the same semantic contract. Expected RED: `bench.rs` is absent.

- [ ] **Step 6: Implement and pass the Rust control**

Use `Vec<i32>`, `Instant`, two warmups and nine samples. Use
`std::hint::black_box` so all reads remain observable to the optimiser and
report that mechanism in `antiElision`.

- [ ] **Step 7: Add and pass the SLIDE reference wrapper**

Call Task 1 with the committed evidence path and emit its admitted record. Do
not import SLIDE source directly and do not rename the lane to `slide`.

### Task 3: Catalog, unit and reporting integration

**Files:**

- Modify: `packages-galerina/galerina-devtools-benchmarks/src/runner.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/throughput-units.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/audit-benchmark-integrity.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/report-model.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/src/compare.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Modify: affected tests in `packages-galerina/galerina-devtools-benchmarks/test/`

**Interfaces:**

- Catalog ID: `verified-native-operation`.
- Required subject lanes: `checkedReference` and `slideReference`, for this ID
  only; either one missing makes publication incomplete.
- Unit: `element-reads/s`, `N = 1000000`, comparable true.
- Report runtimes: `{ key: "checkedReference", label: "Checked reference - no
  permission", ranked: false }` and `{ key: "slideReference", label: "SLIDE
  reference - permission present", ranked: false }`.

- [ ] **Step 1: Add failing catalog/unit/report tests**

Assert that the benchmark normalizes every available lane to
`element-reads/s`, fails when either reference subject is absent, displays both
permission variants, excludes both from winner selection, and leaves Galerina
production place as `not measured`.

- [ ] **Step 2: Run the affected tests and verify RED**

Run the throughput, interpretation, report and runner-output test files
serially. Expected failures: missing catalog/spec/reference definitions.

- [ ] **Step 3: Implement the minimal integration**

Add the catalog entry, special reference runner, unit spec, subject mapping,
unranked report column and package graph assets/entrypoint. Preserve `slide` as
the only transition candidate key.

- [ ] **Step 4: Run the affected tests and verify GREEN**

Run the Step 2 set and the benchmark integrity self-test.

### Task 4: Focused measurement and documentation

**Files:**

- Create: `docs/examples/CHECKED-MILLION-ITERATION-LOOP.fungi`
- Modify: `docs/examples/VERIFIED-NATIVE-OPERATION-BOUNDARY.md`
- Modify: `docs/TODO.md`
- Modify: `docs/ROADMAP.md`
- Generate: benchmark package focused result/report artifacts under `results/`

**Interfaces:**

- Documentation names the winning measured production-language control, shows
  the SLIDE reference observation separately, and records both higher-is-better
  throughput and lower-is-better SLIDE phase meanings.

- [ ] **Step 1: Build the Rust controls**

Run `node src/build-native.mjs`; inspect the verified-native-operation build
lines and preserve any unavailable optional toolchain as an explicit skip.

- [ ] **Step 2: Run the focused benchmark with process accounting**

Record Node process count before and after:

```powershell
node --expose-gc src/runner.mjs --benchmark verified-native-operation
```

Require exit zero, one result per available control, exact semantic parity,
unit status `PASS`, and no process-count increase.

- [ ] **Step 3: Update the example, TODO and roadmap**

Document the permission-absent and permission-present source forms, observed
values, their direct ratio, winner meaning, reference-only boundary, current
gaps and the exact evidence filename. Do not describe either reference
measurement as production SLIDE.

- [ ] **Step 4: Run bounded package verification**

Run serial package tests, `audit:slide-vade:selftest`, benchmark integrity
self-test and the package audit. Verify process counts before and after.

- [ ] **Step 5: Regenerate repository graph evidence and commit locally**

Run the repository graph generator/checker according to `AGENTS.md`, inspect
the staged diff, run path-leak and documentation-drift guards, commit the
coherent change, and do not push.
