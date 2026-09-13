# RD-0873 direct Fungi conversion: waves 94-96

Date: 2026-09-13
Plan: RD-0873-FULL-PACKAGE-FUNGI-CONVERSION
Worker ceiling: Luna - High (three designated Fungi workers)
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- packages-ts/galerina-devtools-project-graph/src/algorithms/fixpoint.ts#DEFAULT_MAX_ITERATIONS -> packages/fungi/products/galerina-devtools-project-graph/default-max-iterations.fungi (353 bytes; exact parity 1/1; retained suite 92/92).
- packages-ts/galerina-tools-myco/src/index.ts#VERSION -> packages/fungi/products/galerina-tools-myco/version.fungi (435 bytes; exact parity 1/1; retained suite 133/133).
- packages-ts/galerina-framework-app-kernel/src/kernel.ts#maxRateWindows -> packages/fungi/products/galerina-framework-app-kernel/max-rate-windows.fungi (566 bytes; interpreter and admitted-Wasm parity 1/1; retained suite 233/233).

TypeScript shadows remain retained. Each target passed a strict Fungi check and serial local build. No production authority is claimed.

## Verification

- Strict Fungi checks/builds: 3/3 PASS.
- Retained package suites: 458/458 PASS (92 project graph, 133 Myco, 233 app kernel).
- Ten fresh local strict-check invocations per target: 30/30 PASS; mean check times were 242.4 ms, 241.6 ms and 241.4 ms.
- Current source/target head binding: 675e1048304b11e109b1de4f68af97ebc64f5949; tree receipt b20138180928ed9d787d157d1faedbe86050be64.

## Boundaries

These leaves cover constants only. Graph traversal/propagation, Myco indexing/regex/filesystem/CLI behavior, request routing, timers and rate-window enforcement, host marshalling, physical ABI admission and production authority remain host/toolchain boundaries.

The direct-tree ledger is now 94/100 package roots with 95 buildable leaves totalling 166,487 bytes; 6 package roots remain. Receipts are 2026-09-13-rd0873-fungi-wave094-devtools-project-graph.json, wave095-tools-myco.json and wave096-framework-app-kernel.json.
