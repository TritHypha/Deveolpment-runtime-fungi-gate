# RD-0873 direct Fungi conversion: waves 88-90

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (three designated Fungi workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-devtools-kb-graph/src/cli.ts#STALE_DAYS` -> `packages/fungi/products/galerina-devtools-kb-graph/stale-days.fungi` (304 bytes; exact parity 1/1; retained suite 31/31).
- `packages-ts/galerina-devtools-package-graph/src/reporter.ts#GRAPH_DIR` -> `packages/fungi/products/galerina-devtools-package-graph/graph-dir.fungi` (448 bytes; exact parity 1/1; retained suite 28/28).
- `packages-ts/galerina-framework-api-server/src/index.ts#DEFAULT_REQUEST_TIMEOUT_MS` -> `packages/fungi/products/galerina-framework-api-server/default-request-timeout-ms.fungi` (563 bytes; interpreter and signed-Wasm parity 1/1; retained suite 26/26).

TypeScript shadows remain retained. Each target passed a strict Fungi check and serial local build. No production authority is claimed.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **85/85 PASS** (31 KB graph, 28 package graph, 26 API server).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were **241.3 ms**, **240.7 ms** and **245.0 ms**.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover constants only. KB and package graph discovery, filesystem reads/writes, HTTP/TLS/socket construction, request lifecycle and timeout enforcement, host marshalling, physical ABI admission and production authority remain host/toolchain boundaries.

The direct-tree ledger is now **88/100** package roots with **89** buildable leaves totalling **162,468 bytes**; **12** package roots remain. Receipts are `2026-09-13-rd0873-fungi-wave088-devtools-kb-graph.json`, `wave089-devtools-package-graph.json` and `wave090-framework-api-server.json`.
