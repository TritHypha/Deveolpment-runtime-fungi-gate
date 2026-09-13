# RD-0873 direct Fungi conversion: waves 76-78

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-ext-secrets-spore/src/schema.ts#MODALITY_STRUCTURED` -> `packages/fungi/products/galerina-ext-secrets-spore/modality-structured.fungi` (236 bytes; exact constant parity 1/1).
- `packages-ts/galerina-ext-secrets-vault/src/types.ts#SECRETS_GATEWAY_WIT` -> `packages/fungi/products/galerina-ext-secrets-vault/secrets-gateway-wit.fungi` (696 bytes; exact UTF-8 parity 1/1).
- `packages-ts/galerina-ext-bridge-cpp/src/index.ts#selectTernaryBridge` -> `packages/fungi/products/galerina-ext-bridge-cpp/select-ternary-bridge.fungi` (802 bytes; narrowed technique identity parity 1/1 interpreter and signed-Wasm).

TypeScript shadows remain retained. Strict checks and serial local Fungi builds pass 3/3. Secret custody, vault/TPM access, native addon/provider probing, inference and transport remain host boundaries.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **102/102 PASS** (1 secrets-spore, 24 secrets-vault, 21 bridge-cpp; photonic/spore/Tritsocket prior chapter suites included in the running record).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 244.6 ms, 248.1 ms and 242.6 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves carry only constants and a pure technique identity. Secret bytes/crypto/erasure, vault/TPM custody, native addon loading, provider effects, inference, sockets, host marshalling, physical ABI admission and production authority remain explicit host/toolchain boundaries.

The manifest now records **76/100** package roots, **77** direct buildable leaves and **155,354 bytes**; **24** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave076-secrets-spore.json` through `wave078-bridge-cpp.json`.
