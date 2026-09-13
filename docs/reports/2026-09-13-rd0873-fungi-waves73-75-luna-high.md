# RD-0873 direct Fungi conversion: waves 73-75

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-ext-photonic-emulator/src/partition-decider.ts#W_REP` -> `packages/fungi/products/galerina-ext-photonic-emulator/w-rep.fungi` (224 bytes; exact constant parity 1/1; retained suite 60/60).
- `packages-ts/galerina-ext-spore/src/container.ts#HEADER_SIZE` -> `packages/fungi/products/galerina-ext-spore/header-size.fungi` (440 bytes; exact constant parity 1/1; retained suite 61/61).
- `packages-ts/galerina-ext-tritsocket/src/prefilter.ts#packedLen` -> `packages/fungi/products/galerina-ext-tritsocket/packed-len.fungi` (862 bytes; interpreter and signed-Wasm parity 12/12; retained suite 11/11).

TypeScript shadows remain retained. Strict checks and serial local Fungi builds pass 3/3. Photonic execution, spore byte/crypto effects and Tritsocket transport remain host boundaries.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **72/72 PASS**.
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 246.5 ms, 243.4 ms and 243.9 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves are non-authorizing constants or bounded arithmetic. Hardware/emulator routing, byte parsing and hashing, socket transport, cryptographic admission, host marshalling, physical ABI admission and production authority remain explicit host/toolchain boundaries.

The manifest now records **73/100** package roots, **74** direct buildable leaves and **153,620 bytes**; **27** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave073-photonic-emulator.json` through `wave075-tritsocket.json`.
