# RD-0873 Fungi waves 7–9: security, vector and data-model leaves

Three Luna – High workers completed one bounded pure leaf each under the
direct target layout. TypeScript originals remain the differential shadows;
no CI, hosted build, repository script or Git operation was used by the
workers.

| Wave | Source and symbol | Direct target | Evidence |
| --- | --- | --- | --- |
| 7 | `packages-ts/galerina-core-security/src/index.ts#isSensitiveHeaderName` | `packages/fungi/products/galerina-core-security/is-sensitive-header-name.fungi` | strict check/build PASS; governed cases PASS |
| 8 | `packages-ts/galerina-core-vector/src/index.ts#validateMatrixType` | `packages/fungi/products/galerina-core-vector/validate-matrix-type.fungi` | strict check/build PASS; package suite **5/5**; numeric differential matched |
| 9 | `packages-ts/galerina-data-model/src/index.ts#isResponseSafeClassification` | `packages/fungi/products/galerina-data-model/response-safe-classification.fungi` | strict check/build PASS; interpreter/Wasm differential **10/10** |

The exact source/target digests, bounds and dispositions are in
`docs/independent-audits/2026-09-13-rd0873-fungi-wave7-core-security.json`,
`docs/independent-audits/2026-09-13-rd0873-fungi-wave8-core-vector.json` and
`docs/independent-audits/2026-09-13-rd0873-fungi-wave9-data-model.json`.

These pure leaves do not complete their containing packages. Unicode
case-mapping, hostile object/array ingress, full record ABIs, model validation,
response allowlists and hardware/provider behavior remain explicit boundary
work. No consumer switch, TypeScript retirement, profile promotion or
production authority follows from the slices.

## Interim local benchmark

The CLI benchmark subcommand remains an unimplemented diagnostic. Ten fresh
local strict-check invocations per target passed (**30/30**). Mean wall-clock
time, including Node/compiler startup, was **250.3 ms** for
`is-sensitive-header-name.fungi`, **250.6 ms** for `validate-matrix-type.fungi`
and **243.0 ms** for `response-safe-classification.fungi`. These are
build/check baselines rather than runtime-performance claims.
