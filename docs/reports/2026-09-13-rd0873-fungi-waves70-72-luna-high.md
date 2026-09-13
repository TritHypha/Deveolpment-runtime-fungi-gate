# RD-0873 direct Fungi conversion: waves 70-72

Date: 2026-09-13  
Plan: `RD-0873-FULL-PACKAGE-FUNGI-CONVERSION`  
Worker ceiling: **Luna - High** (compute, economics and reports workers)  
Validation: local only; Git is storage; no CI or hosted build

## Bounded leaves

- `packages-ts/galerina-docs/src/openapi.ts#sanitizeSchemaName` -> `packages/fungi/products/galerina-docs/sanitize-schema-name.fungi` (2,442 bytes; focused parity 8/8).
- `packages-ts/galerina-devtools-intelligence/src/bm25.ts#K1` -> `packages/fungi/products/galerina-devtools-intelligence/bm25-k1.fungi` (425 bytes; constant parity 1/1).
- `packages-ts/galerina-ext-proof-snarkjs/src/circuit.ts#CIRCUIT_ID` -> `packages/fungi/products/galerina-ext-proof-snarkjs/circuit-id.fungi` (243 bytes; interpreter and signed-Wasm parity 1/1).

TypeScript shadows remain retained. Strict checks and serial local Fungi builds pass 3/3. The intelligence tokenizer regex/camelCase implementation and the SNARK proving, verification and key-custody effects remain outside these pure leaves.

## Verification

- Strict Fungi checks/builds: **3/3 PASS**.
- Retained package suites: **58/58 PASS** (27 docs, 21 intelligence, 10 proof-snarkjs).
- Ten fresh local strict-check invocations per target: **30/30 PASS**; mean check times were 247.3 ms, 243.0 ms and 240.9 ms.
- Current source/target head binding: `675e1048304b11e109b1de4f68af97ebc64f5949`; tree receipt `b20138180928ed9d787d157d1faedbe86050be64`.

## Boundaries

OpenAPI generation, filesystem and output effects, BM25 tokenization/scoring/indexing, Groth16 proving/verification, trusted setup, key custody, host marshalling, physical ABI admission and production authority remain explicit host/toolchain boundaries. This is bounded conversion evidence, not a production-authority claim.

The manifest now records **70/100** package roots, **71** direct buildable leaves and **152,094 bytes**; **30** package roots remain. Receipts are `docs/independent-audits/2026-09-13-rd0873-fungi-wave070-docs.json` through `wave072-snarkjs.json`.
