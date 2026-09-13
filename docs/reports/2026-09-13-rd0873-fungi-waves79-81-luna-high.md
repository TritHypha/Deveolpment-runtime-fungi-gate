# RD-0873 direct Fungi conversion: waves 79-81

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-hardware-tier/src/hardware-directive.ts#capabilityPreimage` -> `packages/fungi/products/galerina-hardware-tier/capability-preimage.fungi` (617 bytes; governed parity 3/3).
- `packages-ts/galerina-governance-telemetry/src/exposition.ts#isSafeLabel` -> `packages/fungi/products/galerina-governance-telemetry/is-safe-label.fungi` (1,384 bytes; focused parity 12/12).
- `packages-ts/galerina-inference-bridge-contract/src/oracle.ts#oracleAgrees` -> `packages/fungi/products/galerina-inference-bridge-contract/oracle-agrees.fungi` (982 bytes; interpreter and signed-Wasm parity 12/12).

TypeScript shadows remain retained. Strict checks and serial local Fungi builds pass 3/3. Hardware probing/attestation, metrics export/storage and inference-provider effects remain host boundaries.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **47/47 PASS** (14 hardware-tier, 21 governance-telemetry, 12 inference-bridge-contract).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 245.4 ms, 243.6 ms and 241.5 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover pure formatting, label validation and oracle agreement. Hardware probing, attestation, metrics export/storage, bridge execution, inference providers, cryptographic evidence, host marshalling, physical ABI admission and production authority remain explicit host/toolchain boundaries.

The manifest now records **79/100** package roots, **80** direct buildable leaves and **158,337 bytes**; **21** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave079-hardware-tier.json` through `wave081-inference-oracle.json`.
