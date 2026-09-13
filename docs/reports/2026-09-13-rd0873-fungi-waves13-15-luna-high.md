# RD-0873 Fungi waves 13–15: network and sentinel leaves

Three Luna – High workers completed one bounded direct-package leaf each while
retaining the TypeScript shadows. No CI, hosted build, repository script or
Git operation was used.

| Wave | Source and symbol | Direct target | Evidence |
| --- | --- | --- | --- |
| 13 | `packages-ts/galerina-core-network/src/admission-feedback.ts#telemetryToSideSignal` | `packages/fungi/products/galerina-core-network/admission-feedback.fungi` | strict check/build PASS; RD-0361 differential **1/1** |
| 14 | `packages-ts/galerina-core-sentinel-io/src/integrity-monitor.ts#IntegrityMonitor.verifyBlock` | `packages/fungi/products/galerina-core-sentinel-io/integrity-verdict.fungi` | strict check/build PASS; package suite **25/25** |
| 15 | `packages-ts/galerina-core-sentinel-memory/src/memory-validator.ts#ALIGN_BYTES` | `packages/fungi/products/galerina-core-sentinel-memory/align-bytes.fungi` | strict check/build PASS; interpreter/Wasm constant checks PASS |

The direct targets total **3,013 bytes** and remain within the per-wave
limits. Network telemetry decoding, threshold/range checks and admission,
cryptographic byte computation and memory bounds/native effects remain host
boundaries. No production authority follows from these slices.

