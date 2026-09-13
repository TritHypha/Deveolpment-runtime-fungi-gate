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

115 runtime·benchmark pairs · median |Δ| 2.6% · >10%: 41. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 18.56B | +257771.5% |
| collection-pipeline | Galerina governed diagnostic | 2.5M | 8.3M | +240.0% |
| tri-logic | Python | 6.8M | 14.5M | +112.1% |
| collection-pipeline | Python | 10.8M | 22.0M | +103.7% |
| spectral-norm | Python | 1.7M | 3.4M | +96.5% |
| fibonacci-recursive | Python | 5 | 9 | +90.1% |
| call-chain | Node.js | 277.6M | 42.4M | -84.7% |
| mandelbrot | Python | 147.8K | 270.3K | +82.8% |
| binary-trees | Python | 2.9M | 5.2M | +80.6% |
| nbody | Python | 1.1M | 1.9M | +74.0% |
| record-allocation | Python | 3.1M | 5.4M | +70.3% |
| governance-cost | Python | 24.9K | 42.3K | +69.9% |
| data-query | Python | 4.1M | 7.0M | +69.9% |
| json-parse | Node.js | 3.2M | 1.1M | -64.9% |
| framework-pipeline | Node.js | 392.9K | 145.5K | -63.0% |
| gpu-compute | Python | 8.0M | 12.7M | +59.2% |
| call-chain | Python | 1.4M | 2.3M | +57.7% |
| low-memory | Python | 3.7M | 5.8M | +56.4% |
| json-parse | Python | 504.5K | 760.5K | +50.7% |
| framework-pipeline | Python | 114.4K | 168.5K | +47.3% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina/SLIDE production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm legacy lane | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | 130.9M | 133.1M | — | 136.3M | 78.3M | — | 189.9K | 1.6M | 1.1M |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.56B | 1.56B | — | 992.9M | 497.1M | — | — | 82 | 5.3M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 74.8M | 77.3M | — | 2.9M | 36.8M | — | — | 1 | 116.2K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 1.60 | <0.001 | — | — | 8.98 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 507 | 497 | — | 126 | 17.3K | — | — | 13 | 9 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 256.0M | 255.5M | — | 129.0M | 122.5M | — | — | 95.7K | 4.4M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm legacy lane | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 4.90 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 907.3M | 893.8M | — | 2.1M | 3.2M | — | — | 628 | 42.3K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 921.4K | 49.5M | — | — | 3.5K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm legacy lane (tie) | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 34.35 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 1.19B | 1.19B | — | 999.8M | 475.1M | — | — | 345.8K | 12.7M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | 1.44B | 1.51B | — | 623.2M | 446.1M | — | — | 771.6K | 18.56B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 202 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 824 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 1.41B | 1.41B | — | 958.9M | 474.1M | — | — | 331.5K | 14.5M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust AVX2 | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.71B | 2.40B | — | 2.03B | — | 583.7M | 1.53B | — | 20.2M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 387.2M | — | — | — | 233.1K | 7.0M |
| call-chain ✅ | chains/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 153.2M | 154.1M | — | 42.4M | 54.8M | — | 191.8K | 56.4K | 2.3M |
| nbody ✅ | force-evals/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.9M | 29.4M | — | — | 67.2K | 1.9M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 1.1M | — | — | — | 5.4K | 760.5K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | not measured | Winner uses the highest admitted same-unit throughput. | 23.8M | 23.8M | — | 6.3M | 9.1M | — | — | 8.3K | 270.3K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 372.7M | 377.4M | — | 240.5M | — | — | — | — | 3.4M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | not measured | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.16 | <0.001 | — | — | 8.12 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 171.2K | 172.5K | — | 49.5K | — | — | — | — | 87.9K |
| framework-pipeline ✅ | requests/s | higher is better | Python | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 145.5K | — | — | — | — | 168.5K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
