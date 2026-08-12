# Fungi Conversion Batch 33–42 File Status

This is the live operational register for the ten-slice batch. The binding
design and work ledger are in
[`../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md`](../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md).
The active roadmap is updated once after all ten slices settle.

## Status vocabulary

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No candidate authority or implementation exists. |
| `PENDING` | Selected or required, but work has not begun. |
| `IN_PROGRESS` | Work exists but its required proof is incomplete. |
| `DONE` | The file's current batch responsibility has fresh focused evidence. |
| `ERROR` | A reproducible failure is under investigation. |
| `BLOCKED` | A verified authority or capability boundary prevents completion. |

## Slice files

| Slice | TypeScript/MJS source | Fungi asset | Focused test | Physical status | Overall |
|---:|---|---|---|---|---|
| 33 | `packages-galerina/galerina-core-config/src/index.ts#isEnvironmentMode` | `packages-galerina/galerina-core-config/src/self-hosted/environment-mode.fungi` | `packages-galerina/galerina-core-config/tests/environment-mode-fungi-conversion.test.mjs` | Candidate compiles and executes; exhaustion probe must use the step budget. | `IN_PROGRESS` |
| 34 | `packages-galerina/galerina-core-runtime/src/structured-await.ts#isTerminalScope` | `packages-galerina/galerina-core-runtime/src/self-hosted/terminal-scope.fungi` | `packages-galerina/galerina-core-runtime/tests/terminal-scope-fungi-conversion.test.mjs` | Candidate compiles and executes; exhaustion probe must use the step budget. | `IN_PROGRESS` |
| 35 | `packages-galerina/galerina-core-tasks/src/load-tasks.ts#isTaskEffect` | `packages-galerina/galerina-core-tasks/src/self-hosted/task-effect.fungi` | `packages-galerina/galerina-core-tasks/tests/task-effect-fungi-conversion.test.mjs` | Independent SLIDE scalar compiler refuses the exact source; root cause is being isolated. | `ERROR` |
| 36 | `packages-galerina/galerina-data-model/src/index.ts#isResponseSafeClassification` | `packages-galerina/galerina-data-model/src/self-hosted/response-safe-classification.fungi` | `packages-galerina/galerina-data-model/tests/response-safe-classification-fungi-conversion.test.mjs` | Candidate compiles; one exact runtime input is refused and is being isolated. | `ERROR` |
| 37 | `packages-galerina/galerina-devtools-context/src/receipt-generator.ts#isBuiltin` | `packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi` | `packages-galerina/galerina-devtools-context/tests/builtin-name-fungi-conversion.test.mjs` | Independent SLIDE scalar compiler refuses the exact source; root cause is being isolated. | `ERROR` |
| 38 | selection pending | not created | not created | not started | `NOT_STARTED` |
| 39 | selection pending | not created | not created | not started | `NOT_STARTED` |
| 40 | selection pending | not created | not created | not started | `NOT_STARTED` |
| 41 | selection pending | not created | not created | not started | `NOT_STARTED` |
| 42 | selection pending | not created | not created | not started | `NOT_STARTED` |

## Shared implementation and governance files

| File | Responsibility | Status |
|---|---|---|
| `docs/superpowers/specs/2026-08-12-five-scalar-classifiers-fungi-conversion-design.md` | Bound design for Slices 33–37; a second bound design is required before Slices 38–42 are admitted. | `DONE` |
| `docs/superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md` | Batch work ledger and link to this register. | `IN_PROGRESS` |
| `governance/conversion-queue-decisions.json` | Five current symbol-scoped candidate decisions; five more are pending. | `IN_PROGRESS` |
| `build/conversion-queue/queue.json` | Generated five-candidate queue; regenerate after Slices 38–42 are selected. | `IN_PROGRESS` |
| `build/conversion-queue/QUEUE.md` | Human-readable generated queue. | `IN_PROGRESS` |
| `scripts/lib/scalar-classifier-fungi-proof.mjs` | Shared interpreter and signed-Wasm differential proof helper. | `DONE` |
| `packages-galerina/galerina-core-compiler/src/interpreter.ts` | Preserve quoted reserved names as String match patterns. | `DONE` |
| `packages-galerina/galerina-core-compiler/tests/wat-string-match.test.mjs` | Interpreter/Wasm regression for quoted reserved names. | `DONE` |
| `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs` | Distinct physical SLIDE/VOK receipts and refusals for the batch. | `IN_PROGRESS` |
| `governance/phase-close-commands.json` | Register the physical batch test in the governed test inventory. | `IN_PROGRESS` |

## Deferred shared closure files

These remain `NOT_STARTED` until all ten slice proofs settle:

- `docs/TODO.md`
- `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- `build/component-health/roadmap-subway.svg`
- generated package, project, KB, inventory, semantic, status, percentage and
  code-index outputs
- public Fungi skill repositories

## Verified refusal retained outside the batch

`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#requiresAuth`
is `BLOCKED_BY_BOOTSTRAP_FLOOR`. Its negative design record is complete; it is
not one of Slices 33–42 and no Fungi asset was produced.
