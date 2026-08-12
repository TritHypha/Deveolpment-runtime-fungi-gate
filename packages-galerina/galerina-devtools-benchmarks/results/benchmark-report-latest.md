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

115 runtime·benchmark pairs · median |Δ| 1.3% · >10%: 21. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 28.19B | +391476.4% |
| call-chain | Node.js | 277.6M | 42.3M | -84.8% |
| framework-pipeline | Node.js | 392.9K | 127.6K | -67.5% |
| gpu-compute | Python | 8.0M | 5.3M | -34.3% |
| low-memory | Python | 3.7M | 2.6M | -28.8% |
| data-query | Python | 4.1M | 3.1M | -24.4% |
| tower-of-hanoi | Python | 3.1M | 2.4M | -22.4% |
| governance-cost | Python | 24.9K | 19.4K | -22.0% |
| six-digit-guess | Node.js | 2.3M | 2.8M | +20.0% |
| governance-cost | Galerina governed diagnostic | 769 | 643 | -16.4% |
| low-memory | Galerina governed diagnostic | 149.6K | 126.9K | -15.2% |
| fibonacci-recursive | Python | 5 | 4 | -14.5% |
| governance-cost | Rust | 782.9M | 891.5M | +13.9% |
| record-allocation | Python | 3.1M | 3.6M | +13.5% |
| binary-trees | Rust AVX2 | 16.6M | 14.5M | -12.9% |
| collection-pipeline | Python | 10.8M | 9.5M | -12.1% |
| spectral-norm | Python | 1.7M | 1.5M | -11.9% |
| text-html | Galerina governed diagnostic | 953 | 842 | -11.6% |
| call-chain | Python | 1.4M | 1.3M | -11.3% |
| json-parse | Galerina governed diagnostic | 5.5K | 4.9K | -11.2% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina/SLIDE production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm legacy lane | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | 129.4M | 131.5M | — | 134.7M | 75.0M | — | — | 1.6M | 722.3K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.57B | 1.57B | — | 929.2M | 489.5M | — | — | 80 | 3.8M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 70.8M | 77.5M | — | 2.8M | 36.4M | — | — | 1 | 86.0K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.508 | <0.001 | — | — | 5.99 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 499 | 495 | — | 127 | 17.2K | — | — | 12 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 244.0M | 252.3M | — | 129.8M | 121.5M | — | — | 82.4K | 2.4M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 891.2M | 891.5M | — | 2.0M | 2.9M | — | — | 643 | 19.4K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 899.0K | 36.3M | — | — | 4.0K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm legacy lane (tie) | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 20.73 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 1.18B | 1.18B | — | 987.5M | 467.3M | — | — | 311.7K | 5.3M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | 1.43B | 1.51B | — | 618.3M | 439.7M | — | — | 713.0K | 28.19B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 190 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 842 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.38B | 1.38B | — | 993.4M | 467.2M | — | — | 306.3K | 6.5M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.31B | 2.32B | — | 1.98B | — | 583.7M | 1.53B | — | 8.9M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 387.1M | — | — | — | 203.1K | 3.1M |
| call-chain ✅ | chains/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 154.4M | 153.1M | — | 42.3M | 54.1M | — | 177.3K | 48.7K | 1.3M |
| nbody ✅ | force-evals/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 123.0M | 28.9M | — | — | 56.7K | 972.6K |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.1M | — | — | — | 4.9K | 502.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 23.4M | 23.4M | — | 6.3M | 9.0M | — | — | 7.2K | 133.2K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust AVX2 | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 373.4M | 372.5M | — | 241.1M | — | — | — | — | 1.5M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | — | — | 3.87 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 158.2K | 158.5K | — | 42.2K | — | — | — | — | 62.4K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 127.6K | — | — | — | — | 107.0K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
