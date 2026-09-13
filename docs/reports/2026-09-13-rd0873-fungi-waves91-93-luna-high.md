# RD-0873 direct Fungi conversion: waves 91-93

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (three designated Fungi workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-devtools-hypha/src/queries.mjs#sig` -> `packages/fungi/products/galerina-devtools-hypha/signature.fungi` (1,322 bytes; focused parity 4/4; retained suite 51/51). The target uses bounded insertion sorting and joining to preserve MJS ordering.
- `packages-ts/galerina-devtools-security/src/index.ts#DEVTOOLS_SECURITY_VERSION` -> `packages/fungi/products/galerina-devtools-security/version.fungi` (456 bytes; exact parity 1/1; retained suite 51/51).
- `packages-ts/galerina-tower-citizen/src/ai-governance.ts#isTrit` -> `packages/fungi/products/galerina-tower-citizen/is-trit.fungi` (887 bytes; interpreter and admitted-Wasm parity 12/12; retained suite 516/516).

TypeScript/MJS shadows remain retained. Each target passed a strict Fungi check and serial local build. No production authority is claimed.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **618/618 PASS** (51 Hypha, 51 security, 516 Tower Citizen).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were **243.5 ms**, **243.8 ms** and **240.5 ms**.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

These leaves cover a pure string helper, a version constant and a bounded tri-state predicate. Fact extraction, audit execution, filesystem/path checks, cryptography, providers, key custody, attestation, host authorization, marshalling, physical ABI admission and production authority remain host/toolchain boundaries.

The direct-tree ledger is now **91/100** package roots with **92** buildable leaves totalling **165,133 bytes**; **9** package roots remain. Receipts are `2026-09-13-rd0873-fungi-wave091-devtools-hypha.json`, `wave092-devtools-security.json` and `wave093-tower-citizen.json`.
