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

115 runtime·benchmark pairs · median |Δ| 3.4% · >10%: 23. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 27.58B | +382990.8% |
| framework-pipeline | Node.js | 392.9K | 119.7K | -69.5% |
| gpu-compute | Python | 8.0M | 5.5M | -31.3% |
| binary-trees | Python | 2.9M | 3.8M | +31.0% |
| text-html | Galerina governed diagnostic | 953 | 666 | -30.1% |
| low-memory | Python | 3.7M | 2.8M | -23.9% |
| record-allocation | Galerina governed diagnostic | 2.4M | 1.9M | -21.6% |
| governance-cost | Python | 24.9K | 19.6K | -21.3% |
| data-query | Python | 4.1M | 3.3M | -20.2% |
| json-parse | Galerina governed diagnostic | 5.5K | 4.4K | -19.6% |
| six-digit-guess | Node.js | 2.3M | 2.7M | +19.0% |
| record-allocation | Node.js | 52.1M | 61.5M | +18.1% |
| low-memory | Galerina governed diagnostic | 149.6K | 123.6K | -17.4% |
| fibonacci-recursive | Galerina governed diagnostic | 12 | 10 | -16.7% |
| tower-of-hanoi | Python | 3.1M | 2.6M | -15.9% |
| governance-cost | Galerina governed diagnostic | 769 | 651 | -15.3% |
| json-parse | Python | 504.5K | 428.0K | -15.2% |
| governance-cost | Rust | 782.9M | 890.9M | +13.8% |
| nbody | Galerina/Wasm production | 29.3M | 25.5M | -12.9% |
| fibonacci-recursive | Python | 5 | 4 | -12.3% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 128.3M | 130.3M | — | 132.8M | 74.7M | — | — | 1.7M | 701.9K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.56B | 1.56B | — | 978.7M | 477.1M | — | — | 82 | 3.7M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 73.2M | 77.8M | — | 2.7M | 35.8M | — | — | 1 | 85.5K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.497 | <0.001 | — | — | 5.85 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 491 | 496 | — | 125 | 17.1K | — | — | 10 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 250.4M | 249.3M | — | 128.9M | 118.5M | — | — | 82.6K | 2.6M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.90 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 862.2M | 890.9M | — | 2.1M | 2.9M | — | — | 651 | 19.6K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 878.0K | 36.3M | — | — | 3.8K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 29.16 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.18B | 1.18B | — | 967.4M | 456.9M | — | — | 319.4K | 5.5M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | 5th of 5 | Winner uses the highest admitted same-unit throughput. | 1.41B | 1.50B | — | 605.3M | 432.9M | — | — | 674.5K | 27.58B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 193 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 666 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.32B | 1.33B | — | 976.3M | 457.7M | — | — | 287.2K | 6.5M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.70B | 2.34B | — | 1.49B | — | 584.2M | 1.61B | — | 9.1M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 377.7M | — | — | — | 193.1K | 3.3M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 261.3M | 53.6M | — | — | 46.0K | 1.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.3M | 25.5M | — | — | 52.7K | 998.4K |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 2.8M | — | — | — | 4.4K | 428.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 22.0M | 23.1M | — | 6.7M | 8.8M | — | — | 6.6K | 135.0K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 369.3M | 369.4M | — | 227.2M | — | — | — | — | 1.6M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.16 | <0.001 | — | — | 2.27 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 155.4K | 156.7K | — | 39.6K | — | — | — | — | 61.8K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 119.7K | — | — | — | — | 108.7K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
