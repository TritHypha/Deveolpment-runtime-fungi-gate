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

115 runtime·benchmark pairs · median |Δ| 2.1% · >10%: 44. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 4.16B | +57702.3% |
| collection-pipeline | Galerina governed diagnostic | 2.5M | 7.5M | +204.5% |
| tri-logic | Python | 6.8M | 14.3M | +109.6% |
| collection-pipeline | Python | 10.8M | 21.5M | +99.2% |
| spectral-norm | Python | 1.7M | 3.3M | +92.7% |
| fibonacci-recursive | Python | 5 | 9 | +87.9% |
| binary-trees | Python | 2.9M | 5.3M | +82.9% |
| call-chain | Node.js | 277.6M | 49.8M | -82.1% |
| mandelbrot | Python | 147.8K | 265.8K | +79.8% |
| call-chain | Python | 1.4M | 2.4M | +69.7% |
| data-query | Python | 4.1M | 7.0M | +69.7% |
| nbody | Python | 1.1M | 1.8M | +66.8% |
| governance-cost | Python | 24.9K | 40.9K | +64.2% |
| tower-of-hanoi | Python | 3.1M | 5.0M | +63.9% |
| framework-pipeline | Node.js | 392.9K | 146.5K | -62.7% |
| low-memory | Python | 3.7M | 5.7M | +54.4% |
| gpu-compute | Python | 8.0M | 12.1M | +51.9% |
| framework-pipeline | Python | 114.4K | 171.0K | +49.4% |
| json-parse | Python | 504.5K | 752.0K | +49.1% |
| record-allocation | Python | 3.1M | 4.5M | +43.8% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina/SLIDE production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm legacy lane | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | 130.4M | 132.6M | — | 135.5M | 77.9M | — | 185.4K | 1.6M | 1.1M |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.57B | 1.56B | — | 966.1M | 489.2M | — | — | 85 | 5.3M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 74.4M | 77.6M | — | 2.9M | 36.0M | — | — | 1 | 115.5K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 1.18 | <0.001 | — | — | 8.23 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 504 | 500 | — | 127 | 17.2K | — | — | 14 | 9 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 252.8M | 252.7M | — | 129.4M | 121.8M | — | — | 98.3K | 5.0M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 4.90 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 890.0M | 887.2M | — | 2.0M | 3.0M | — | — | 561 | 40.9K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 887.0K | 48.6M | — | — | 3.3K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm legacy lane (tie) | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 65.23 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.18B | 1.18B | — | 984.7M | 472.4M | — | — | 336.3K | 12.1M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | 1.43B | 1.51B | — | 611.3M | 441.7M | — | — | 717.7K | 4.16B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 206 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 809 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.40B | 1.39B | — | 996.5M | 468.5M | — | — | 345.7K | 14.3M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.52B | 2.36B | — | 1.92B | — | 583.7M | 1.53B | — | 19.7M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 386.6M | — | — | — | 238.6K | 7.0M |
| call-chain ✅ | chains/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 151.0M | 153.3M | — | 49.8M | 54.9M | — | 190.9K | 55.5K | 2.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 123.3M | 29.0M | — | — | 64.7K | 1.8M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.4M | — | — | — | 5.6K | 752.0K |
| mandelbrot ✅ | pixels/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 23.4M | 23.5M | — | 6.8M | 9.1M | — | — | 8.5K | 265.8K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust AVX2 | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 372.3M | 372.1M | — | 243.4M | — | — | — | — | 3.3M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | — | — | 15.07 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 151.5K | 153.1K | — | 49.8K | — | — | — | — | 87.9K |
| framework-pipeline ✅ | requests/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 146.5K | — | — | — | — | 171.0K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
