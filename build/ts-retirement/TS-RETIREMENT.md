# Executable-family retirement graph (1487 tracked package paths; 519 .ts-family)

Regenerate: `node scripts/ts-retirement-graph.mjs` (graph-all 7/7). The % audit reads these numbers LIVE.

| Retirement path | Count | Deletes via |
|---|--:|---|
| Twinned (.fungi beside it) | 30 | → #143 R4 authority ledger (checked .fungi authority or retained .ts differential oracle) |
| Compiler core | 107 | → bootstrap fixpoint (the .fungi stages are compiled BY this .ts — retires last, post-v1) |
| Bounded-TCB floor | 17 | → post-beta admitted SLIDE replacement (bounded bootstrap TCB until equivalent crypto/host/algorithm evidence exists) |
| Migration program | 335 | → the #38 migration codemod program (owner-gated re-sign ceremony) |

Authority ledgers: 7 compiler + 29 governed = 36 authoritative twins.

Complete executable family: 504 .ts source · 15 .d.ts · 0 .mts · 0 .cts · 956 .mjs · 12 .js · 0 .cjs.

Terminal physical retirement: OPEN — 1487 tracked package executable-family paths remain.

Post-SLIDE authority: OPEN — 2 non-authorizing candidate(s); 0/148 production Fungi sources cryptographically admitted; 0/54 host boundaries owned; 95 node_modules trees.

`.fungi` in src trees: 148 across 96 packages · staged-index drift: 0

## Twinned .ts (the #143 flip queue)
- packages-galerina/galerina-core-compiler/src/effect-checker.ts
- packages-galerina/galerina-core-compiler/src/gir-emitter.ts
- packages-galerina/galerina-core-compiler/src/governance-verifier.ts
- packages-galerina/galerina-core-compiler/src/lexer.ts
- packages-galerina/galerina-core-compiler/src/parser.ts
- packages-galerina/galerina-core-compiler/src/runtime.ts
- packages-galerina/galerina-core-compiler/src/type-checker.ts
- packages-galerina/galerina-core-compiler/src/verified-loop-envelope.ts
- packages-galerina/galerina-core-logic/src/tri/tri-ops.ts
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
- packages-galerina/galerina-framework-app-kernel/src/registry-durability-evidence.ts
- packages-galerina/galerina-framework-app-kernel/src/registry-durability-production-admission.ts
- packages-galerina/galerina-framework-app-kernel/src/registry-index.ts
- packages-galerina/galerina-framework-app-kernel/src/route-defaults.ts
- packages-galerina/galerina-framework-app-kernel/src/secret-gate.ts
- packages-galerina/galerina-tower-citizen/src/transport-fsm.ts
