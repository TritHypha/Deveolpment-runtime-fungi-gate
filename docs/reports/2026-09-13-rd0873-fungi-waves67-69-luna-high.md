# RD-0873 direct Fungi conversion: waves 67-69

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-web-router/src/index.ts#validateLinkTarget` -> `packages/fungi/products/galerina-web-router/validate-link-target.fungi` (7,846 bytes; focused parity 12/12).
- `packages-ts/galerina-web-state/src/index.ts#validateApiToStateConversion` -> `packages/fungi/products/galerina-web-state/validate-api-to-state-conversion.fungi` (1,791 bytes; focused parity 12/12).
- `packages-ts/galerina-devtools-impact/src/impact-plan.mjs#isDocumentation` -> `packages/fungi/products/galerina-devtools-impact/build-impact-plan.fungi` (255 bytes; focused parity 10/10 interpreter and signed-Wasm). This is the pure helper narrowed from `buildImpactPlan`; the full planner remains host-bound.

The TypeScript/MJS shadows remain retained. Strict checks and serial local Fungi builds pass 3/3. The devtools-impact narrowing leaves filesystem/workspace reads, path resolution, dependency closure, JSON hashing and command planning in the MJS host boundary.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **65/65 PASS** (29 web-router, 27 web-state, 9 devtools-impact).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 255.4 ms, 244.3 ms and 243.2 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

Browser navigation, API transport/state storage, filesystem and Git discovery, package hashing, command execution, host marshalling, physical ABI admission and production authority remain explicit host/toolchain boundaries. This is bounded conversion evidence, not a production-authority claim.

The manifest now records **67/100** package roots, **68** direct buildable leaves and **148,984 bytes**; **33** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave067-web-router.json` through `wave069-devtools-impact.json`.
