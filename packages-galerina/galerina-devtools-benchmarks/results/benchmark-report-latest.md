# Benchmark report — interpreted views

Current run: `results/latest.json`. Baseline (last distinct run): 2026-08-02_galerina-wasm-before-slide.

## How to read this report

- **Higher is better** for admitted throughput rates such as operations, records or requests per second.
- **Lower is better** for memory allocation measured as heap bytes per operation. Throughput shown on those rows is secondary and does not choose the winner.
- **✅ means the workload is work-equivalent and unit-aligned for cross-runtime ranking; it does not mean Galerina won.**
- A row without ✅ may show observations, but it receives no admitted winner or product place.
- The production Galerina place remains unmeasured until an admitted `slide` lane exists. The legacy Wasm lane remains ranked historical evidence; neither it nor the diagnostic interpreter may claim that product place.

- **Checked reference - no permission** and **SLIDE reference - permission present** are non-authorizing laboratory observations. They are visible for the one-million-loop comparison but cannot win or count as Galerina production.

## 1. Difference from the last run

115 runtime·benchmark pairs · median |Δ| 7.7% · >10%: 33. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 27.99B | +388800.1% |
| call-chain | Node.js | 277.6M | 40.6M | -85.4% |
| framework-pipeline | Node.js | 392.9K | 117.9K | -70.0% |
| crypto-ops | Galerina governed diagnostic | 208 | 124 | -40.4% |
| gpu-compute | Python | 8.0M | 5.3M | -33.3% |
| low-memory | Python | 3.7M | 2.6M | -28.7% |
| text-html | Galerina governed diagnostic | 953 | 698 | -26.8% |
| low-memory | Galerina governed diagnostic | 149.6K | 110.0K | -26.5% |
| data-query | Python | 4.1M | 3.1M | -25.5% |
| governance-cost | Galerina/Wasm legacy lane | 2.9M | 2.2M | -23.3% |
| record-allocation | Galerina governed diagnostic | 2.4M | 1.9M | -21.9% |
| binary-trees | Node.js | 78.0M | 62.1M | -20.4% |
| record-allocation | Python | 3.1M | 3.8M | +20.3% |
| arithmetic-threshold | Galerina governed diagnostic | 82 | 66 | -19.5% |
| binary-trees | Rust AVX2 | 16.6M | 13.5M | -18.6% |
| fibonacci-recursive | Node.js | 125 | 103 | -17.9% |
| framework-pipeline | Python | 114.4K | 94.3K | -17.6% |
| matrix-multiply | Galerina governed diagnostic | 714.7K | 605.2K | -15.3% |
| governance-cost | Python | 24.9K | 21.1K | -15.2% |
| governance-cost | Galerina governed diagnostic | 769 | 660 | -14.2% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina/SLIDE production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm legacy lane | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | 124.8M | 126.8M | — | 131.3M | 71.7M | — | 171.5K | 1.7M | 724.9K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.56B | 1.56B | — | 959.0M | 450.3M | — | — | 66 | 3.7M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 75.1M | 77.1M | — | 2.5M | 33.4M | — | — | 1 | 84.3K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.969 | <0.001 | — | — | 6.03 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 451 | 497 | — | 103 | 16.5K | — | — | 11 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 230.8M | 249.5M | — | 118.3M | 117.3M | — | — | 79.8K | 2.8M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.75 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 799.6M | 877.6M | — | 1.9M | 2.2M | — | — | 660 | 21.1K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 824.1K | 35.5M | — | — | 3.3K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm legacy lane (tie) | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 56.34 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.17B | 1.17B | — | 954.1M | 446.6M | — | — | 302.4K | 5.3M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | 1.22B | 1.51B | — | 587.4M | 418.3M | — | — | 605.2K | 27.99B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 124 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 698 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 1.27B | 1.36B | — | 914.0M | 450.2M | — | — | 285.1K | 6.4M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.65B | 2.35B | — | 1.99B | — | 583.7M | 1.53B | — | 8.8M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 384.4M | — | — | — | 206.4K | 3.1M |
| call-chain ✅ | chains/s | higher is better | Rust AVX2 + Rust (tie) | not measured | Winner uses the highest admitted same-unit throughput. | 154.5M | 154.5M | — | 40.6M | 51.6M | — | 172.4K | 45.6K | 1.3M |
| nbody ✅ | force-evals/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 121.5M | 28.1M | — | — | 53.1K | 952.2K |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.0M | — | — | — | 4.8K | 438.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 23.0M | 23.4M | — | 6.2M | 8.7M | — | — | 6.6K | 130.9K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 370.0M | 370.8M | — | 221.8M | — | — | — | — | 1.5M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.16 | <0.001 | — | — | 8.67 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 146.5K | 150.0K | — | 39.8K | — | — | — | — | 59.4K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 117.9K | — | — | — | — | 94.3K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
