# Fungi Conversion Batch 33-46 File Status

This is the live operational register for the bounded conversion batch. The binding
design and work ledger are in
[`../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md`](../superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md).
The active roadmap is updated once at the bounded batch exit.

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
| 33 | `packages-galerina/galerina-core-config/src/index.ts#isEnvironmentMode` | `packages-galerina/galerina-core-config/src/self-hosted/environment-mode.fungi` | `packages-galerina/galerina-core-config/tests/environment-mode-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 34 | `packages-galerina/galerina-core-runtime/src/structured-await.ts#isTerminalScope` | `packages-galerina/galerina-core-runtime/src/self-hosted/terminal-scope.fungi` | `packages-galerina/galerina-core-runtime/tests/terminal-scope-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 35 | `packages-galerina/galerina-core-tasks/src/load-tasks.ts#isTaskEffect` | `packages-galerina/galerina-core-tasks/src/self-hosted/task-effect.fungi` | `packages-galerina/galerina-core-tasks/tests/task-effect-fungi-conversion.test.mjs` | The flat eight-label match exceeds the current physical wide-control ceiling. A two-helper, four-plus-four exact decomposition compiles and executes the first, last and surplus vectors; the bound design and asset still need amendment. | `IN_PROGRESS` |
| 36 | `packages-galerina/galerina-data-model/src/index.ts#isResponseSafeClassification` | `packages-galerina/galerina-data-model/src/self-hosted/response-safe-classification.fungi` | `packages-galerina/galerina-data-model/tests/response-safe-classification-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. The earlier refusal was the harness supplying a surplus text-work budget to an exact step-only profile. | `DONE` |
| 37 | `packages-galerina/galerina-devtools-context/src/receipt-generator.ts#isBuiltin` | `packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi` | `packages-galerina/galerina-devtools-context/tests/builtin-name-fungi-conversion.test.mjs` | The flat eighteen-label match exceeds the current physical wide-control ceiling. Tested helper decompositions also refuse because the current profile cannot compose the required wide control-flow and function graph. No physical claim is made. | `BLOCKED` |
| 38 | `packages-galerina/galerina-web/src/index.ts#isServerOnlyImport` | not created | not created | The exact 28-name membership decision exceeds the freshly proved seven-arm physical String-match ceiling; the smaller 18-label Slice 37 helper shapes already refuse. Live graph confirms one production caller and two focused test callers; the package passes 25/25. No profile widening is authorized. | `BLOCKED` |
| 39 | `packages-galerina/galerina-target-js/src/index.ts#isServerOnlyImport` | not created | not created | The exact 28-name membership decision exceeds the current 16-block physical ceiling; the 256-byte and well-formed-Unicode physical boundaries also narrow the unbounded TypeScript String domain. Live graph confirms the production/test callers and the package passes 13/13. No narrowing or profile widening is authorized. | `BLOCKED` |
| 40 | `packages-galerina/galerina-devtools-provenance/src/analyzer.ts#isGateCall` | not created | not created | The live graph proves its only caller is nested inside `analyzeFlowAst`, which itself has zero callers. A reference twin could never satisfy live differential or consumer-switch retirement gates. Owner classification is blocked pending dead-code deletion adjudication; the package remains green 25/25. | `BLOCKED` |
| 41 | `packages-galerina/galerina-core-network/src/index.ts#isUnsafeNetworkBackend` | not created | not created | The physical frontend has no exact boundary for the source's nominal six-field record with optional Boolean state. A scalar bridge would move the absence decision back into TypeScript. The live graph also shows its caller is package-test-only; core-network remains green **192/192**. | `BLOCKED` |
| 42 | `packages-galerina/galerina-cpu-kernels/src/index.ts#requiresLowBitKernel` | `packages-galerina/galerina-cpu-kernels/src/self-hosted/low-bit-kernel-routing.fungi` | `packages-galerina/galerina-cpu-kernels/tests/low-bit-kernel-routing-fungi-conversion.test.mjs` | Already proved in Slice 29; no duplicate conversion is permitted. | `DONE` (`SUPERSEDED_BY_EXISTING_FUNGI`) |
| 42 replacement | `packages-galerina/galerina-core-tasks/src/check-permissions.ts#isSafeEnvironmentName` | not created | not created | The source is an open regular-language decision over an unbounded JavaScript String. The selected physical profile has no Boolean `while`, text length or character accessor, and its bounded well-formed text admission narrows the source domain. Core-tasks remains green **9/9**. | `BLOCKED` |
| 43 | `packages-galerina/galerina-devtools-pci/src/pci-checker.ts#containsCardKeyword` | not created | not created | Physical text containment exists, but exact JavaScript case folding does not; the bounded well-formed physical text domain is narrower too. Devtools-pci remains green **29/29**. | `BLOCKED` |
| 44 | `packages-galerina/galerina-core-logic/src/omni/omni-state.ts#isOmniUncertain` | `packages-galerina/galerina-core-logic/src/self-hosted/omni-uncertain.fungi` | `packages-galerina/galerina-core-logic/tests/omni-uncertain-fungi-conversion.test.mjs` | Full physical publication, VOK re-admission, hostile-input, exhaustion and mutation proof passes. | `DONE` |
| 45 | `packages-galerina/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | `packages-galerina/galerina-devtools-project-graph/src/self-hosted/resource-transition.fungi` | `packages-galerina/galerina-devtools-project-graph/tests/resource-transition-fungi-conversion.test.mjs` | The exact seven-by-seven declared matrix and hostile labels pass interpretation and signed Wasm. Physical publication is blocked because the selected profile accepts one scalar argument, not the required two-String boundary; host-side tuple packing is refused. | `BLOCKED` (physical) |
| 46 | `packages-galerina/galerina-tools-benchmark/src/index.ts#isBenchmarkReportShareable` | not created | not created | The source consumes two nested records, including an eleven-field report. The selected physical profile cannot preserve the exact record boundary; flattening or precomputing would move authority into the host. The owning package remains green **9/9**. | `BLOCKED` |

