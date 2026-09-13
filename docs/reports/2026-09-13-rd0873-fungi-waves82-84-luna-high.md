# RD-0873 direct Fungi conversion: waves 82-84

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (three designated Fungi workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-tri-regex/src/index.ts#VERSION` -> `packages/fungi/products/galerina-tri-regex/version.fungi` (363 bytes; exact parity 1/1; retained suite 34/34).
- `packages-ts/galerina-observability/src/metrics.ts#DEFAULT_MAX_ROUTES` -> `packages/fungi/products/galerina-observability/default-max-routes.fungi` (448 bytes; exact parity 1/1; retained suite 36/36).
- `packages-ts/galerina-test/src/spawn.ts#DEFAULT_TIMEOUT_MS` -> `packages/fungi/products/galerina-test/default-timeout-ms.fungi` (544 bytes; interpreter and signed-Wasm parity 1/1; retained suite 211/211).

TypeScript shadows remain retained. Each target passed a strict Fungi check and serial local build. No production authority is claimed.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **281/281 PASS** (34 TriRegex, 36 observability, 211 test).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were **245.9 ms**, **239.8 ms** and **236.5 ms**.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover constants only. Regex parsing and ReDoS controls, metrics storage/export and route enforcement, process spawning and timeout termination, host marshalling, physical ABI admission and production authority remain host/toolchain boundaries.

The direct-tree ledger is now **82/100** package roots with **83** buildable leaves totalling **159,692 bytes**; **18** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave082-tri-regex.json`, `wave083-observability.json` and `wave084-test.json`.
