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
3. Measure and publish the current environmental noise floor.
4. Run the SLIDE evidence audit and benchmark truth audit as distinct stages.
5. Invoke the existing full chart owner, which generates the comparison
   Markdown, report model, general historic-control chart, SLIDE-zero chart and
   SLIDE-zero HTML table in its registered order.
6. Generate the historic WASM-zero transition page.
7. Snapshot the new result into benchmark history and generate the fresh diff.
8. Run the benchmark regression guard against that fresh noise/history pair.
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
stage order (`measure`, `noise`, `audit-vade`, `audit-truth`, `render`,
`wasm-history`, `history`, `guard`), direct argv, first-failure stop, timeout/signalled refusal,
missing/empty output refusal, and receipt schema. Package tests, truth audit,
path-leak audit and diff checks must pass before the automation is committed.
The expensive full measurement is deliberately not repeated during this
housekeeping change; its next invocation is the user-facing automation itself.
