# RD-0873 Fungi waves 4–6: Luna – High direct package slices

Three bounded workers started the direct package conversion run under the
manifest’s Luna – High ceiling. Each worker used the Fungi translation and
writing guidance, retained the TypeScript shadow, and touched one package and
one pure leaf. No CI, hosted build, repository script or Git operation was
used by the workers.

| Wave | Source and symbol | Direct target | Result |
| --- | --- | --- | --- |
| 4 | `packages-ts/galerina-core-compute/src/index.ts#validateComputePlan` | `packages/fungi/products/galerina-core-compute/validate-compute-plan.fungi` | strict check/build PASS; package contracts 5/5 |
| 5 | `packages-ts/galerina-core-economics/src/index.ts#selectVectorTier` | `packages/fungi/products/galerina-core-economics/select-vector-tier.fungi` | strict check/build PASS; package suite 15/15; scalar vectors 3/3 |
| 6 | `packages-ts/galerina-core-reports/src/index.ts#selectReportStatus` | `packages/fungi/products/galerina-core-reports/report-status.fungi` | strict check/build PASS; worker differential 27/27; package/report suites 22/22 |

The three targets total **4,122 bytes**, remain below the per-wave output
limit, and preserve the original TypeScript files as rollback and differential
shadows. The per-item receipts are
`docs/independent-audits/2026-09-13-rd0873-fungi-wave4-core-compute.json`,
`docs/independent-audits/2026-09-13-rd0873-fungi-wave5-core-economics.json` and
`docs/independent-audits/2026-09-13-rd0873-fungi-wave6-core-reports.json`.

These are bounded pure leaves, not whole-package completions. Compute record
ingress and hardware probing, economics hardware-profile ABI, and reports
object ingress/validation/serialization remain explicit boundary work. No
consumer switch, TypeScript retirement, profile promotion or production
authority follows from these waves.

## Interim local benchmark

The CLI benchmark subcommand is not implemented yet, so the cheapest useful
interim measurement is ten fresh local strict-check invocations per direct
target. All 50 invocations passed. Mean wall-clock time per invocation was:

- `environment-mode.fungi`: **243.9 ms**
- `terminal-scope.fungi`: **241.6 ms**
- `validate-compute-plan.fungi`: **245.4 ms**
- `select-vector-tier.fungi`: **243.4 ms**
- `report-status.fungi`: **248.2 ms**

These figures include Node/compiler startup and are a baseline for later
build/run benchmarking; they are not a runtime-performance claim.
