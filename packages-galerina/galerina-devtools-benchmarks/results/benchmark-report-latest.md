# Benchmark report — two views

Current run: results/latest.json. Baseline ("last time"): 2026-07-25_2026-07-25-close.

## 1. Difference from the last run

117 runtime·benchmark pairs · median |Δ| 1.3% · >10%: 20.

| Benchmark | Runtime | last | now | Δ% |
|---|---|--:|--:|--:|
| crypto-ops | Galerina gov | 86 | 208 | +141.9% |
| gpu-compute | Python | 5.9M | 8.0M | +35.6% |
| binary-trees | Node.js | 60.4M | 78.0M | +29.2% |
| low-memory | Python | 2.9M | 3.7M | +25.9% |
| governance-cost | Python | 20.1K | 24.9K | +24.0% |
| binary-trees | Rust | 19.6M | 15.3M | -21.8% |
| hardware-targets | Galerina gov | 4.5K | 3.6K | -20.7% |
| six-digit-guess | Node.js | 2.8M | 2.3M | -18.7% |
| data-query | Galerina gov | 241.5K | 204.5K | -15.3% |
| binary-trees | Rust AVX2 | 19.3M | 16.6M | -13.8% |
| tower-of-hanoi | Galerina gov | 97.3K | 83.9K | -13.7% |
| record-allocation | Python | 3.6M | 3.1M | -12.8% |
| call-chain | Node.js | 317.8M | 277.6M | -12.7% |
| json-parse | Python | 448.0K | 504.5K | +12.6% |
| governance-cost | Rust | 884.2M | 782.9M | -11.5% |
| low-memory | Galerina gov | 134.4K | 149.6K | +11.3% |
| nbody | Python | 1.2M | 1.1M | -11.2% |
| tri-logic | Galerina gov | 335.3K | 299.4K | -10.7% |
| fibonacci-recursive | Python | 5 | 5 | -10.4% |
| mandelbrot | Node.js | 6.2M | 6.9M | +10.2% |

## 2. Cross-language (current run)

| Benchmark | unit | Rust AVX2 | Rust | C++ | Node.js | WASM prod | Galerina gov | Python |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | 130.3M | 132.8M | 133.5M | 136.2M | 78.3M | 1.7M | 797.8K |
| arithmetic-threshold | per-call | 1.59B | 1.55B | 1.88B | 972.2M | 493.8M | 82 | 3.9M |
| six-digit-guess | per-call | 76.0M | 77.8M | 69.2M | 2.3M | 36.2M | 1 | 86.5K |
| record-allocation ✅ | records/s | 1.18B | 1.17B | — | 52.1M | 536.5M | 2.4M | 3.1M |
| fibonacci-recursive | per-call | 494 | 490 | — | 125 | 17.1K | 12 | 5 |
| tower-of-hanoi ✅ | moves/s | 254.7M | 248.2M | — | 131.1M | 121.7M | 83.9K | 3.1M |
| collection-pipeline ✅ | elements/s | 13.35B | 4.31B | — | 70.6M | 421.0M | 2.5M | 10.8M |
| governance-cost | gov-factor | 892.8M | 782.9M | — | 2.1M | 2.9M | 769 | 24.9K |
| hardware-targets | per-call | 1.2M | 1.2M | — | 909.8K | 38.4M | 3.6K | — |
| low-memory ✅ | items/s | 6.18B | 1.35B | — | 712.3M | 459.1M | 149.6K | 3.7M |
| gpu-compute ✅ | kernel-evals/s | 1.19B | 1.19B | — | 989.3M | 472.8M | 313.4K | 8.0M |
| matrix-multiply ✅ | mul-adds/s | 1.43B | 1.51B | — | 611.4M | 441.9M | 714.7K | 7.2M |
| crypto-ops | per-call | — | — | — | — | — | 208 | — |
| text-html | per-call | — | — | — | — | — | 953 | — |
| tri-logic ✅ | trit-ops/s | 1.40B | 1.40B | — | 1.00B | 463.6M | 299.4K | 6.8M |
| data-query ✅ | record-scans/s | — | — | — | 387.9M | — | 204.5K | 4.1M |
| call-chain ✅ | chains/s | — | — | — | 277.6M | 55.2M | 48.5K | 1.4M |
| nbody ✅ | force-evals/s | — | — | — | 122.5M | 29.3M | 56.6K | 1.1M |
| json-parse ✅ | records/s | — | — | — | 3.2M | — | 5.5K | 504.5K |
| mandelbrot ✅ | pixels/s | 23.4M | 23.3M | — | 6.9M | 9.1M | 7.2K | 147.8K |
| spectral-norm ✅ | A-evals/s | 374.5M | 379.2M | — | 241.1M | — | — | 1.7M |
| binary-trees ✅ | nodes/s | 16.6M | 15.3M | — | 78.0M | 591.1M | 338.0K | 2.9M |
| spore-container ✅ | containers/s | 163.4K | 163.6K | — | 43.8K | — | — | 66.8K |
| framework-pipeline ✅ | requests/s | — | — | — | 392.9K | — | — | 114.4K |
| http-throughput | per-call | — | — | — | — | — | — | — |
| naming-check | per-call | — | — | — | — | — | — | — |
| context-receipt | per-call | — | — | — | — | — | — | — |
| intelligence-search | per-call | — | — | — | — | — | — | — |
| provenance-trace | per-call | — | — | — | — | — | — | — |
