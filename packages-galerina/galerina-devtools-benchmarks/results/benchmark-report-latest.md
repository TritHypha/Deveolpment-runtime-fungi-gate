# Benchmark report — interpreted views

Current run: `results/latest.json`. Baseline (last distinct run): 2026-07-25_2026-07-25-close.

## How to read this report

- **Higher is better** for admitted throughput rates such as operations, records or requests per second.
- **Lower is better** for memory allocation measured as heap bytes per operation. Throughput shown on those rows is secondary and does not choose the winner.
- **✅ means the workload is work-equivalent and unit-aligned for cross-runtime ranking; it does not mean Galerina won.**
- A row without ✅ may show observations, but it receives no admitted winner or product place.
- **Galerina** in the place column means the Galerina/Wasm production lane. The governed interpreter is diagnostic evidence and is not counted as another competing product.

## 1. Difference from the last run

117 runtime·benchmark pairs · median |Δ| 1.3% · >10%: 20. Higher throughput is better; a positive Δ means a higher measured rate, not automatically a causal improvement.

| Benchmark | Runtime | Last | Now | Δ% |
|---|---|--:|--:|--:|
| crypto-ops | Galerina governed diagnostic | 86 | 208 | +141.9% |
| gpu-compute | Python | 5.9M | 8.0M | +35.6% |
| binary-trees | Node.js | 60.4M | 78.0M | +29.2% |
| low-memory | Python | 2.9M | 3.7M | +25.9% |
| governance-cost | Python | 20.1K | 24.9K | +24.0% |
| binary-trees | Rust | 19.6M | 15.3M | -21.8% |
| hardware-targets | Galerina governed diagnostic | 4.5K | 3.6K | -20.7% |
| six-digit-guess | Node.js | 2.8M | 2.3M | -18.7% |
| data-query | Galerina governed diagnostic | 241.5K | 204.5K | -15.3% |
| binary-trees | Rust AVX2 | 19.3M | 16.6M | -13.8% |
| tower-of-hanoi | Galerina governed diagnostic | 97.3K | 83.9K | -13.7% |
| record-allocation | Python | 3.6M | 3.1M | -12.8% |
| call-chain | Node.js | 317.8M | 277.6M | -12.7% |
| json-parse | Python | 448.0K | 504.5K | +12.6% |
| governance-cost | Rust | 884.2M | 782.9M | -11.5% |
| low-memory | Galerina governed diagnostic | 134.4K | 149.6K | +11.3% |
| nbody | Python | 1.2M | 1.1M | -11.2% |
| tri-logic | Galerina governed diagnostic | 335.3K | 299.4K | -10.7% |
| fibonacci-recursive | Python | 5 | 5 | -10.4% |
| mandelbrot | Node.js | 6.2M | 6.9M | +10.2% |

## 2. Cross-language (current run)

| Benchmark | Unit | Better | Winner | Galerina production place | Comment | Rust AVX2 | Rust | C++ | Node.js | Galerina/Wasm production | Galerina governed diagnostic | Python |
|---|---|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | higher is better | Node.js | 5th of 6 | Winner uses the highest admitted same-unit throughput. | 130.3M | 132.8M | 133.5M | 136.2M | 78.3M | 1.7M | 797.8K |
| arithmetic-threshold | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.59B | 1.55B | 1.88B | 972.2M | 493.8M | 82 | 3.9M |
| six-digit-guess | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 76.0M | 77.8M | 69.2M | 2.3M | 36.2M | 1 | 86.5K |
| record-allocation ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.215 | <0.001 | 5.99 | 0.010 |
| fibonacci-recursive | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 494 | 490 | — | 125 | 17.1K | 12 | 5 |
| tower-of-hanoi ✅ | moves/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 254.7M | 248.2M | — | 131.1M | 121.7M | 83.9K | 3.1M |
| collection-pipeline ✅ | heap bytes/op | lower is better (heap bytes/op) | Galerina/Wasm production | 1st of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 0.163 | <0.001 | 16.77 | 0.040 |
| governance-cost | gov-factor | internal only | no cross-runtime winner | not ranked | Governance compares Galerina tiers only; native lanes perform different work. | 892.8M | 782.9M | — | 2.1M | 2.9M | 769 | 24.9K |
| hardware-targets | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | 1.2M | 1.2M | — | 909.8K | 38.4M | 3.6K | — |
| low-memory ✅ | heap bytes/op | lower is better (heap bytes/op) | Rust AVX2 + Rust + Node.js + Galerina/Wasm production (tie) | joint 1st of 5 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | 0.00 | 0.00 | — | 0.00 | 0.00 | 35.21 | 0.270 |
| gpu-compute ✅ | kernel-evals/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.19B | 1.19B | — | 989.3M | 472.8M | 313.4K | 8.0M |
| matrix-multiply ✅ | mul-adds/s | higher is better | Rust | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.43B | 1.51B | — | 611.4M | 441.9M | 714.7K | 7.2M |
| crypto-ops | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | 208 | — |
| text-html | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | 953 | — |
| tri-logic ✅ | trit-ops/s | higher is better | Rust AVX2 | 4th of 5 | Winner uses the highest admitted same-unit throughput. | 1.40B | 1.40B | — | 1.00B | 463.6M | 299.4K | 6.8M |
| data-query ✅ | record-scans/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 387.9M | — | 204.5K | 4.1M |
| call-chain ✅ | chains/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 277.6M | 55.2M | 48.5K | 1.4M |
| nbody ✅ | force-evals/s | higher is better | Node.js | 2nd of 3 | Winner uses the highest admitted same-unit throughput. | — | — | — | 122.5M | 29.3M | 56.6K | 1.1M |
| json-parse ✅ | records/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 3.2M | — | 5.5K | 504.5K |
| mandelbrot ✅ | pixels/s | higher is better | Rust AVX2 | 3rd of 5 | Winner uses the highest admitted same-unit throughput. | 23.4M | 23.3M | — | 6.9M | 9.1M | 7.2K | 147.8K |
| spectral-norm ✅ | A-evals/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 374.5M | 379.2M | — | 241.1M | — | — | 1.7M |
| binary-trees ✅ | heap bytes/op | lower is better (heap bytes/op) | Python | 2nd of 3 | Winner uses the lowest non-negative heap bytes/op; throughput is secondary. | — | — | — | 3.15 | <0.001 | 8.25 | 0.00 |
| spore-container ✅ | containers/s | higher is better | Rust | not measured | Winner uses the highest admitted same-unit throughput. | 163.4K | 163.6K | — | 43.8K | — | — | 66.8K |
| framework-pipeline ✅ | requests/s | higher is better | Node.js | not measured | Winner uses the highest admitted same-unit throughput. | — | — | — | 392.9K | — | — | 114.4K |
| http-throughput | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — |
| naming-check | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — |
| context-receipt | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — |
| intelligence-search | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — |
| provenance-trace | per-call | not certified | no admitted winner | not ranked | Measurements are visible, but this workload is not work-equivalence certified. | — | — | — | — | — | — | — |

## 3. Galerina/SLIDE versus archived Galerina/Wasm

Status: `DEFERRED_NO_SLIDE_LANE`. Frozen baseline: `2026-08-02_galerina-wasm-before-slide`.

No production `slide` lane is present. The next executable-backend run will compare its Galerina/SLIDE measurements with the frozen Galerina/Wasm archive; no old Wasm rerun will replace that evidence.

This transition evidence compares performance only. It does not release production authority.
