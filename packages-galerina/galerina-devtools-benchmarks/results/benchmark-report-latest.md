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

115 runtime·benchmark pairs · median |Δ| 1.7% · >10%: 16. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| nbody | Python | 1.1M | 1.4M | +33.6% |
| gpu-compute | Python | 8.0M | 5.8M | -27.7% |
| binary-trees | Rust AVX2 | 16.6M | 20.6M | +23.6% |
| hardware-targets | Galerina governed diagnostic | 3.6K | 4.4K | +22.1% |
| fibonacci-recursive | Python | 5 | 6 | +21.5% |
| record-allocation | Python | 3.1M | 3.8M | +20.9% |
| tower-of-hanoi | Node.js | 131.1M | 107.7M | -17.9% |
| fibonacci-recursive | Galerina governed diagnostic | 12 | 14 | +16.7% |
| governance-cost | Rust | 782.9M | 911.8M | +16.5% |
| six-digit-guess | Node.js | 2.3M | 2.7M | +16.4% |
| call-chain | Node.js | 277.6M | 318.2M | +14.6% |
| json-parse | Python | 504.5K | 441.0K | -12.6% |
| spore-container | Rust AVX2 | 163.4K | 142.9K | -12.5% |
| collection-pipeline | Galerina governed diagnostic | 2.5M | 2.2M | -11.1% |
| record-allocation | Node.js | 52.1M | 57.7M | +10.8% |
| low-memory | Python | 3.7M | 3.3M | -10.1% |
| matrix-multiply | Galerina governed diagnostic | 714.7K | 644.8K | -9.8% |
| low-memory | Galerina governed diagnostic | 149.6K | 135.6K | -9.3% |
| collection-pipeline | Python | 10.8M | 9.9M | -8.6% |
| spore-container | Rust | 163.6K | 151.1K | -7.6% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 131.0M | 133.5M | — | 136.4M | 78.4M | — | — | 1.7M | 782.7K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.59B | 1.59B | — | 969.7M | 485.5M | — | — | 85 | 4.0M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 76.9M | 79.7M | — | 2.7M | 36.8M | — | — | 1 | 81.3K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 1.55 | <0.001 | — | — | 5.99 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 505 | 502 | — | 129 | 17.4K | — | — | 14 | 6 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 254.6M | 254.8M | — | 107.7M | 122.8M | — | — | 85.1K | 3.2M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 906.2M | 911.8M | — | 2.1M | 2.9M | — | — | 804 | 24.7K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 909.3K | 39.1M | — | — | 4.4K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 37.46 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.19B | 1.19B | — | 994.4M | 475.4M | — | — | 314.4K | 5.8M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.44B | 1.52B | — | 606.0M | 443.8M | — | — | 644.8K | 7.7M |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 220 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 927 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.40B | 1.40B | — | 1.00B | 473.7M | — | — | 298.7K | 7.1M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 2.41B | 2.41B | — | 2.03B | — | 584.2M | 1.61B | — | 9.9M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 380.5M | — | — | — | 213.8K | 4.0M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 318.2M | 55.5M | — | — | 48.1K | 1.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.2M | 29.5M | — | — | 57.3K | 1.4M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.1M | — | — | — | 5.6K | 441.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 23.5M | 23.7M | — | 6.9M | 8.9M | — | — | 7.2K | 142.1K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 378.8M | 379.1M | — | 238.3M | — | — | — | — | 1.7M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.16 | <0.001 | — | — | 8.13 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 142.9K | 151.1K | — | 46.8K | — | — | — | — | 66.7K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 405.8K | — | — | — | — | 122.0K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
