# Benchmark Run-to-Graph Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one fail-closed command that performs the next full benchmark run and publishes every current report and graph in the correct order.

**Architecture:** A focused ESM orchestrator owns only process sequencing, required-output checks and a final bounded receipt. Existing measurement, audit, comparison and rendering programs remain the semantic owners and run as direct-argument child processes without a shell.

**Tech Stack:** Node.js ESM, `spawnSync`, `node:test`, JSON evidence, existing benchmark package owners.

## Global Constraints

- The normal command is unfiltered and non-quick.
- Every child process must exit exactly zero; first refusal stops all later stages.
- No shell composition, caller-selected scripts, caller-selected paths or fallback output.
- Required files must be regular and non-empty after their owning stage.
- Production SLIDE remains `0/18`; reference evidence remains K3 `0` and non-authorizing.
- Do not run the expensive full benchmark while implementing the automation.
- Commit locally and do not push.

---

### Task 1: Closed run-to-graph orchestrator

**Files:**
- Create: `packages-galerina/galerina-devtools-benchmarks/src/run-to-graph.mjs`
- Create: `packages-galerina/galerina-devtools-benchmarks/test/run-to-graph.test.mjs`
- Modify: `packages-galerina/galerina-devtools-benchmarks/package.json`
- Modify: `packages-galerina/galerina-devtools-benchmarks/README.md`
- Modify: `docs/TODO.md`

**Interfaces:**
- Consumes: the fixed package root, Node executable and existing owner scripts.
- Produces: `runBenchmarkToGraph(adapters)` returning a frozen receipt and CLI `--self-test`; normal CLI writes `results/benchmark-run-to-graph-latest.json`.

- [x] **Step 1: Write the failing orchestration tests**

Create injected fake process/filesystem adapters and assert the exact ordered
stage IDs: `measure`, `noise`, `audit-vade`, `audit-truth`, `render`,
`wasm-history`, `history`, `guard`. The `render` stage invokes the existing
`build-chart.mjs` owner, which already owns comparison, report, primary chart
and SLIDE-zero publication order. Assert direct Node argv, no shell,
first-failure stop, signalled/timeout refusal, and missing/empty required-output
refusal. Assert the final receipt has exact keys, all status values `PASS`,
`authorityReleased: false`, and no caller path fields.

- [x] **Step 2: Prove RED**

Run:

```powershell
node --test packages-galerina/galerina-devtools-benchmarks/test/run-to-graph.test.mjs
```

Expected: failure because `src/run-to-graph.mjs` does not exist.

- [x] **Step 3: Implement the closed stage table and runner**

Define one frozen stage table whose commands are fixed relative paths. Use
`spawnSync(process.execPath, args, { cwd: PACKAGE_ROOT, shell: false,
encoding: "utf8", timeout })`. After every successful child, validate that
each stage-owned path resolves below the fixed results directory and is a
regular non-empty file. Throw `BENCHMARK_RUN_TO_GRAPH_REFUSED:<STAGE>:<CAUSE>`
on the first failure. Only after all eight stages pass, atomically publish the
bounded JSON receipt.

- [x] **Step 4: Add the safe self-test and package command**

`--self-test` must use injected fake adapters and must never spawn the real
runner. Add `src/run-to-graph.mjs` to `packageGraph.entryPoints` and add:

```json
"benchmark:publish": "node src/run-to-graph.mjs",
"benchmark:publish:selftest": "node src/run-to-graph.mjs --self-test"
```

Document that `benchmark:publish` is the next-run entry point and normally
takes several minutes; `--self-test` is the only fast orchestration check.

- [x] **Step 5: Prove GREEN and close benchmark housekeeping**

Run:

```powershell
node --test packages-galerina/galerina-devtools-benchmarks/test/run-to-graph.test.mjs
npm run benchmark:publish:selftest
npm test
npm run audit
node scripts/audit-path-leak.mjs
git diff --check
```

Update `docs/TODO.md` with the automation command and explicitly state that the
full owner was not rerun during automation implementation. Commit the exact
Task 1 paths locally, refresh the code index, and verify its indexed commit or
record freshness as `UNKNOWN`.

Closure evidence: the focused orchestration suite is 6/6, its hermetic
self-test reports eight stages and no real benchmark spawn, the complete
benchmark package is 106/106, the truth/SLIDE audit is clean, and the scoped
path-leak and diff checks pass. The several-minute benchmark was not rerun.
