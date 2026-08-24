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

115 runtime·benchmark pairs · median |Δ| 4.0% · >10%: 22. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 28.78B | +399643.2% |
| call-chain | Node.js | 277.6M | 47.4M | -82.9% |
| call-chain | Python | 1.4M | 2.5M | +74.5% |
| framework-pipeline | Node.js | 392.9K | 132.5K | -66.3% |
| nbody | Python | 1.1M | 1.7M | +56.3% |
| data-query | Python | 4.1M | 5.9M | +43.0% |
| binary-trees | Rust | 15.3M | 21.5M | +39.9% |
| gpu-compute | Python | 8.0M | 5.8M | -27.6% |
| collection-pipeline | Python | 10.8M | 13.7M | +27.3% |
| data-query | Galerina governed diagnostic | 204.5K | 257.2K | +25.7% |
| binary-trees | Rust AVX2 | 16.6M | 20.7M | +24.3% |
| six-digit-guess | Node.js | 2.3M | 2.8M | +22.7% |
| governance-cost | Python | 24.9K | 20.3K | -18.4% |
| record-allocation | Node.js | 52.1M | 61.3M | +17.8% |
| governance-cost | Rust | 782.9M | 916.6M | +17.1% |
| json-parse | Node.js | 3.2M | 3.7M | +16.3% |
| tower-of-hanoi | Python | 3.1M | 2.6M | -13.9% |
| json-parse | Python | 504.5K | 435.5K | -13.7% |
| mandelbrot | Python | 147.8K | 167.9K | +13.6% |
| hardware-targets | Galerina governed diagnostic | 3.6K | 3.2K | -12.4% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina/SLIDE production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm legacy lane | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | 134.5M | 137.0M | — | 140.7M | 80.5M | — | 182.1K | 1.7M | 755.3K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.58B | 1.60B | — | 988.8M | 510.5M | — | — | 86 | 3.9M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 75.0M | 79.5M | — | 2.8M | 37.4M | — | — | 1 | 90.8K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 1.44 | <0.001 | — | — | 6.83 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 514 | 520 | — | 132 | 17.9K | — | — | 12 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 251.4M | 248.2M | — | 129.2M | 118.0M | — | — | 83.9K | 2.6M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 17.57 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 912.4M | 916.6M | — | 2.2M | 3.1M | — | — | 710 | 20.3K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 949.8K | 40.5M | — | — | 3.2K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm legacy lane (tie) | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 16.21 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.23B | 1.23B | — | 1.02B | 495.7M | — | — | 328.1K | 5.8M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | 1.46B | 1.54B | — | 637.5M | 461.8M | — | — | 771.0K | 28.78B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 197 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 947 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.43B | 1.40B | — | 1.03B | 490.8M | — | — | 315.5K | 7.3M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.73B | 3.75B | — | 2.04B | — | 583.7M | 1.53B | — | 9.5M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 392.7M | — | — | — | 257.2K | 5.9M |
| call-chain ✅ | chains/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 154.5M | 138.4M | — | 47.4M | 56.9M | — | 195.1K | 52.5K | 2.5M |
| nbody ✅ | force-evals/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 125.4M | 30.5M | — | — | 61.1K | 1.7M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.7M | — | — | — | 5.3K | 435.5K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 24.4M | 23.6M | — | 6.5M | 9.2M | — | — | 7.5K | 167.9K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust AVX2 | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 393.2M | 390.3M | — | 245.3M | — | — | — | — | 1.7M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | — | — | 7.19 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 145.4K | 147.1K | — | 43.9K | — | — | — | — | 61.8K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 132.5K | — | — | — | — | 114.2K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
