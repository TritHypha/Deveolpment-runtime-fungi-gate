# Benchmark Run-to-Graph Automation Design

## Purpose

Provide one repository-owned command that performs a complete, non-quick
benchmark measurement and publishes every current benchmark report and graph
only after the measurement and truth boundaries pass.

## Decision

Add a small Node.js orchestrator to `galerina-devtools-benchmarks`. It invokes
the existing benchmark owners as separate direct-argument child processes in a
fixed dependency order. It does not duplicate benchmark, audit, comparison or
rendering logic, and it never uses shell command composition.

The command is intended for the next full benchmark run. It does not execute a
second full benchmark while being implemented or tested.

## Pipeline

1. Run the unfiltered, non-quick measurement owner with garbage-collection
   support.
2. Require a successful process exit and fresh `latest.json` plus measurement
   provenance.
3. Run the benchmark truth and SLIDE evidence audits.
4. Generate the comparison model and Markdown report.
5. Generate the general historic-control chart and HTML table outputs.
6. Generate the SLIDE-zero publication outputs.
7. Generate the historic WASM-zero transition page.
8. Run the benchmark regression guard.
9. Emit one bounded JSON receipt naming every stage, exit status and required
   output. A receipt is evidence about the orchestration only and releases no
   runtime or production authority.

## Failure and publication contract

- Every child is launched without a shell and must exit exactly zero.
- The first failed, signalled or timed-out stage stops the pipeline; no later
  graph or report owner runs.
- Each publication stage must leave all of its registered output files present,
  regular and non-empty before the next stage starts.
- The orchestrator accepts no caller-selected script, output path or benchmark
  subset. This prevents a quick or filtered run from replacing full
  publication evidence.
- Existing owners retain atomic-publication and provenance responsibility. The
  orchestrator supplies sequencing, not new authority.
- Production SLIDE remains `0/18`; reference rows remain K3 `0`,
  `referenceOnly: true`, and `authorityReleased: false`.

## Interface

- `npm run benchmark:publish`: full measurement through final graphs.
- `node src/run-to-graph.mjs --self-test`: hermetic refusal and ordering test
  that never runs the real benchmark.
- Normal completion writes `results/benchmark-run-to-graph-latest.json` after
  all stages pass.

## Verification

Focused tests use injected process and filesystem adapters to prove exact
stage order, direct argv, first-failure stop, timeout/signalled refusal,
missing/empty output refusal, and receipt schema. Package tests, truth audit,
path-leak audit and diff checks must pass before the automation is committed.
The expensive full measurement is deliberately not repeated during this
housekeeping change; its next invocation is the user-facing automation itself.
