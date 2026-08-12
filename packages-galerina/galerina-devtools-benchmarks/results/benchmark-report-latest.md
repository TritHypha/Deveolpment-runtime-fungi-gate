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

115 runtime·benchmark pairs · median |Δ| 2.7% · >10%: 27. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 27.82B | +386406.1% |
| framework-pipeline | Node.js | 392.9K | 128.4K | -67.3% |
| record-allocation | Galerina governed diagnostic | 2.4M | 1.4M | -43.6% |
| low-memory | Galerina governed diagnostic | 149.6K | 99.3K | -33.6% |
| governance-cost | Galerina governed diagnostic | 769 | 525 | -31.7% |
| gpu-compute | Python | 8.0M | 5.7M | -28.3% |
| low-memory | Python | 3.7M | 2.7M | -26.4% |
| call-chain | Node.js | 277.6M | 216.4M | -22.0% |
| governance-cost | Python | 24.9K | 19.9K | -20.2% |
| binary-trees | Galerina governed diagnostic | 338.0K | 280.2K | -17.1% |
| fibonacci-recursive | Galerina governed diagnostic | 12 | 10 | -16.7% |
| data-query | Python | 4.1M | 3.4M | -16.4% |
| collection-pipeline | Python | 10.8M | 9.3M | -14.2% |
| governance-cost | Rust | 782.9M | 887.7M | +13.4% |
| json-parse | Node.js | 3.2M | 2.8M | -12.6% |
| json-parse | Python | 504.5K | 441.0K | -12.6% |
| nbody | Galerina governed diagnostic | 56.6K | 49.4K | -12.6% |
| binary-trees | Rust AVX2 | 16.6M | 14.7M | -11.9% |
| gpu-compute | Galerina governed diagnostic | 313.4K | 276.4K | -11.8% |
| hardware-targets | Galerina governed diagnostic | 3.6K | 4.0K | +11.8% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 129.3M | 131.6M | — | 133.9M | 75.3M | — | — | 1.6M | 719.9K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.57B | 1.57B | — | 987.3M | 489.9M | — | — | 81 | 3.7M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 75.4M | 77.4M | — | 2.6M | 34.7M | — | — | 1 | 77.2K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.456 | <0.001 | — | — | 5.85 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 499 | 500 | — | 124 | 16.7K | — | — | 10 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 250.9M | 250.8M | — | 129.6M | 119.3M | — | — | 76.8K | 2.7M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 889.9M | 887.7M | — | 2.1M | 2.9M | — | — | 525 | 19.9K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 867.9K | 35.8M | — | — | 4.0K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 47.00 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.18B | 1.18B | — | 985.0M | 466.4M | — | — | 276.4K | 5.7M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | 5th of 5 | Winner uses the highest admitted same-unit throughput. | 1.41B | 1.39B | — | 610.4M | 415.3M | — | — | 635.2K | 27.82B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 196 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 976 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.37B | 1.37B | — | 973.9M | 458.4M | — | — | 281.0K | 6.3M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.29B | 2.33B | — | 1.98B | — | 583.7M | 1.53B | — | 9.0M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 374.1M | — | — | — | 182.1K | 3.4M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 216.4M | 51.2M | — | — | 46.0K | 1.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 123.2M | 28.8M | — | — | 49.4K | 1.0M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 2.8M | — | — | — | 4.9K | 441.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 23.4M | 23.4M | — | 6.3M | 8.8M | — | — | 7.0K | 135.1K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust AVX2 | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 372.6M | 372.4M | — | 240.3M | — | — | — | — | 1.6M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | — | — | 14.18 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 156.7K | 162.3K | — | 42.8K | — | — | — | — | 63.3K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 128.4K | — | — | — | — | 104.8K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
