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

115 runtime·benchmark pairs · median |Δ| 2.6% · >10%: 27. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| matrix-multiply | Python | 7.2M | 21.20B | +294437.4% |
| framework-pipeline | Node.js | 392.9K | 123.2K | -68.7% |
| binary-trees | Python | 2.9M | 4.8M | +66.0% |
| gpu-compute | Python | 8.0M | 5.4M | -31.9% |
| low-memory | Python | 3.7M | 2.6M | -29.6% |
| tower-of-hanoi | Node.js | 131.1M | 93.8M | -28.5% |
| data-query | Python | 4.1M | 3.1M | -23.6% |
| governance-cost | Python | 24.9K | 19.5K | -21.7% |
| low-memory | Galerina governed diagnostic | 149.6K | 119.4K | -20.2% |
| tower-of-hanoi | Python | 3.1M | 2.5M | -19.2% |
| spectral-norm | Rust AVX2 | 374.5M | 304.3M | -18.7% |
| record-allocation | Galerina governed diagnostic | 2.4M | 2.0M | -16.2% |
| json-parse | Python | 504.5K | 428.5K | -15.1% |
| six-digit-guess | Node.js | 2.3M | 2.6M | +13.7% |
| governance-cost | Rust | 782.9M | 888.1M | +13.4% |
| compute-mix | Python | 797.8K | 694.6K | -12.9% |
| collection-pipeline | Python | 10.8M | 9.5M | -12.4% |
| collection-pipeline | Galerina governed diagnostic | 2.5M | 2.2M | -11.9% |
| spore-container | Rust AVX2 | 163.4K | 144.0K | -11.8% |
| matrix-multiply | Galerina governed diagnostic | 714.7K | 630.6K | -11.8% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Checked reference - no permission | SLIDE reference - permission present | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 128.5M | 129.7M | — | 133.2M | 75.7M | — | — | 1.7M | 694.6K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.56B | 1.56B | — | 949.3M | 478.0M | — | — | 81 | 3.7M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 75.0M | 78.1M | — | 2.6M | 36.0M | — | — | 1 | 83.9K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 1.86 | <0.001 | — | — | 5.99 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 494 | 494 | — | 126 | 16.7K | — | — | 11 | 4 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 248.9M | 248.7M | — | 93.8M | 119.5M | — | — | 79.8K | 2.5M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | — | — | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 886.3M | 888.1M | — | 2.1M | 2.8M | — | — | 701 | 19.5K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 886.9K | 35.9M | — | — | 4.0K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | — | — | 36.26 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.18B | 1.18B | — | 980.3M | 464.0M | — | — | 305.2K | 5.4M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Python | 5th of 5 | Winner uses the highest admitted same-unit throughput. | 1.40B | 1.49B | — | 602.8M | 429.9M | — | — | 630.6K | 21.20B |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 197 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | 896 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.36B | 1.34B | — | 978.0M | 462.0M | — | — | 288.2K | 6.8M |
| verified-native-operation ✅ | element-reads/s | higher is better | Rust | not applicable - references are unranked | Native controls may be ranked; the checked and SLIDE reference lanes remain visible but unranked. | 3.51B | 3.65B | — | 1.85B | — | 584.2M | 1.61B | — | 9.5M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 388.2M | — | — | — | 200.0K | 3.1M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 267.2M | 54.2M | — | — | 44.9K | 1.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.3M | 28.8M | — | — | 56.2K | 1.1M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 2.9M | — | — | — | 4.9K | 428.5K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 23.4M | 23.2M | — | 6.2M | 8.8M | — | — | 6.5K | 133.1K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not applicable - native controls only | This workload deliberately excludes a Galerina subject; it ranks only equivalent native controls. | 304.3M | 370.4M | — | 240.5M | — | — | — | — | 1.5M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | — | — | 1.52 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 144.0K | 145.3K | — | 42.1K | — | — | — | — | 62.6K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 123.2K | — | — | — | — | 107.8K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
