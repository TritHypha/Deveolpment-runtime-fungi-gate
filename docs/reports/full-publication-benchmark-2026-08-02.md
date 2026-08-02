# Full publication benchmark - 2026-08-02

Status: **PASS for the current Galerina benchmark contract**

This report records the full, unfiltered publication-fidelity benchmark run.
It does not promote the independent SLIDE laboratory evidence into a
Wasm/Rust/Python comparison. That terminal comparison remains deferred until
SLIDE has an executable backend and equivalent admitted workloads.

## Reproducibility record

| Field | Recorded value |
|---|---|
| Galerina commit measured | `54c15058988ab6a178ce014a2c1fed36f5a7fd63` |
| Branch | `codex/galerina-beta-v1-completion` |
| Host profile | Windows 10 x64, Intel Core i9-9900K |
| Node.js | `v24.18.0` |
| Python | `3.14.6` |
| Rust | `rustc 1.96.1 (31fca3adb 2026-06-26)` |
| C++ | MSYS2 `g++ 16.1.0` |
| Native rebuild | 19 Rust generic, 19 Rust AVX2 and 3 mapped C++ workloads |
| Result count | 29 workloads |
| Comparable unit gate | 17/17 aligned; no comparable-unit mismatch |
| Internal-only lane | `governance-cost` deliberately `FLAGGED` and excluded from cross-runtime claims |
| Raw result SHA-256 | `abc564389dd98e8da68a57afedcc57c6b4733e5b20d34ba3423e73f0acb77567` |

The separate SLIDE VADE child returned `AUDIT_CLEAN` while retaining
`authorityReleased: false` and `NON_COMPARATIVE_COMPONENT_EVIDENCE`. Its data
is not inserted into the 29-workload cross-runtime result array.

## Verification outcome

- Full benchmark process exited `0`.
- All 17 comparable workloads reported one matching unit across every lane
  that participated.
- Cross-language checksum identity passed for `nbody`, `json-parse`,
  `mandelbrot`, `binary-trees`, `spectral-norm` and `spore-container`.
- The benchmark truth audit returned `TRUTH AUDIT PASSED`.
- The SLIDE evidence audit returned `AUDIT_CLEAN` without releasing authority.
- The benchmark regression guard reported no attributable regression; the run
  seeds the current day baseline.
- The earliest-archive comparison covers all 29 current workloads: 23 shared,
  1 added and 5 present-but-unmeasured, with no silently dropped current row.

## Selected current measurements

These are throughput observations, not universal language rankings. The
production row is Galerina-generated Wasm; the governed row is the slower
Stage-A reference interpreter and must not be described as the shipping path.

| Workload and unit | Rust generic | Node.js | Galerina Wasm production | Galerina governed interpreter |
|---|---:|---:|---:|---:|
| Compute mix, mix-ops/s | 132.85M | 136.21M | 78.31M | 1.69M |
| Tower of Hanoi, moves/s | 248.17M | 131.14M | 121.73M | 83.9K |
| Matrix multiply, mul-adds/s | 1.51B | 611.40M | 441.90M | 714.7K |
| Tri-logic, trit-ops/s | 1.40B | 1.00B | 463.59M | 299.4K |
| Mandelbrot, pixels/s | 23.34M | 6.87M | 9.06M | 7.2K |

The current-versus-last-snapshot report contains 117 runtime/workload pairs
with median absolute movement of 1.3%. Twenty pairs moved by more than 10%, so
individual changes remain observations requiring noise-controlled repetition,
not causal performance claims.

## Generated evidence

- Raw results: `packages-galerina/galerina-devtools-benchmarks/results/latest.json`
- Two-view report: `packages-galerina/galerina-devtools-benchmarks/results/benchmark-report-latest.md`
- Current/last chart: `packages-galerina/galerina-devtools-benchmarks/results/benchmark-chart-latest.html`
- Earliest/current chart: `packages-galerina/galerina-devtools-benchmarks/results/benchmark-compare-latest.html`

The earliest/current chart is explicitly pinned to
`2026-06-17_extended`. It distinguishes shared, added and unmeasured rows; it
does not pretend that absent historical lanes are comparable.

## Remaining benchmark debt

- Certify equivalent work for the legacy per-call CPU lanes before publishing
  cross-runtime ratios for them.
- Add missing production Wasm/native implementations where the report says
  `no build` or `not run`.
- Repeat noisy movers under the variance/noise protocol before attributing a
  speed change to code.
- Run the terminal independent SLIDE comparison only after its executable
  backend and equivalent workload contract exist.
