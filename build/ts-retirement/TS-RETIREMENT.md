# .ts retirement graph (491 tracked package .ts; 477 in src)

Regenerate: `node scripts/ts-retirement-graph.mjs` (graph-all 7/7). The % audit reads these numbers LIVE.

| Retirement path | Count | Deletes via |
|---|--:|---|
| Twinned (.fungi beside it) | 26 | → #143 R4 authority ledger (checked .fungi authority or retained .ts differential oracle) |
| Compiler core | 97 | → bootstrap fixpoint (the .fungi stages are compiled BY this .ts — retires last, post-v1) |
| Bounded-TCB floor | 16 | → post-beta admitted SLIDE replacement (bounded bootstrap TCB until equivalent crypto/host/algorithm evidence exists) |
| Migration program | 338 | → the #38 migration codemod program (owner-gated re-sign ceremony) |

Authority ledgers: 7 compiler + 29 governed = 36 authoritative twins.

Terminal physical retirement: OPEN — 491 tracked package TypeScript paths remain.

`.fungi` in src trees: 104 across 95 packages · finder drift: 0

## Twinned .ts (the #143 flip queue)
- packages-galerina/galerina-core-compiler/src/effect-checker.ts
- packages-galerina/galerina-core-compiler/src/gir-emitter.ts
- packages-galerina/galerina-core-compiler/src/governance-verifier.ts
- packages-galerina/galerina-core-compiler/src/lexer.ts
- packages-galerina/galerina-core-compiler/src/parser.ts
- packages-galerina/galerina-core-compiler/src/runtime.ts
- packages-galerina/galerina-core-compiler/src/type-checker.ts
- packages-galerina/galerina-core-network/src/admission-feedback.ts
- packages-galerina/galerina-core-network/src/cert-gate.ts
- packages-galerina/galerina-core-network/src/cors-policy.ts
- packages-galerina/galerina-core-network/src/defensive-controls.ts
- packages-galerina/galerina-core-network/src/egress-guard.ts
- packages-galerina/galerina-core-network/src/inbound-guard.ts
- packages-galerina/galerina-core-security/src/index.ts
- packages-galerina/galerina-core-sentinel-egress/src/audit-egress.ts
- packages-galerina/galerina-core-sentinel-memory/src/memory-validator.ts
- packages-galerina/galerina-core-sentinel-power/src/power-governor.ts
- packages-galerina/galerina-core-sentinel-state/src/cold-boot.ts
- packages-galerina/galerina-core-sentinel-time/src/synchronization-gate.ts
- packages-galerina/galerina-framework-app-kernel/src/kernel.ts
- packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts
- packages-galerina/galerina-framework-app-kernel/src/registry-durability-artifact.ts
- packages-galerina/galerina-framework-app-kernel/src/registry-index.ts
- packages-galerina/galerina-framework-app-kernel/src/route-defaults.ts
- packages-galerina/galerina-framework-app-kernel/src/secret-gate.ts
- packages-galerina/galerina-tower-citizen/src/transport-fsm.ts
