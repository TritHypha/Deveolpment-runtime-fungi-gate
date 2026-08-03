# Benchmark report — interpreted views

Current run: `results/latest.json`. Baseline (last distinct run): 2026-08-02_galerina-wasm-before-slide.

## How to read this report

- **Higher is better** for admitted throughput rates such as operations, records or requests per second.
- **Lower is better** for memory allocation measured as heap bytes per operation. Throughput shown on those rows is secondary and does not choose the winner.
- **✅ means the workload is work-equivalent and unit-aligned for cross-runtime ranking; it does not mean Galerina won.**
- A row without ✅ may show observations, but it receives no admitted winner or product place.
- **Galerina** in the place column means the Galerina/Wasm production lane. The governed interpreter is diagnostic evidence and is not counted as another competing product.

- **Checked reference - no permission** and **SLIDE reference - permission present** are non-authorizing laboratory observations. They are visible for the one-million-loop comparison but cannot win or count as Galerina production.

## 1. Difference from the last run

115 runtime·benchmark pairs · median |Δ| 1.2% · >10%: 13. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| record-allocation | Python | 3.1M | 4.5M | +44.2% |
| six-digit-guess | Node.js | 2.3M | 2.9M | +24.9% |
| binary-trees | Rust AVX2 | 16.6M | 20.1M | +20.7% |
| arithmetic-threshold | Python | 3.9M | 4.6M | +17.1% |
| tri-logic | Python | 6.8M | 7.9M | +16.0% |
| collection-pipeline | Python | 10.8M | 12.5M | +15.4% |
| nbody | Python | 1.1M | 1.2M | +15.1% |
| governance-cost | Rust | 782.9M | 899.5M | +14.9% |
| spectral-norm | Python | 1.7M | 2.0M | +13.9% |
| data-query | Galerina governed diagnostic | 204.5K | 232.4K | +13.6% |
| mandelbrot | Python | 147.8K | 167.2K | +13.1% |
| mandelbrot | Node.js | 6.9M | 6.1M | -10.7% |
| binary-trees | Node.js | 78.0M | 85.8M | +10.0% |
| hardware-targets | Galerina governed diagnostic | 3.6K | 3.3K | -9.8% |
| call-chain | Node.js | 277.6M | 304.4M | +9.7% |
| framework-pipeline | Python | 114.4K | 125.2K | +9.4% |
| record-allocation | Node.js | 52.1M | 56.9M | +9.3% |
| binary-trees | Python | 2.9M | 3.1M | +9.3% |
| json-parse | Python | 504.5K | 549.5K | +8.9% |
| fibonacci-recursive | Galerina governed diagnostic | 12 | 11 | -8.3% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 130.4M | 132.7M | — | 135.4M | 77.7M | — | — | 1.7M | 749.7K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.56B | 1.57B | — | 970.8M | 493.4M | — | — | 87 | 4.6M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 75.2M | 78.0M | — | 2.9M | 36.6M | — | — | 1 | 89.3K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.341 | <0.001 | — | — | 5.99 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 503 | 497 | — | 128 | 17.0K | — | — | 11 | 5 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 252.9M | 251.8M | — | 124.7M | 121.4M | — | — | 87.4K | 3.3M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 904.7M | 899.5M | — | 2.1M | 2.9M | — | — | 786 | 24.8K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 918.3K | 40.0M | — | — | 3.3K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 27.06 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.19B | 1.19B | — | 991.4M | 466.2M | — | — | 307.5K | 7.9M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.43B | 1.48B | — | 616.0M | 442.5M | — | — | 687.8K | 7.5M |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 206 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 917 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.39B | 1.39B | — | 998.3M | 469.6M | — | — | 302.7K | 7.9M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 + Rust (tie) | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 2.41B | 2.41B | — | 2.03B | — | 584.2M | 1.61B | — | 10.7M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 393.0M | — | — | — | 232.4K | 4.0M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 304.4M | 55.0M | — | — | 48.8K | 1.5M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.2M | 29.2M | — | — | 56.0K | 1.2M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.2M | — | — | — | 5.3K | 549.5K |
| mandelbrot ✅ | pixels/s | higher is better | Rust | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 22.6M | 23.4M | — | 6.1M | 9.1M | — | — | 7.2K | 167.2K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 373.4M | 376.8M | — | 240.1M | — | — | — | — | 2.0M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.16 | <0.001 | — | — | 14.86 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 163.1K | 163.6K | — | 46.3K | — | — | — | — | 68.6K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 393.6K | — | — | — | — | 125.2K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