## Shared implementation and governance files

| File | Responsibility | Status |
|---|---|---|
| `docs/superpowers/specs/2026-08-12-five-scalar-classifiers-fungi-conversion-design.md` | Bound design for Slices 33–37. | `DONE` |
| `docs/superpowers/specs/2026-08-12-five-follow-on-fungi-conversions-design.md` | Product-owner negative adjudication for Slices 38–43, including the superseded original Slice 42 scope. | `DONE` |
| `docs/superpowers/specs/2026-08-12-slices-44-46-fungi-conversion-design.md` | Product-owner design and physical adjudication for Slices 44-46. | `DONE` |
| `docs/superpowers/plans/2026-08-12-five-scalar-classifiers-fungi-conversion.md` | Batch work ledger and link to this register. | `IN_PROGRESS` |
| `governance/conversion-queue-decisions.json` | Seven current symbol-scoped candidate decisions; blocked follow-on scopes grant no candidate authority. | `DONE` |
| `build/conversion-queue/queue.json` | Generated seven-candidate queue; follow-on blockers do not enter the candidate authority list. | `DONE` |
| `build/conversion-queue/QUEUE.md` | Human-readable generated queue. | `DONE` |
| `scripts/lib/scalar-classifier-fungi-proof.mjs` | Shared interpreter and signed-Wasm differential proof helper. | `DONE` |
| `packages-galerina/galerina-core-compiler/src/interpreter.ts` | Preserve quoted reserved names as String match patterns. | `DONE` |
| `packages-galerina/galerina-core-compiler/tests/wat-string-match.test.mjs` | Interpreter/Wasm regression for quoted reserved names. | `DONE` |
| `scripts/tests/five-scalar-classifiers-fungi-slide.integration.test.mjs` | Distinct physical SLIDE/VOK receipts for Slices 33, 34, 36 and 44; exact compile-refusal evidence for Slices 35, 37 and 45; executable seven-pass/eight-refuse profile boundary. | `DONE` |
| `governance/phase-close-commands.json` | Register the physical batch test in the governed test inventory. | `DONE` |
| Public `translating-typescript-to-fungi` skill | Duplicate-conversion preflight now binds the live register, retirement floor, package loaded assets, exact/sibling assets and governed mirrors; local skill commit `15c70bd`. | `DONE` |
| Public `writing-fungi` skill | `NO_SKILL_UPDATE`: the new lessons concern candidate discovery and physical arity, while its syntax, exhaustive-exit and typed-boundary rules already cover the emitted source. | `DONE` |

## Deferred shared closure files

These remain `NOT_STARTED` until the bounded batch exit:

- `docs/TODO.md`
- `docs/roadmap-2026-07-29-galerina-beta-v1-to-slide.md`
- `build/component-health/roadmap-subway.svg`
- generated package, project, KB, inventory, semantic, status, percentage and
  code-index outputs
- final batch-level review of both public Fungi skill repositories

## Verified refusal retained outside the batch

`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#requiresAuth`
is `BLOCKED_BY_BOOTSTRAP_FLOOR`. Its negative design record is complete; it is
not one of Slices 33–43 and no Fungi asset was produced.

## Current focused evidence

- Governed focused physical lane: `8/8` passed, `0` failed, `0` skipped. The
  eight checks are four complete physical proofs, three exact compile refusals,
  and one executable profile-boundary check; the refusals are not conversion
  success.
- Slice 44 proves all eight declared Omni labels plus hostile strings through
  the differential and physical surfaces.
- Slice 45 proves all 49 declared transition pairs plus hostile labels through
  interpretation and signed Wasm; its two-argument physical boundary remains
  an exact refusal.
- Slice 46 remains blocked at the nested-record boundary and has no placeholder
  Fungi asset.
- A generated one-flow probe establishes the current flat-match boundary:
  seven explicit String labels compile; eight and above refuse.
- Slice 35's four-plus-four helper decomposition compiled to the bounded
  wide-control profile and returned `true`, `true`, and `false` for the first,
  last, and surplus probes respectively.
- Slice 37 remains blocked: both a three-helper flat composition and a bounded
  helper tree refused. Widening a registry ceiling is not authorized by these
  probes.
