# RD-0873 Fungi conversion wave 2 — 2026-09-13

Status: **PASS_BOUNDED_WAVE**

Following the owner's instruction to continue conversion, the three remaining
named queue candidates were checked sequentially at the same Galerina head.
The run is capped at **Luna - High** worker effort; a bounded worker restart is
allowed when a step fails or stalls. Profile `scalar-1`, one symbol/source
file per step, concurrency `1`, zero retries and a chapter aggregate after all
three items remain in force.

The three product-tree twins already existed. No identical bytes were
rewritten; this receipt records fresh current-head strict and differential
execution rather than pretending that an old manifest is current.

## Results

| TypeScript shadow | Product-tree target | Strict check | Differential test |
| --- | --- | --- | --- |
| `packages-ts/galerina-core-logic/src/omni/omni-state.ts#isOmniUncertain` | `packages/fungi/products/galerina/rd0873-core-logic/omni-uncertain.fungi` | PASS | PASS |
| `packages-ts/galerina-devtools-context/src/receipt-generator.ts#isBuiltin` | `packages/fungi/products/galerina/rd0873-devtools-context/builtin-name.fungi` | PASS | PASS |
| `packages-ts/galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | `packages/fungi/products/galerina/rd0873-devtools-project-graph/resource-transition.fungi` | PASS | PASS |

Focused totals: **3/3** strict checks and **7/7** package assertions passed;
zero failures and zero skips. Coverage includes all admitted states/literals,
the complete `7 x 7` transition domain and hostile surplus strings.

The exact source/target identities, head/tree, limits and operator ceiling are
in [the machine-readable receipt](../independent-audits/2026-09-13-rd0873-fungi-wave2-conversion.json).

## Successes

All three pure decisions retain closed String domains and explicit wildcard
refusals. Their outputs remain in `packages/fungi/products/galerina`, and the
TypeScript shadows remain active. The results do not switch consumers or
release production authority.

## Issues and improvements

The targets predate this run, and Galerina still has no general
TypeScript-to-Fungi emitter. Snapshot/GIR/SLIDE/VOK exact-head receipts and
independent physical review remain separate gates. Future waves should keep
devtools host orchestration in TypeScript, continue the same hostile-vector
pattern, and create a fresh exact scope manifest for each new chapter.

## Disposition

Wave 2 is **PASS_BOUNDED_WAVE** for candidate authoring and focused semantic
execution. Production authority, consumer switching, profile promotion and
TypeScript retirement remain **HOLD**.
