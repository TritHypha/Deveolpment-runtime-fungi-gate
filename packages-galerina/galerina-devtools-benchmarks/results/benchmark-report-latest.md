# Benchmark report — two views

Current run: results/latest.json. Baseline ("last time"): 2026-07-21_post-wat-lowering.

## 1. Difference from the last run

114 runtime·benchmark pairs · median |Δ| 1.4% · >10%: 18.

| Benchmark | Runtime | last | now | Δ% |
|---|---|--:|--:|--:|
| crypto-ops | Galerina gov | 171 | 86 | -49.7% |
| record-allocation | Rust AVX2 | 944.8M | 1.18B | +24.4% |
| binary-trees | Node.js | 79.1M | 60.4M | -23.7% |
| record-allocation | Python | 2.9M | 3.6M | +23.3% |
| hardware-targets | Galerina gov | 3.7K | 4.5K | +22.8% |
| tower-of-hanoi | Python | 2.6M | 3.2M | +22.1% |
| fibonacci-recursive | Python | 4 | 5 | +20.9% |
| nbody | Python | 1.0M | 1.2M | +20.6% |
| governance-cost | Galerina gov | 680 | 810 | +19.1% |
| binary-trees | Rust | 16.5M | 19.6M | +19.1% |
| data-query | Galerina gov | 204.8K | 241.5K | +17.9% |
| collection-pipeline | Python | 12.9M | 10.6M | -17.3% |
| call-chain | Node.js | 274.9M | 317.8M | +15.6% |
| six-digit-guess | Rust AVX2 | 65.2M | 75.3M | +15.4% |
| spore-container | Rust AVX2 | 159.1K | 179.5K | +12.8% |
| call-chain | Python | 1.8M | 1.6M | -11.3% |
| low-memory | Galerina gov | 151.3K | 134.4K | -11.1% |
| gpu-compute | Python | 6.6M | 5.9M | -10.9% |
| spectral-norm | Python | 1.6M | 1.7M | +8.3% |
| fibonacci-recursive | Galerina gov | 12 | 13 | +8.3% |

## 2. Cross-language (current run)

| Benchmark | unit | Rust AVX2 | Rust | C++ | Node.js | WASM prod | Galerina gov | Python |
|---|---|--:|--:|--:|--:|--:|--:|--:|
| compute-mix ✅ | mix-ops/s | 129.3M | 132.2M | 132.5M | 135.4M | 76.9M | 1.7M | 758.6K |
| arithmetic-threshold | per-call | 1.57B | 1.56B | 1.88B | 972.7M | 495.2M | 82 | 3.9M |
| six-digit-guess | per-call | 75.3M | 78.0M | 69.0M | 2.8M | 36.5M | 1 | 91.0K |
| record-allocation ✅ | records/s | 1.18B | 1.17B | — | 55.2M | 555.5M | 2.4M | 3.6M |
| fibonacci-recursive | per-call | 498 | 500 | — | 127 | 17.3K | 13 | 5 |
| tower-of-hanoi ✅ | moves/s | 252.0M | 252.4M | — | 129.8M | 121.1M | 97.3K | 3.2M |
| collection-pipeline ✅ | elements/s | 12.90B | 4.32B | — | 70.4M | 419.4M | 2.3M | 10.6M |
| governance-cost | gov-factor | 900.6M | 884.2M | — | 2.1M | 2.9M | 810 | 20.1K |
| hardware-targets | per-call | 1.2M | 1.2M | — | 903.8K | 38.1M | 4.5K | — |
| low-memory ✅ | items/s | 6.11B | 1.34B | — | 710.2M | 467.7M | 134.4K | 2.9M |
| gpu-compute ✅ | kernel-evals/s | 1.19B | 1.19B | — | 985.5M | 472.8M | 336.5K | 5.9M |
| matrix-multiply ✅ | mul-adds/s | 1.42B | 1.52B | — | 617.7M | 445.8M | 702.4K | 7.1M |
| crypto-ops | per-call | — | — | — | — | — | 86 | — |
| text-html | per-call | — | — | — | — | — | 906 | — |
| tri-logic ✅ | trit-ops/s | 1.39B | 1.38B | — | 980.9M | 472.7M | 335.3K | 6.9M |
| data-query ✅ | record-scans/s | — | — | — | 391.4M | — | 241.5K | 3.9M |
| call-chain ✅ | chains/s | — | — | — | 317.8M | 54.3M | 53.9K | 1.6M |
| nbody ✅ | force-evals/s | — | — | — | 122.7M | 29.6M | 61.8K | 1.2M |
| json-parse ✅ | records/s | — | — | — | 3.4M | — | 5.2K | 448.0K |
| mandelbrot ✅ | pixels/s | 23.4M | 23.4M | — | 6.2M | 9.1M | 7.3K | 152.8K |
| spectral-norm ✅ | A-evals/s | 359.3M | 366.6M | — | 240.3M | — | — | 1.7M |
| binary-trees ✅ | nodes/s | 19.3M | 19.6M | — | 60.4M | 581.0M | 344.2K | 3.1M |
| spore-container ✅ | containers/s | 179.5K | 167.2K | — | 43.1K | — | — | 66.0K |
| framework-pipeline ✅ | requests/s | — | — | — | — | — | — | 114.0K |
| http-throughput | per-call | — | — | — | — | — | — | — |
| naming-check | per-call | — | — | — | — | — | — | — |
| context-receipt | per-call | — | — | — | — | — | — | — |
| intelligence-search | per-call | — | — | — | — | — | — | — |
| provenance-trace | per-call | — | — | — | — | — | — | — |
