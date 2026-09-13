# RD-0873 direct Fungi conversion: waves 85-87

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (three designated Fungi workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-core-compiler/src/artifact-reference.ts#ARTIFACT_REFERENCE_SCHEMA` -> `packages/fungi/products/galerina-core-compiler/artifact-reference-schema.fungi` (468 bytes; exact parity 1/1; retained suite 7,166/7,166).
- `packages-ts/galerina-devtools-benchmarks/src/audit-benchmark-integrity.mjs#EXTREME_SLOWER` -> `packages/fungi/products/galerina-devtools-benchmarks/extreme-slower.fungi` (477 bytes; exact parity 1/1; retained suite 113/113).
- `packages-ts/galerina-devtools-graph-algorithms/src/semantic/flag-queries.ts#BINARY_DISPATCH_SIZE` -> `packages/fungi/products/galerina-devtools-graph-algorithms/binary-dispatch-size.fungi` (261 bytes; interpreter and signed-Wasm parity 1/1; retained suite 97/97).

TypeScript/MJS shadows remain retained. Each target passed a strict Fungi check and serial local build. No production authority is claimed.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **7,376/7,376 PASS** (7,166 compiler, 113 benchmarks, 97 graph algorithms).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were **242.0 ms**, **241.0 ms** and **241.3 ms**.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover constants only. Compiler orchestration and artifact custody, benchmark runners and measurements, graph construction and optimization, host marshalling, physical ABI admission and production authority remain host/toolchain boundaries.

The direct-tree ledger is now **85/100** package roots with **86** buildable leaves totalling **161,153 bytes**; **15** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave085-core-compiler.json`, `2026-09-13-rd0873-fungi-wave086-devtools-benchmarks.json` and `2026-09-13-rd0873-fungi-wave087-devtools-graph-algorithms.json`.

A same-head metadata reconciliation refreshed four older target records whose on-disk bytes or digests had drifted; no source authoring or semantic authority changed. The reconciliation receipt is docs/independent-audits/2026-09-13-rd0873-fungi-ledger-reconciliation.json.

