# Galerina Benchmark Report

## Key

**Traffic lights** (🚦) compare each runtime to **Node.js** (the production baseline):

| Light | Meaning | Speed vs Node.js |
|---|---|---|
| 🟢 | Green — fast | At or faster than Node.js (within 10%, or quicker) |
| ⚪ | White — comparable | Within 2× of Node.js |
| 🟡 | Yellow — a little slower | 2–10× slower than Node.js |
| 🔴 | Red — much slower | 10–100× slower than Node.js |
| ⚫ | Black — terrible | 100×+ slower than Node.js |

**Medals** (🥇🥈🥉) rank runtimes by throughput within each benchmark — fastest first.

**Runtimes:**
- **Rust (generic / AVX2)** — native compiled baseline (ceiling).
- **Node.js** — V8 JIT (production baseline for traffic lights).
- **Python** — CPython interpreter (comparison floor).
- **Galerina/WASM legacy lane** — `galerina run` → WAT → WebAssembly. Retained as measured historical and differential evidence; it is not the current production target.

> **Taxonomy — read this before the governance numbers.** The three `⟨interp⟩` rows below are Stage-A diagnostic tiers. The WASM row is a legacy baseline. Production Galerina/SLIDE remains a separate admitted lane and is not manufactured from either observation.
- **Galerina governed ⟨interp⟩** — Stage-A: full governance tree-walker (capabilities + audit + proof rebuilt per call). *Diagnostic worst-case.*
- **Galerina manifest ⟨interp⟩** — Stage-A: pre-verified runtime manifest, governance erased at runtime. *Diagnostic.*
- **Galerina passive ⟨interp⟩** — Stage-A: pre-compiled deployment model with LRU result cache (warm path). *Diagnostic.*

---

## 1. Per-Metric Scoreboards

> Categories: 15 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **Galerina/WASM legacy lane** to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | Galerina/WASM legacy lane | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 80.51M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.74M/s | WASM near native |
| arithmetic-threshold | 510.54M/s | UNCERTIFIED | UNCERTIFIED | 5.42M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 37.44M/s | UNCERTIFIED | UNCERTIFIED | 46.9K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.9K/s | UNCERTIFIED | UNCERTIFIED | 12.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 118.01M/s | 🟡 2.1× slower | 🟢 1.1× slower | 83.9K/s | WASM usable |
| hardware-targets | 40.46M/s | UNCERTIFIED | UNCERTIFIED | 3.1K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 461.79M/s | 🟡 3.3× slower | ⚪ 1.4× slower | 771.0K/s | WASM usable |
| tri-logic | 490.75M/s | 🟡 2.9× slower | 🟡 2.1× slower | 315.5K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 257.2K/s | WASM not built for this lane yet |
| call-chain | 56.90M/s | 🟡 2.7× slower | 🟢 1.2× | 52.5K/s | WASM usable |
| nbody | 30.53M/s | — | 🟡 4.1× slower | 61.1K/s | WASM 2–10× under Node |
| mandelbrot | 9.20M/s | 🟡 2.7× slower | 🟢 1.4× | 7.5K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 28.78B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **Galerina/WASM legacy lane** (~0) | 1 B/op | ~0 | ~0 | 7 B/op | 8 B/op |
| collection-pipeline | **Galerina/WASM legacy lane** (~0) | ~0 | ~0 | ~0 | 18 B/op | 15 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 16 B/op | 57 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 7 B/op | 13 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | Galerina/WASM legacy lane | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.23B/s | 495.71M/s | 4.22M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 28.78B/s | 461.79M/s | 1.71B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the Galerina/WASM legacy lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (197.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 197.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (943.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 943.0/s |
| json-parse | records/s | **Node.js** (3.68M/s) | 3.68M/s | 435.5K/s | not run — no native impl | no WASM — strings/records | 5.3K/s |
| spore-container | containers/s | **Rust (generic)** (147.1K/s) | 43.9K/s | 61.8K/s | 147.1K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (132.5K/s) | 132.5K/s | 114.2K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.6K/s) | 3.6K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (7.0K/s) | 7.0K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (18.6K/s) | 18.6K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (113.1K/s) | 113.1K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (345.0/s) | 345.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina/WASM legacy lane | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 710.0/s | 884.0/s | 3.06M/s | 0.80× governed/manifest (gov overhead ≈ 1.25×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **134.50M/s** | **137.03M/s** | not run — no C++ impl | **140.68M/s** | 755.3K/s | 2.25M/s | 1.79M/s | 1.74M/s | 80.51M/s | not run — no GPU path | 80.9× |
| arithmetic-threshold | not run — no AVX-512 | **1.58B/s** | **1.60B/s** | not run — no C++ impl | 988.80M/s | 3.91M/s | 33.4K/s | 5.50M/s | 5.42M/s | 510.54M/s | not run — no GPU path | 182.6× |
| six-digit-guess | not run — no AVX-512 | 74.95M/s | **79.48M/s** | not run — no C++ impl | 2.82M/s | 90.8K/s | 22.9K/s | 46.5K/s | 46.9K/s | 37.44M/s | not run — no GPU path | 60.2× |
| record-allocation | not run — no AVX-512 | **1.19B/s** | **1.20B/s** | not run — no C++ impl | 61.31M/s | 3.22M/s | 7.91M/s | 2.73M/s | 2.55M/s | 567.29M/s | not run — no GPU path | 24.0× |
| fibonacci-recursive | not run — no AVX-512 | 514.1/s | 520.0/s | not run — no C++ impl | 132.1/s | 4.1/s | **68.8K/s** | 16.0/s | 12.0/s | 17.9K/s | not run — no GPU path | 11.0× |
| tower-of-hanoi | not run — no AVX-512 | **251.40M/s** | **248.19M/s** | not run — no C++ impl | 129.19M/s | 2.63M/s | 92.4K/s | 86.1K/s | 83.9K/s | 118.01M/s | not run — no GPU path | 1.5K× |
| collection-pipeline | not run — no AVX-512 | **13.52B/s** | 4.43B/s | not run — no C++ impl | 74.02M/s | 13.75M/s | 8.63M/s | 2.54M/s | 2.34M/s | 439.42M/s | not run — no GPU path | 31.6× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.21M/s | 1.24M/s | not run — no C++ impl | 949.8K/s | not run | 89.5K/s | 2.3K/s | 3.1K/s | **40.46M/s** | not run — no GPU path | 303.9× |
| low-memory | not run — no AVX-512 | **6.34B/s** | 1.39B/s | not run — no C++ impl | 720.26M/s | 3.63M/s | 182.5K/s | 137.7K/s | 144.3K/s | 489.98M/s | not run — no GPU path | 5.0K× |
| gpu-compute | not run — no AVX-512 | **1.23B/s** | **1.23B/s** | not run — no C++ impl | 1.02B/s | 5.79M/s | 377.0K/s | 348.5K/s | 328.1K/s | 495.71M/s | 4.22M/s | 3.1K× |
| matrix-multiply | not run — no AVX-512 | 1.46B/s | 1.54B/s | not run — no C++ impl | 637.52M/s | **28.78B/s** | 900.5K/s | 678.4K/s | 771.0K/s | 461.79M/s | 1.71B/s | 826.9× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.8K/s** | 1.9K/s | 197.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **60.0K/s** | 2.5K/s | 943.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.43B/s** | **1.40B/s** | not run — no C++ impl | 1.03B/s | 7.30M/s | 327.0K/s | 311.5K/s | 315.5K/s | 490.75M/s | not run — no GPU path | 3.3K× |
| verified-native-operation | not run — no AVX-512 | **3.73B/s** | **3.75B/s** | not run — no C++ impl | 2.04B/s | 9.48M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **392.71M/s** | 5.89M/s | 301.5K/s | 259.3K/s | 257.2K/s | no WASM build | not run — no GPU path | 1.5K× |
| call-chain | not run — no AVX-512 | **154.51M/s** | 138.39M/s | not run — no C++ impl | 47.41M/s | 2.49M/s | 54.0K/s | 50.3K/s | 52.5K/s | 56.90M/s | not run — no GPU path | 903.4× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **125.43M/s** | 1.69M/s | 60.6K/s | 61.2K/s | 61.1K/s | 30.53M/s | not run — no GPU path | 2.1K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.68M/s** | 435.5K/s | 9.6K/s | 4.8K/s | 5.3K/s | no WASM — strings/records | not run — no GPU path | 692.4× |
| mandelbrot | not run — no AVX-512 | **24.39M/s** | **23.63M/s** | not run — no C++ impl | 6.47M/s | 167.9K/s | 8.2K/s | 7.6K/s | 7.5K/s | 9.20M/s | not run — no GPU path | 867.3× |
| spectral-norm | not run — no AVX-512 | **393.17M/s** | **390.26M/s** | not run — no C++ impl | 245.33M/s | 1.74M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 20.68M/s | 21.46M/s | not run — no C++ impl | 81.35M/s | 2.92M/s | 400.8K/s | 349.8K/s | 331.9K/s | **608.78M/s** | not run — no GPU path | 245.1× |
| spore-container | not run — no AVX-512 | **145.4K/s** | **147.1K/s** | not run — no C++ impl | 43.9K/s | 61.8K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **132.5K/s** | 114.2K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| http-throughput | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| naming-check | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| context-receipt | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| intelligence-search | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |
| provenance-trace | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | no comparable metric | not run | not run | not run | not run | no WASM build | not run — no GPU path | N/A — neither ran |

> †`Node/Galerina > 1` = Node.js faster (the usual case for the Stage-A tree-walker). `< 1` = Galerina faster.
> †fibonacci: Galerina=fib(20), others=fib(30) — different workload depth.
> ⚠️ rows are excluded — their workloads are not unit-aligned across runtimes (see §1.6).
> **Bold** = winner (within 5% of fastest). 🖥️ CPU = CPU execution. 🎮 GPU = Deno WebGPU (NVIDIA GeForce RTX 2060).

## 1.6 Unit Alignment Check

> Throughput is only meaningful when every runtime measures the **same unit**. This
> table is the report-side view of the `assertBenchmarkUnits` guard in `throughput-units.mjs`.

| Benchmark | Status | Unit | Notes |
|---|---|---|---|
| compute-mix | ✅ aligned | mix-ops/s | all runtimes normalised to one unit |
| arithmetic-threshold | — legacy | per-call | not centrally normalised (out of scope) |
| six-digit-guess | — legacy | per-call | not centrally normalised (out of scope) |
| record-allocation | ✅ aligned | records/s | all runtimes normalised to one unit |
| fibonacci-recursive | — legacy | per-call | not centrally normalised (out of scope) |
| tower-of-hanoi | ✅ aligned | moves/s | all runtimes normalised to one unit |
| collection-pipeline | ✅ aligned | elements/s | all runtimes normalised to one unit |
| governance-cost | ⚠️ excluded | gov-factor | internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design |
| hardware-targets | — legacy | per-call | not centrally normalised (out of scope) |
| low-memory | ✅ aligned | items/s | all runtimes normalised to one unit |
| gpu-compute | ✅ aligned | kernel-evals/s | all runtimes normalised to one unit |
| matrix-multiply | ✅ aligned | mul-adds/s | all runtimes normalised to one unit |
| crypto-ops | — legacy | per-call | not centrally normalised (out of scope) |
| text-html | — legacy | per-call | not centrally normalised (out of scope) |
| tri-logic | ✅ aligned | trit-ops/s | all runtimes normalised to one unit |
| verified-native-operation | ✅ aligned | element-reads/s | all runtimes normalised to one unit |
| data-query | ✅ aligned | record-scans/s | all runtimes normalised to one unit |
| call-chain | ✅ aligned | chains/s | all runtimes normalised to one unit |
| nbody | ✅ aligned | force-evals/s | all runtimes normalised to one unit |
| json-parse | ✅ aligned | records/s | all runtimes normalised to one unit |
| mandelbrot | ✅ aligned | pixels/s | all runtimes normalised to one unit |
| spectral-norm | ✅ aligned | A-evals/s | all runtimes normalised to one unit |
| binary-trees | ✅ aligned | nodes/s | all runtimes normalised to one unit |
| spore-container | ✅ aligned | containers/s | all runtimes normalised to one unit |
| framework-pipeline | ✅ aligned | requests/s | all runtimes normalised to one unit |
| http-throughput | — legacy | per-call | not centrally normalised (out of scope) |
| naming-check | — legacy | per-call | not centrally normalised (out of scope) |
| context-receipt | — legacy | per-call | not centrally normalised (out of scope) |
| intelligence-search | — legacy | per-call | not centrally normalised (out of scope) |
| provenance-trace | — legacy | per-call | not centrally normalised (out of scope) |

> **Excluded** benchmarks are dropped from the winner table and the Python-floor check until their
> workloads are realigned across runtimes. Excluding them is what stops false "Galerina wins" on
> mismatched workloads (the same class of bug the unit normalisation fixed for the numeric loops).

## 2. Memory Allocation per Operation (low-memory benchmark)

> **Key metric:** bytes allocated on the JS heap per integer operation.
> WASM and bytecode VM should be near 0. Tree-walker allocates per AST node.

| # | 🚦 | Runtime | Bytes/Op | Throughput | Total Ops | Heap Δ |
|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.34B/s | — | — |
| 🥈 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.39B/s | — | — |
| 🥉 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 720.26M/s | — | 17KB |
| 4 | ⚪ | Galerina/WASM legacy lane | 0.00 bytes/op ⚡ ~0 — no boxing | 489.98M/s | — | 42KB |
| 5 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 3.63M/s | — | 272B |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 16 bytes/op ⚠ moderate | 144.3K/s | — | 162KB |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 57 bytes/op ⚠ moderate | 137.7K/s | — | 572KB |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 70 bytes/op ⚠ moderate | 182.5K/s | — | 701KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 50.2MB | 50.2MB | 4.6MB | 584KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 89.2MB | 89.2MB | 22.8MB | 175KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 89.0MB | 89.0MB | 26.2MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 88.9MB | 88.9MB | 25.9MB | 4.5MB |
| compute-mix | Galerina/WASM legacy lane | 77.8MB | 77.8MB | 19.1MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 49.7MB | 50.0MB | 4.3MB | 205KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 89.6MB | 89.6MB | 24.0MB | 96KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 89.5MB | 89.5MB | 22.8MB | 860KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 89.5MB | 89.5MB | 22.8MB | 858KB |
| arithmetic-threshold | Galerina/WASM legacy lane | 91.9MB | 91.9MB | 22.2MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 54.4MB | 54.4MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 90.6MB | 90.6MB | 24.7MB | 130KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 90.9MB | 90.9MB | 23.6MB | 1.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 90.5MB | 90.5MB | 23.8MB | 1.6MB |
| six-digit-guess | Galerina/WASM legacy lane | 92.3MB | 92.3MB | 22.5MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 50.4MB | 50.4MB | 4.4MB | 288KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 91.3MB | 91.3MB | 23.6MB | 418KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 91.3MB | 91.3MB | 22.8MB | 84KB |
| record-allocation | Galerina governed ⟨interp⟩ | 91.9MB | 91.9MB | 22.8MB | 68KB |
| record-allocation | Galerina/WASM legacy lane | 93.3MB | 93.3MB | 23.1MB | 49KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 48.4MB | 48.4MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 91.9MB | 91.9MB | 24.2MB | 69KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 91.9MB | 91.9MB | 23.8MB | 778KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 91.6MB | 91.6MB | 23.7MB | 782KB |
| fibonacci-recursive | Galerina/WASM legacy lane | 94.0MB | 94.0MB | 23.1MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 48.5MB | 48.5MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 92.0MB | 92.0MB | 24.6MB | 54KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 92.0MB | 92.0MB | 23.9MB | 1.9MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 91.8MB | 91.8MB | 24.0MB | 2.0MB |
| tower-of-hanoi | Galerina/WASM legacy lane | 93.8MB | 93.8MB | 22.3MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 65.6MB | 65.6MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 91.5MB | 91.5MB | 23.3MB | 626KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 91.5MB | 91.5MB | 22.3MB | 148KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 92.4MB | 92.4MB | 22.3MB | 176KB |
| collection-pipeline | Galerina/WASM legacy lane | 94.1MB | 94.1MB | 22.2MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 48.3MB | 48.3MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 78.6MB | 78.6MB | 22.4MB | -345KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 80.5MB | 80.5MB | 22.7MB | 489KB |
| governance-cost | Galerina governed ⟨interp⟩ | 77.8MB | 77.8MB | 22.7MB | 530KB |
| governance-cost | Galerina/WASM legacy lane | 78.0MB | 78.0MB | 22.6MB | 49KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 50.4MB | 50.4MB | 4.5MB | 382KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 78.8MB | 78.8MB | 23.2MB | -178KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 78.3MB | 78.3MB | 22.5MB | 119KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 78.5MB | 78.5MB | 22.6MB | 111KB |
| hardware-targets | Galerina/WASM legacy lane | 80.9MB | 80.9MB | 22.8MB | 86KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 49.1MB | 49.1MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 80.3MB | 80.3MB | 24.3MB | 701KB |
| low-memory | Galerina manifest ⟨interp⟩ | 78.8MB | 78.8MB | 23.1MB | 572KB |
| low-memory | Galerina governed ⟨interp⟩ | 78.7MB | 78.7MB | 22.6MB | 162KB |
| low-memory | Galerina/WASM legacy lane | 81.0MB | 81.0MB | 22.8MB | 42KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 48.8MB | 48.8MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 81.4MB | 81.4MB | 23.2MB | 212KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 81.3MB | 81.3MB | 23.9MB | 1.3MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 81.1MB | 81.1MB | 22.9MB | 332KB |
| gpu-compute | Galerina/WASM legacy lane | 83.5MB | 83.5MB | 22.8MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 50.4MB | 50.4MB | 4.8MB | 672KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 81.4MB | 81.4MB | 23.4MB | 173KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 81.4MB | 81.4MB | 24.8MB | 2.2MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 81.2MB | 81.2MB | 23.7MB | 1.1MB |
| matrix-multiply | Galerina/WASM legacy lane | 83.7MB | 83.7MB | 22.9MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 62.4MB | 62.4MB | 10.0MB | 4.5MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 81.6MB | 81.6MB | 23.4MB | -159KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 81.5MB | 81.5MB | 22.9MB | 198KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 81.5MB | 81.5MB | 22.9MB | 346KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 82.5MB | 82.5MB | 23.3MB | -34KB |
| text-html | Galerina manifest ⟨interp⟩ | 81.6MB | 81.6MB | 23.2MB | 177KB |
| text-html | Galerina governed ⟨interp⟩ | 81.6MB | 81.6MB | 23.3MB | 197KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 329KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 81.6MB | 81.6MB | 24.9MB | 439KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 81.6MB | 81.6MB | 24.3MB | 1.1MB |
| tri-logic | Galerina governed ⟨interp⟩ | 79.6MB | 79.6MB | 24.5MB | 1.5MB |
| tri-logic | Galerina/WASM legacy lane | 84.6MB | 84.6MB | 23.4MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 85.6MB | 85.6MB | 27.7MB | 1.3MB |
| data-query | Galerina manifest ⟨interp⟩ | 86.7MB | 86.7MB | 24.7MB | 804KB |
| data-query | Galerina governed ⟨interp⟩ | 87.0MB | 87.0MB | 26.4MB | 2.4MB |
| call-chain | Rust AVX2 | — | — | — | — |
| call-chain | Rust (generic) | — | — | — | — |
| call-chain | Node.js | 48.6MB | 48.6MB | 4.1MB | 14KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 94.7MB | 94.7MB | 29.6MB | 127KB |
| call-chain | Galerina manifest ⟨interp⟩ | 94.7MB | 94.7MB | 30.9MB | 6.8MB |
| call-chain | Galerina governed ⟨interp⟩ | 96.8MB | 96.8MB | 30.8MB | 6.7MB |
| call-chain | Galerina/WASM legacy lane | 89.6MB | 89.6MB | 24.2MB | 1KB |
| nbody | Node.js | 50.5MB | 50.5MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 97.3MB | 97.3MB | 25.5MB | 246KB |
| nbody | Galerina manifest ⟨interp⟩ | 97.3MB | 97.3MB | 24.7MB | 550KB |
| nbody | Galerina governed ⟨interp⟩ | 96.4MB | 96.4MB | 25.5MB | 1.3MB |
| nbody | Galerina/WASM legacy lane | 97.1MB | 97.1MB | 24.5MB | 1KB |
| json-parse | Node.js | — | — | — | 254KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 103.1MB | 103.1MB | 27.0MB | 467KB |
| json-parse | Galerina manifest ⟨interp⟩ | 100.1MB | 100.1MB | 27.6MB | 2.9MB |
| json-parse | Galerina governed ⟨interp⟩ | 104.2MB | 104.2MB | 26.6MB | 2.4MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 50.6MB | 50.6MB | 4.4MB | 233KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 98.9MB | 98.9MB | 28.3MB | 175KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 98.9MB | 98.9MB | 27.6MB | 3.0MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 98.1MB | 98.1MB | 25.0MB | 152KB |
| mandelbrot | Galerina/WASM legacy lane | 103.2MB | 103.2MB | 25.1MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 50.3MB | 50.3MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 50.5MB | 50.5MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 97.6MB | 97.6MB | 25.1MB | 74KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 97.6MB | 97.6MB | 26.4MB | 1.8MB |
| binary-trees | Galerina governed ⟨interp⟩ | 98.3MB | 98.3MB | 25.6MB | 977KB |
| binary-trees | Galerina/WASM legacy lane | 99.3MB | 99.3MB | 24.9MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 66.1MB | 66.1MB | 8.8MB | 1.6MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 77.3MB | 77.3MB | 19.2MB | 13.0MB |
| framework-pipeline | Python | — | — | 2KB | 2KB |
| http-throughput | Node.js | — | — | — | — |
| naming-check | Node.js | — | — | — | — |
| context-receipt | Node.js | — | — | — | — |
| intelligence-search | Node.js | — | — | — | — |
| provenance-trace | Node.js | — | — | — | — |

> **Heap Δ** = heap after minus heap before execution. Negative means GC reclaimed memory during the run.
> **Galerina:** each tree-walker node evaluation allocates a new GalerinaValue object — visible as positive heap delta.

## 3. CPU Efficiency

| Benchmark | Runtime | Wall time | CPU time | CPU utilisation | Ops/CPU-ms |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | 5.00s | — | — | — |
| compute-mix | Rust (generic) | 5.00s | — | — | — |
| compute-mix | Node.js | 3.00s | 3.00s | 100% | 140.7K ops/CPU-ms |
| compute-mix | Python | 3.05s | 3.05s | 100% | 754.87 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 27.9ms | 94.0ms | 336% | 531.91 ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 28.8ms | 47.0ms | 163% | 1.1K ops/CPU-ms |
| compute-mix | Galerina/WASM legacy lane | 1.24s | 1.23s | 99% | 81.0K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.7ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.5ms | — | — | — |
| arithmetic-threshold | Node.js | 20.2ms | 31.0ms | 153% | 645.2K ops/CPU-ms |
| arithmetic-threshold | Python | 5.12s | 5.13s | 100% | 3.9K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 11.5ms | 31.0ms | 269% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 11.7ms | 31.0ms | 265% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina/WASM legacy lane | 1.11s | 1.13s | 101% | 506.0K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 14.9ms | 31.0ms | 208% | 1.4K ops/CPU-ms |
| six-digit-guess | Python | 463.4ms | 468.8ms | 101% | 89.75 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 904.2ms | 969.0ms | 107% | 43.41 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 897.2ms | 1.02s | 113% | 41.41 ops/CPU-ms |
| six-digit-guess | Galerina/WASM legacy lane | 1.12s | 1.13s | 100% | 37.4K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.4ms | — | — | — |
| record-allocation | Rust (generic) | 8.4ms | — | — | — |
| record-allocation | Node.js | 3.3ms | 0.0ms | 0% | — |
| record-allocation | Python | 62.0ms | 62.5ms | 101% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.7ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 3.9ms | 31.0ms | 791% | 322.58 ops/CPU-ms |
| record-allocation | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 570.0K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 389.0ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 384.6ms | — | — | — |
| fibonacci-recursive | Node.js | 757.2ms | 766.0ms | 101% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 4.85s | 4.86s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 60.9ms | 63.0ms | 103% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 82.4ms | 109.0ms | 132% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina/WASM legacy lane | 1.00s | 1.01s | 101% | 17.73 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 521.4ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 528.1ms | — | — | — |
| tower-of-hanoi | Node.js | 101.5ms | 109.0ms | 107% | 120.2K ops/CPU-ms |
| tower-of-hanoi | Python | 498.7ms | 484.4ms | 97% | 2.7K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 761.3ms | 812.0ms | 107% | 80.71 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 781.3ms | 797.0ms | 102% | 82.23 ops/CPU-ms |
| tower-of-hanoi | Galerina/WASM legacy lane | 1.11s | 1.11s | 100% | 118.2K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 73.9ms | — | — | — |
| collection-pipeline | Rust (generic) | 225.8ms | — | — | — |
| collection-pipeline | Node.js | 675.5ms | 702.0ms | 104% | 71.2K ops/CPU-ms |
| collection-pipeline | Python | 3.64s | 3.64s | 100% | 13.7K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 3.9ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 440.0K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.0ms | — | — | — |
| governance-cost | Rust (generic) | 10.9ms | — | — | — |
| governance-cost | Node.js | 46.2ms | 63.0ms | 137% | — |
| governance-cost | Python | 4.92s | 4.92s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.4ms | 0.0ms | 0% | — |
| governance-cost | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | — |
| hardware-targets | Rust AVX2 | 825.0ms | — | — | — |
| hardware-targets | Rust (generic) | 806.6ms | — | — | — |
| hardware-targets | Node.js | 1.05s | 1.09s | 104% | 914.08 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 40.5K ops/CPU-ms |
| low-memory | Rust AVX2 | 157.7ms | — | — | — |
| low-memory | Rust (generic) | 720.3ms | — | — | — |
| low-memory | Node.js | 69.4ms | 63.0ms | 91% | 793.7K ops/CPU-ms |
| low-memory | Python | 2.75s | 2.75s | 100% | 3.6K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 72.6ms | 94.0ms | 129% | 106.38 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 69.3ms | 110.0ms | 159% | 90.91 ops/CPU-ms |
| low-memory | Galerina/WASM legacy lane | 1.00s | 1.02s | 102% | 482.3K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.05s | — | — | — |
| gpu-compute | Rust (generic) | 4.07s | — | — | — |
| gpu-compute | Node.js | 490.3ms | 485.0ms | 99% | 1.03M ops/CPU-ms |
| gpu-compute | Python | 8.64s | 8.64s | 100% | 5.8K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 286.9ms | 297.0ms | 104% | 336.70 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 304.8ms | 329.0ms | 108% | 303.95 ops/CPU-ms |
| gpu-compute | Galerina/WASM legacy lane | 1.01s | 1.01s | 101% | 492.6K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 23.7ms | — | — | — |
| matrix-multiply | Rust AVX2 | 89.7ms | — | — | — |
| matrix-multiply | Rust (generic) | 85.0ms | — | — | — |
| matrix-multiply | Node.js | 205.6ms | 219.0ms | 107% | 598.5K ops/CPU-ms |
| matrix-multiply | Python | 0.5ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 48.3ms | 94.0ms | 195% | 348.60 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 42.5ms | 78.0ms | 184% | 420.10 ops/CPU-ms |
| matrix-multiply | Galerina/WASM legacy lane | 1.06s | 1.06s | 100% | 462.4K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.3ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 17.2ms | 31.0ms | 181% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 78.0ms | 14717% | 0.01 ops/CPU-ms |
| crypto-ops | Galerina governed ⟨interp⟩ | 5.1ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 419.6ms | — | — | — |
| tri-logic | Rust (generic) | 429.3ms | — | — | — |
| tri-logic | Node.js | 292.4ms | — | — | — |
| tri-logic | Python | 1.64s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.9ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 963.1ms | 1.05s | 109% | 286.53 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 950.9ms | 985.0ms | 104% | 304.57 ops/CPU-ms |
| tri-logic | Galerina/WASM legacy lane | 1.22s | 1.22s | 100% | 492.6K ops/CPU-ms |
| data-query | Node.js | 127.3ms | — | — | — |
| data-query | Python | 509.5ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 38.6ms | 47.0ms | 122% | 212.77 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 38.9ms | 47.0ms | 121% | 212.77 ops/CPU-ms |
| call-chain | Rust AVX2 | 0.3ms | — | — | — |
| call-chain | Rust (generic) | 0.4ms | — | — | — |
| call-chain | Node.js | 1.1ms | 0.0ms | 0% | — |
| call-chain | Python | 20.1ms | 31.3ms | 156% | 1.6K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 995.0ms | 1.00s | 100% | 50.00 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 952.8ms | 1.03s | 108% | 48.45 ops/CPU-ms |
| call-chain | Galerina/WASM legacy lane | 1.76s | 1.76s | 100% | 56.7K ops/CPU-ms |
| nbody | Node.js | 52.3ms | 62.0ms | 119% | 105.7K ops/CPU-ms |
| nbody | Python | 967.6ms | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 535.4ms | 563.0ms | 105% | 58.20 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 536.1ms | 609.0ms | 114% | 53.81 ops/CPU-ms |
| nbody | Galerina/WASM legacy lane | 1.07s | 1.08s | 100% | 30.4K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 103.5ms | 109.0ms | 105% | 4.59 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 94.2ms | 140.0ms | 149% | 3.57 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 134.3ms | — | — | — |
| mandelbrot | Rust (generic) | 138.7ms | — | — | — |
| mandelbrot | Node.js | 506.2ms | 531.0ms | 105% | 6.2K ops/CPU-ms |
| mandelbrot | Python | 19.52s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.14s | 2.25s | 105% | 7.28 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.19s | 2.22s | 101% | 7.39 ops/CPU-ms |
| mandelbrot | Galerina/WASM legacy lane | 1.78s | 1.78s | 100% | 9.2K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 25.4ms | — | — | — |
| spectral-norm | Rust (generic) | 25.6ms | — | — | — |
| spectral-norm | Node.js | 40.8ms | 31.0ms | 76% | 322.6K ops/CPU-ms |
| spectral-norm | Python | 5.75s | — | — | — |
| binary-trees | Rust AVX2 | 6.6ms | — | — | — |
| binary-trees | Rust (generic) | 6.3ms | — | — | — |
| binary-trees | Node.js | 1.7ms | 0.0ms | 0% | — |
| binary-trees | Python | 46.5ms | 46.9ms | 101% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 388.4ms | 406.0ms | 105% | 334.62 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 409.4ms | 437.0ms | 107% | 310.88 ops/CPU-ms |
| binary-trees | Galerina/WASM legacy lane | 1.12s | 1.13s | 101% | 603.8K ops/CPU-ms |
| spore-container | Rust AVX2 | 2.06s | — | — | — |
| spore-container | Rust (generic) | 2.04s | — | — | — |
| spore-container | Node.js | 6.83s | 8.09s | 118% | 37.06 ops/CPU-ms |
| spore-container | Python | 1.62s | — | — | — |
| framework-pipeline | Node.js | 1.51s | 2.25s | 149% | 88.89 ops/CPU-ms |
| framework-pipeline | Python | 1.75s | — | — | — |
| http-throughput | Node.js | 83.0ms | — | — | — |
| naming-check | Node.js | 444.0ms | — | — | — |
| context-receipt | Node.js | 312.0ms | — | — | — |
| intelligence-search | Node.js | 44.0ms | — | — | — |
| provenance-trace | Node.js | 4.49s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 140.68M/s | 3.00s | 3.00s | 50.2MB | ~0 | 186.2× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 137.03M/s | 5.00s | — | — | ~0 (native) | 181.4× | 0.97× |
| 🥉 | 🟢 | Rust AVX2 | 134.50M/s | 5.00s | — | — | ~0 (native) | 178.1× | 0.96× |
| 4 | ⚪ | Galerina/WASM legacy lane | 80.51M/s | 1.24s | 1.23s | 77.8MB | ~0 | 106.6× | 0.57× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.25M/s | 0.3ms | 0.0ms | 89.2MB | 265 B/op | 2.98× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.79M/s | 27.9ms | 94.0ms | 89.0MB | 91 B/op | 2.37× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.74M/s | 28.8ms | 47.0ms | 88.9MB | 90 B/op | 2.30× | 0.01× |
| 8 | ⚫ | Python | 755.3K/s | 3.05s | 3.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (265 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.60B/s | 12.5ms | — | — | ~0 (native) | 408.9× | 1.62× |
| 🥈 | 🟢 | Rust AVX2 | 1.58B/s | 12.7ms | — | — | ~0 (native) | 403.6× | 1.59× |
| 🥉 | 🟢 | Node.js | 988.80M/s | 20.2ms | 31.0ms | 49.7MB | ~0 | 253.1× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 510.54M/s | 1.11s | 1.13s | 91.9MB | ~0 | 130.7× | 0.52× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.50M/s | 11.5ms | 31.0ms | 89.5MB | 14 B/op | 1.41× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.42M/s | 11.7ms | 31.0ms | 89.5MB | 14 B/op | 1.39× | 0.01× |
| 7 | ⚫ | Python | 3.91M/s | 5.12s | 5.13s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 33.4K/s | 0.1ms | 0.0ms | 89.6MB | 31.1 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (31.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 79.48M/s | 0.5ms | — | — | ~0 (native) | 875.5× | 28.2× |
| 🥈 | 🟢 | Rust AVX2 | 74.95M/s | 0.6ms | — | — | ~0 (native) | 825.6× | 26.6× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 37.44M/s | 1.12s | 1.13s | 92.3MB | ~0 | 412.3× | 13.3× |
| 4 | 🟢 | Node.js | 2.82M/s | 14.9ms | 31.0ms | 54.4MB | 26 B/op | 31.1× | 1.00× |
| 5 | 🔴 | Python | 90.8K/s | 463.4ms | 468.8ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina governed ⟨interp⟩ | 46.9K/s | 897.2ms | 1.02s | 90.5MB | 37 B/op | 0.52× | 0.02× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 46.5K/s | 904.2ms | 969.0ms | 90.9MB | 25 B/op | 0.51× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 22.9K/s | 0.1ms | 0.0ms | 90.6MB | 42.1 KB/op | 0.25× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (42.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.20B/s | 8.4ms | — | — | ~0 (native) | 371.0× | 19.5× |
| 🥈 | 🟢 | Rust AVX2 | 1.19B/s | 8.4ms | — | — | ~0 (native) | 370.3× | 19.5× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 567.29M/s | 1.00s | 1.00s | 93.3MB | ~0 | 175.9× | 9.25× |
| 4 | 🟢 | Node.js | 61.31M/s | 3.3ms | 0.0ms | 50.4MB | 1 B/op | 19.0× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 7.91M/s | 0.3ms | 0.0ms | 91.3MB | 172 B/op | 2.45× | 0.13× |
| 6 | 🔴 | Python | 3.22M/s | 62.0ms | 62.5ms | — | ~0 | 1.00× | 0.05× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.73M/s | 3.7ms | 0.0ms | 91.3MB | 8 B/op | 0.85× | 0.04× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.55M/s | 3.9ms | 31.0ms | 91.9MB | 7 B/op | 0.79× | 0.04× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (172 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 68.8K/s | 0.1ms | 0.0ms | 91.9MB | 13.5 KB/op | 16.7K× | 520.8× |
| 🥈 | 🟢 | Galerina/WASM legacy lane | 17.9K/s | 1.00s | 1.01s | 94.0MB | ~0 | 4.3K× | 135.7× |
| 🥉 | 🟢 | Rust (generic) | 520.0/s | 384.6ms | — | — | ~0 (native) | 126.2× | 3.94× |
| 4 | 🟢 | Rust AVX2 | 514.1/s | 389.0ms | — | — | ~0 (native) | 124.8× | 3.89× |
| 5 | 🟢 | Node.js | 132.1/s | 757.2ms | 766.0ms | 48.4MB | 53 B/op | 32.1× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 16.0/s | 60.9ms | 63.0ms | 91.9MB | 779.7 KB/op | 3.88× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 12.0/s | 82.4ms | 109.0ms | 91.6MB | 772.4 KB/op | 2.91× | 0.09× |
| 8 | 🔴 | Python | 4.1/s | 4.85s | 4.86s | — | 23 B/op | 1.00× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina manifest ⟨interp⟩ (779.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 251.40M/s | 521.4ms | — | — | ~0 (native) | 95.6× | 1.95× |
| 🥈 | 🟢 | Rust (generic) | 248.19M/s | 528.1ms | — | — | ~0 (native) | 94.4× | 1.92× |
| 🥉 | 🟢 | Node.js | 129.19M/s | 101.5ms | 109.0ms | 48.5MB | ~0 | 49.2× | 1.00× |
| 4 | 🟢 | Galerina/WASM legacy lane | 118.01M/s | 1.11s | 1.11s | 93.8MB | ~0 | 44.9× | 0.91× |
| 5 | 🔴 | Python | 2.63M/s | 498.7ms | 484.4ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 92.4K/s | 0.1ms | 0.0ms | 92.0MB | 9.9 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 86.1K/s | 761.3ms | 812.0ms | 92.0MB | 29 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 83.9K/s | 781.3ms | 797.0ms | 91.8MB | 31 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (9.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.52B/s | 73.9ms | — | — | ~0 (native) | 983.7× | 182.7× |
| 🥈 | 🟢 | Rust (generic) | 4.43B/s | 225.8ms | — | — | ~0 (native) | 322.1× | 59.8× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 439.42M/s | 1.00s | 1.00s | 94.1MB | ~0 | 32.0× | 5.94× |
| 4 | 🟢 | Node.js | 74.02M/s | 675.5ms | 702.0ms | 65.6MB | ~0 | 5.38× | 1.00× |
| 5 | 🟡 | Python | 13.75M/s | 3.64s | 3.64s | — | ~0 | 1.00× | 0.19× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.63M/s | 0.4ms | 0.0ms | 91.5MB | 177 B/op | 0.63× | 0.12× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.54M/s | 3.9ms | 0.0ms | 91.5MB | 15 B/op | 0.19× | 0.03× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.34M/s | 4.3ms | 0.0ms | 92.4MB | 18 B/op | 0.17× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (177 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 912.44M/s | 11.0ms |
| Rust (generic) | 916.62M/s | 10.9ms |
| Node.js | 2.17M/s | 46.2ms |
| Python | 20.3K/s | 4.92s |
| Galerina passive ⟨interp⟩ | 2.3K/s | 1.7ms |
| Galerina manifest ⟨interp⟩ | 884.0/s | 1.1ms |
| Galerina governed ⟨interp⟩ | 710.0/s | 1.4ms |
| Galerina/WASM legacy lane | 3.06M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 40.46M/s | 1.00s | 1.00s | 80.9MB | ~0 | — | 42.6× |
| 🥈 | 🟢 | Rust (generic) | 1.24M/s | 806.6ms | — | — | ~0 (native) | — | 1.31× |
| 🥉 | 🟢 | Rust AVX2 | 1.21M/s | 825.0ms | — | — | ~0 (native) | — | 1.28× |
| 4 | 🟢 | Node.js | 949.8K/s | 1.05s | 1.09s | 50.4MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 89.5K/s | 11.2ms | 0.0ms | 78.8MB | -178 B/op | — | 0.09× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 3.1K/s | 0.3ms | 0.0ms | 78.5MB | 107.9 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 2.3K/s | 0.4ms | 0.0ms | 78.3MB | 115.8 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-178 B/op) · **highest:** Galerina manifest ⟨interp⟩ (115.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.34B/s | 157.7ms | — | — | ~0 | 1.7K× | 8.80× |
| 🥈 | 🟢 | Rust (generic) | 1.39B/s | 720.3ms | — | — | ~0 | 381.9× | 1.93× |
| 🥉 | 🟢 | Node.js | 720.26M/s | 69.4ms | 63.0ms | 49.1MB | ~0 | 198.1× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 489.98M/s | 1.00s | 1.02s | 81.0MB | ~0 | 134.8× | 0.68× |
| 5 | ⚫ | Python | 3.63M/s | 2.75s | 2.75s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 182.5K/s | 0.5ms | 0.0ms | 80.3MB | 7.5 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 144.3K/s | 69.3ms | 110.0ms | 78.7MB | 16 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 137.7K/s | 72.6ms | 94.0ms | 78.8MB | 57 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Rust AVX2 (~0) · **highest:** Galerina passive ⟨interp⟩ (7.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.23B/s | 4.05s | — | — | ~0 (native) | 213.1× | 1.21× |
| 🥈 | 🟢 | Rust (generic) | 1.23B/s | 4.07s | — | — | ~0 (native) | 212.4× | 1.21× |
| 🥉 | 🟢 | Node.js | 1.02B/s | 490.3ms | 485.0ms | 48.8MB | ~0 | 176.2× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 495.71M/s | 1.01s | 1.01s | 83.5MB | ~0 | 85.6× | 0.49× |
| 5 | ⚫ | Python | 5.79M/s | 8.64s | 8.64s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.22M/s | 23.7ms | — | — | — | 0.73× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 377.0K/s | 0.2ms | 0.0ms | 81.4MB | 3.2 KB/op | 0.07× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 348.5K/s | 286.9ms | 297.0ms | 81.3MB | 13 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 328.1K/s | 304.8ms | 329.0ms | 81.1MB | 3 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (3.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 28.78B/s | 0.5ms | — | — | 332 B/op | 1.00× | 45.1× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.71B/s | 12.3ms | — | — | — | 0.06× | 2.68× |
| 🥉 | 🟢 | Rust (generic) | 1.54B/s | 85.0ms | — | — | ~0 (native) | 0.05× | 2.42× |
| 4 | 🟢 | Rust AVX2 | 1.46B/s | 89.7ms | — | — | ~0 (native) | 0.05× | 2.29× |
| 5 | 🟢 | Node.js | 637.52M/s | 205.6ms | 219.0ms | 50.4MB | ~0 | 0.02× | 1.00× |
| 6 | ⚪ | Galerina/WASM legacy lane | 461.79M/s | 1.06s | 1.06s | 83.7MB | ~0 | 0.02× | 0.72× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 900.5K/s | 0.1ms | 0.0ms | 81.4MB | 1.5 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 771.0K/s | 42.5ms | 78.0ms | 81.2MB | 33 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 678.4K/s | 48.3ms | 94.0ms | 81.4MB | 66 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (1.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.8K/s | 17.2ms | 31.0ms | 81.6MB | -1.6 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.9K/s | 0.5ms | 78.0ms | 81.5MB | 193.8 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 197.0/s | 5.1ms | 0.0ms | 81.5MB | 337.6 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.6 KB/op) · **highest:** Galerina governed ⟨interp⟩ (337.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 60.0K/s | 1.7ms | 0.0ms | 82.5MB | -337 B/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.5K/s | 0.4ms | 0.0ms | 81.6MB | 172.9 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 943.0/s | 1.1ms | 0.0ms | 81.6MB | 192.5 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-337 B/op) · **highest:** Galerina governed ⟨interp⟩ (192.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.43B/s | 419.6ms | — | — | ~0 (native) | 195.8× | 1.39× |
| 🥈 | 🟢 | Rust (generic) | 1.40B/s | 429.3ms | — | — | ~0 (native) | 191.4× | 1.36× |
| 🥉 | 🟢 | Node.js | 1.03B/s | 292.4ms | — | — | ~0 | 140.5× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 490.75M/s | 1.22s | 1.22s | 84.6MB | ~0 | 67.2× | 0.48× |
| 5 | ⚫ | Python | 7.30M/s | 1.64s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 327.0K/s | 1.9ms | 0.0ms | 81.6MB | 724 B/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 315.5K/s | 950.9ms | 985.0ms | 79.6MB | 5 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 311.5K/s | 963.1ms | 1.05s | 81.6MB | 4 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (724 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 3.75B/s | — | — | — | ~0 (native) | 395.5× | 1.84× |
| 🥈 | 🟢 | Rust AVX2 | 3.73B/s | — | — | — | ~0 (native) | 393.9× | 1.83× |
| 🥉 | 🟢 | Node.js | 2.04B/s | — | — | — | — | 214.8× | 1.00× |
| 4 | ⚫ | Python | 9.48M/s | — | — | — | — | 1.00× | 0.00× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 392.71M/s | 127.3ms | — | — | ~0 | 66.7× | 1.00× |
| 🥈 | 🔴 | Python | 5.89M/s | 509.5ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 301.5K/s | 0.5ms | 0.0ms | 85.6MB | 7.8 KB/op | 0.05× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 259.3K/s | 38.6ms | 47.0ms | 86.7MB | 80 B/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 257.2K/s | 38.9ms | 47.0ms | 87.0MB | 245 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (7.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 154.51M/s | 0.3ms | — | — | ~0 (native) | 62.0× | 3.26× |
| 🥈 | 🟢 | Rust (generic) | 138.39M/s | 0.4ms | — | — | ~0 (native) | 55.6× | 2.92× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 56.90M/s | 1.76s | 1.76s | 89.6MB | ~0 | 22.8× | 1.20× |
| 4 | 🟢 | Node.js | 47.41M/s | 1.1ms | 0.0ms | 48.6MB | ~0 | 19.0× | 1.00× |
| 5 | 🔴 | Python | 2.49M/s | 20.1ms | 31.3ms | — | ~0 | 1.00× | 0.05× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 54.0K/s | 0.1ms | 0.0ms | 94.7MB | 17.9 KB/op | 0.02× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 52.5K/s | 952.8ms | 1.03s | 96.8MB | 134 B/op | 0.02× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 50.3K/s | 995.0ms | 1.00s | 94.7MB | 136 B/op | 0.02× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (17.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 125.43M/s | 52.3ms | 62.0ms | 50.5MB | ~0 | 74.1× | 1.00× |
| 🥈 | 🟡 | Galerina/WASM legacy lane | 30.53M/s | 1.07s | 1.08s | 97.1MB | ~0 | 18.0× | 0.24× |
| 🥉 | 🔴 | Python | 1.69M/s | 967.6ms | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 61.2K/s | 535.4ms | 563.0ms | 97.3MB | 17 B/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 61.1K/s | 536.1ms | 609.0ms | 96.4MB | 41 B/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 60.6K/s | 0.2ms | 0.0ms | 97.3MB | 17.1 KB/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (17.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.68M/s | — | — | — | — | 8.44× | 1.00× |
| 🥈 | 🟡 | Python | 435.5K/s | — | — | — | 1 B/op | 1.00× | 0.12× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 9.6K/s | 0.4ms | 0.0ms | 103.1MB | 111.2 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.3K/s | 94.2ms | 140.0ms | 104.2MB | 4.8 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.8K/s | 103.5ms | 109.0ms | 100.1MB | 5.7 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (111.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 24.39M/s | 134.3ms | — | — | ~0 (native) | 145.3× | 3.77× |
| 🥈 | 🟢 | Rust (generic) | 23.63M/s | 138.7ms | — | — | ~0 (native) | 140.8× | 3.65× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 9.20M/s | 1.78s | 1.78s | 103.2MB | ~0 | 54.8× | 1.42× |
| 4 | 🟢 | Node.js | 6.47M/s | 506.2ms | 531.0ms | 50.6MB | ~0 | 38.6× | 1.00× |
| 5 | 🔴 | Python | 167.9K/s | 19.52s | — | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 8.2K/s | 0.2ms | 0.0ms | 98.9MB | 137.4 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 7.6K/s | 2.14s | 2.25s | 98.9MB | 185 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 7.5K/s | 2.19s | 2.22s | 98.1MB | 9 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (137.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 393.17M/s | 25.4ms | — | — | ~0 (native) | 226.0× | 1.60× |
| 🥈 | 🟢 | Rust (generic) | 390.26M/s | 25.6ms | — | — | ~0 (native) | 224.4× | 1.59× |
| 🥉 | 🟢 | Node.js | 245.33M/s | 40.8ms | 31.0ms | 50.3MB | ~0 | 141.0× | 1.00× |
| 4 | ⚫ | Python | 1.74M/s | 5.75s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 608.78M/s | 1.12s | 1.13s | 99.3MB | ~0 | 208.2× | 7.48× |
| 🥈 | 🟢 | Node.js | 81.35M/s | 1.7ms | 0.0ms | 50.5MB | 3 B/op | 27.8× | 1.00× |
| 🥉 | 🟡 | Rust (generic) | 21.46M/s | 6.3ms | — | — | ~0 (native) | 7.34× | 0.26× |
| 4 | 🟡 | Rust AVX2 | 20.68M/s | 6.6ms | — | — | ~0 (native) | 7.07× | 0.25× |
| 5 | 🔴 | Python | 2.92M/s | 46.5ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 400.8K/s | 0.1ms | 0.0ms | 97.6MB | 2.5 KB/op | 0.14× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 349.8K/s | 388.4ms | 406.0ms | 97.6MB | 13 B/op | 0.12× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 331.9K/s | 409.4ms | 437.0ms | 98.3MB | 7 B/op | 0.11× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 147.1K/s | 2.04s | — | — | ~0 (native) | 2.38× | 3.35× |
| 🥈 | 🟢 | Rust AVX2 | 145.4K/s | 2.06s | — | — | ~0 (native) | 2.35× | 3.31× |
| 🥉 | 🟢 | Python | 61.8K/s | 1.62s | — | — | ~0 | 1.00× | 1.41× |
| 4 | 🟢 | Node.js | 43.9K/s | 6.83s | 8.09s | 66.1MB | 5 B/op | 0.71× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (5 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 132.5K/s | 1.51s | 2.25s | 77.3MB | 65 B/op | 1.16× | 1.00× |
| 🥈 | ⚪ | Python | 114.2K/s | 1.75s | — | — | ~0 | 1.00× | 0.86× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (65 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### http-throughput

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### naming-check

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### context-receipt

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### intelligence-search

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|

### provenance-trace

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|


## 4b. GPU-Compute Workload (parallel map-reduce)

> A **GPU-shaped** workload: a per-element kernel `f(i)=i*2+1` applied across 100,000 elements + reduction.
> On a GPU this parallelises across thousands of threads. 🖥️ CPU = running on CPU; 🎮 GPU = real GPU dispatch.

**Archived GPU evidence:** NVIDIA GeForce RTX 2060 executed the pinned Deno WebGPU lane
**Compute toolchain:** derived from results/latest.json; no live host probe is used while rendering.
**Deno WebGPU:** ✅ measured — real GPU dispatch (NVIDIA GeForce RTX 2060)
**Galerina GPU backend:** `not-implemented` — gpu-plan.ts emits a WGSL skeleton only; no dispatch path (pending Phase 38).

| # | 🚦 | Runtime | Device (🖥️ CPU / 🎮 GPU) | Throughput (kernel ops/s) | Wall | vs Node |
|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.23B/s | 4.05s | 1.21× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.23B/s | 4.07s | 1.21× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 1.02B/s | 490.3ms | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 🖥️ CPU (cpu (wasm)) | 495.71M/s | 1.01s | 0.49× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.79M/s | 8.64s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.22M/s | 23.7ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 377.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 348.5K/s | 286.9ms | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 328.1K/s | 304.8ms | 0.00× |

**GPU execution status (archived run):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Node.js | WebGPU | 🖥️ CPU only | ⏳ toolchain required (no navigator.gpu in Node.js) |
| Deno | WebGPU (built-in) | 🎮 GPU (NVIDIA GeForce RTX 2060) | ✅ available — real GPU dispatch detected (Phase 38 ready) |
| **Galerina** | WebGPUComputePlan → WGSL | 🖥️ CPU (GPU pending) | ❌ **pending Phase 38** — stub only, no measured number (by design) |

> Per the project's honesty rule (same as the Runtime-in-Galerina 0% metric): no GPU number is shown until a backend actually executes. The **WASM/CPU** row above is legacy reference evidence, not a production SLIDE result.
> 🖥️ CPU = running on CPU cores. 🎮 GPU = real GPU dispatch via WebGPU/WGSL. Deno WebGPU is the only path currently capable of real GPU execution.

## 5. Key Observations

**Throughput gap (general):**
- Rust and Node.js JIT compile to native machine code — tree-walker cannot compete on hot arithmetic loops.
- Python CPython is 5-100× faster than Galerina on integer-intensive workloads.
- Galerina governed ≈ Galerina manifest — governance overhead is low; tree-walker dispatch dominates.

**collection-pipeline: the old "Galerina wins 43×" was a UNIT bug, now fixed:**
- That claim compared Galerina's *elements/sec* against the other languages' *whole-pipeline-passes/sec* —
  off by the per-pass element count (size = 10,000). Apples to oranges.
- Normalised to elements/sec for every runtime, the tree-walker no longer beats Node.js or Python here.
- Node/Python still pay real intermediate-array allocation for `.filter().map().reduce()`, but V8/CPython
  per-element throughput dwarfs the Stage-A interpreter once the units match.
- **Lesson:** normalise units before declaring a winner — a big `opsPerRun` multiplier flatters whoever it's applied to.

**fibonacci-recursive: different workloads:**
- Node.js/Rust/Python benchmark: fib(30) = 832040, ~2.7M recursive calls per invocation.
- Galerina benchmark: fib(20) = 6765, ~21K recursive calls per invocation (fib(30) would take ~19s/call).
- Calls/sec are not directly comparable — structural complexity differs by ~130×.
- Comparable result: Galerina handles ~1M+ AST node evaluations per second for recursive dispatch.

**Memory:**
- Galerina tree-walker allocates a new `{ __tag, value }` object per AST node — visible as heap growth.
- Negative heap delta = GC ran during execution and reclaimed more than was allocated.
- Node.js V8 JIT uses native tagged integers (no boxing) — heap stays flat on numeric workloads.

**passive mode: pre-compiled deployment throughput:**
- Galerina (passive) warm = LRU cache hits: steady-state deployment model (same input, same output).
- Galerina (passive) cold = execution without cache: different input each call, no cache benefit.
- Passive warm is typically 10-50× faster than governed — governance amortized, cache serves result.
- Passive cold shows pure execution cost: governance was pre-verified at compile time.

**hardware-targets: AVX2 vs generic for float dot product:**
- On i5-11400H (Tiger Lake H): generic x86 ≈ AVX2 for small arrays (both auto-vectorize to SSE4.2).
- Real AVX2 advantage appears on large tensors (L2/L3 cache boundary crossing, 16K+ float elements).
- WASM Phase 27: once WebAssembly.instantiate is wired, WASM SIMD 128 will show 10-100× over tree-walker.

**governance-cost: measuring the governance tax:**
- This benchmark isolates the overhead of the governance layer (ProofGraph + capability checking + audit).
- Key metric: galerinaGoverned/galerinaManifest ratio. Current baseline: ~2-3× slower (37% of manifest speed).
- Governance overhead sources: ProofGraph construction, GovernanceFlags bitmask, capability lookup, audit event.
- Target (Phase 30): <1.2× overhead via compile-time governance caching and proof reuse.

**Phase 25 projection (WASM):**
- Phase 25 WASM real arithmetic: pure flows now emit i32.add/sub/mul/div instead of (local.get $p0) stubs.
- Expected: 10-100× speedup for numeric pure flows when executed via WebAssembly.instantiate.
- collection-pipeline Galerina result already shows what the model delivers at the right abstraction level.

## 6. Distance from Winner — Every Runtime vs 🏆

> How much slower (or faster) is each runtime compared to the winner of that benchmark?
> **1.0×** = tied with winner. **2.0×** = half the speed. **100×** = one hundred times slower.

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **186× slower** | **62× slower** | **79× slower** | **81× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **409× slower** | **47.8K× slower** | **291× slower** | **295× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | 1.1× slower | **🏆 winner** | **28× slower** | **875× slower** | **3.5K× slower** | **1.7K× slower** | **1.7K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **20× slower** | **371× slower** | **151× slower** | **438× slower** | **469× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **134× slower** | **132× slower** | **521× slower** | **16.7K× slower** | **🏆 winner** | **4.3K× slower** | **5.7K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **96× slower** | **2.7K× slower** | **2.9K× slower** | **3.0K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **183× slower** | **984× slower** | **1.6K× slower** | **5.3K× slower** | **5.8K× slower** | **31× slower** | not run — no GPU path |
| **hardware-targets** | Galerina/WASM legacy lane | **33× slower** | **33× slower** | **43× slower** | not run | **452× slower** | **17.4K× slower** | **12.9K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | 9× slower | **1.7K× slower** | **34.7K× slower** | **46.1K× slower** | **43.9K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **213× slower** | **3.3K× slower** | **3.5K× slower** | **3.8K× slower** | 2× slower | **292× slower** |
| **matrix-multiply** | Python | **20× slower** | **19× slower** | **45× slower** | **🏆 winner** | **32.0K× slower** | **42.4K× slower** | **37.3K× slower** | **62× slower** | **17× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **30× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **24× slower** | **64× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.4× slower | **196× slower** | **4.4K× slower** | **4.6K× slower** | **4.5K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **396× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **67× slower** | **1.3K× slower** | **1.5K× slower** | **1.5K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Rust AVX2 | **🏆 winner** | 1.1× slower | 3× slower | **62× slower** | **2.9K× slower** | **3.1K× slower** | **2.9K× slower** | 3× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **74× slower** | **2.1K× slower** | **2.0K× slower** | **2.1K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 8× slower | **381× slower** | **761× slower** | **692× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **145× slower** | **3.0K× slower** | **3.2K× slower** | **3.3K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **226× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | Galerina/WASM legacy lane | **29× slower** | **28× slower** | 7× slower | **208× slower** | **1.5K× slower** | **1.7K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 3× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

> Bold = significantly behind (>10×). A non-numeric cell states why that runtime has no figure (e.g. "not run — no native impl", "errored", "no WASM build") — never a silent blank.
> Fibonacci passive is excluded from 'winner' comparison — LRU cache hit is not a fair race.
> gpu-compute GPU: NVIDIA GeForce RTX 2060 slower than CPU at 100K elements (setup overhead dominates — crossover ~500K elements).

## 7. Per-Benchmark Scoreboard — Winner → Slowest (full spread)

> Every runtime that ran, ranked fastest→slowest, with distance from the winner AND from the slowest.
> ⚠️ **`Galerina passive ⟨interp⟩` figures are LRU cache-HIT rates** (a memoised result for a repeated
> input), **not compute** — flagged `⚠️cache` below. Read the first non-cache row for the real compute winner.

### compute-mix
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 140.68M/s | 🏆 winner | 186× faster |
| 🥈 | Rust (generic) | 137.03M/s | 1.0× slower | 181× faster |
| 🥉 | Rust AVX2 | 134.50M/s | 1.0× slower | 178× faster |
| 4 | Galerina/WASM legacy lane | 80.51M/s | 1.7× slower | 107× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.25M/s | 62× slower | 3.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.79M/s | 79× slower | 2.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.74M/s | 81× slower | 2.3× faster |
| 8 | Python | 755.3K/s | 186× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.60B/s | 🏆 winner | 47.8K× faster |
| 🥈 | Rust AVX2 | 1.58B/s | 1.0× slower | 47.2K× faster |
| 🥉 | Node.js | 988.80M/s | 1.6× slower | 29.6K× faster |
| 4 | Galerina/WASM legacy lane | 510.54M/s | 3.1× slower | 15.3K× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.50M/s | 291× slower | 164× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.42M/s | 295× slower | 162× faster |
| 7 | Python | 3.91M/s | 409× slower | 117× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 33.4K/s | 47.8K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 79.48M/s | 🏆 winner | 3.5K× faster |
| 🥈 | Rust AVX2 | 74.95M/s | 1.1× slower | 3.3K× faster |
| 🥉 | Galerina/WASM legacy lane | 37.44M/s | 2.1× slower | 1.6K× faster |
| 4 | Node.js | 2.82M/s | 28× slower | 123× faster |
| 5 | Python | 90.8K/s | 875× slower | 4.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 46.9K/s | 1.7K× slower | 2.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 46.5K/s | 1.7K× slower | 2.0× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 22.9K/s | 3.5K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.20B/s | 🏆 winner | 469× faster |
| 🥈 | Rust AVX2 | 1.19B/s | 1.0× slower | 468× faster |
| 🥉 | Galerina/WASM legacy lane | 567.29M/s | 2.1× slower | 222× faster |
| 4 | Node.js | 61.31M/s | 20× slower | 24× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 7.91M/s | 151× slower | 3.1× faster |
| 6 | Python | 3.22M/s | 371× slower | 1.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.73M/s | 438× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.55M/s | 469× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina/WASM legacy lane at 17.9K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 68.8K/s | 🏆 winner | 16.7K× faster |
| 🥈 | Galerina/WASM legacy lane | 17.9K/s | 3.8× slower | 4.3K× faster |
| 🥉 | Rust (generic) | 520.0/s | 132× slower | 126× faster |
| 4 | Rust AVX2 | 514.1/s | 134× slower | 125× faster |
| 5 | Node.js | 132.1/s | 521× slower | 32× faster |
| 6 | Galerina manifest ⟨interp⟩ | 16.0/s | 4.3K× slower | 3.9× faster |
| 7 | Galerina governed ⟨interp⟩ | 12.0/s | 5.7K× slower | 2.9× faster |
| 8 | Python | 4.1/s | 16.7K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 251.40M/s | 🏆 winner | 3.0K× faster |
| 🥈 | Rust (generic) | 248.19M/s | 1.0× slower | 3.0K× faster |
| 🥉 | Node.js | 129.19M/s | 1.9× slower | 1.5K× faster |
| 4 | Galerina/WASM legacy lane | 118.01M/s | 2.1× slower | 1.4K× faster |
| 5 | Python | 2.63M/s | 96× slower | 31× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 92.4K/s | 2.7K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 86.1K/s | 2.9K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 83.9K/s | 3.0K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.52B/s | 🏆 winner | 5.8K× faster |
| 🥈 | Rust (generic) | 4.43B/s | 3.1× slower | 1.9K× faster |
| 🥉 | Galerina/WASM legacy lane | 439.42M/s | 31× slower | 188× faster |
| 4 | Node.js | 74.02M/s | 183× slower | 32× faster |
| 5 | Python | 13.75M/s | 984× slower | 5.9× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.63M/s | 1.6K× slower | 3.7× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.54M/s | 5.3K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.34M/s | 5.8K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 40.46M/s | 🏆 winner | 17.4K× faster |
| 🥈 | Rust (generic) | 1.24M/s | 33× slower | 533× faster |
| 🥉 | Rust AVX2 | 1.21M/s | 33× slower | 521× faster |
| 4 | Node.js | 949.8K/s | 43× slower | 408× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 89.5K/s | 452× slower | 38× faster |
| 6 | Galerina governed ⟨interp⟩ | 3.1K/s | 12.9K× slower | 1.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.3K/s | 17.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.34B/s | 🏆 winner | 46.1K× faster |
| 🥈 | Rust (generic) | 1.39B/s | 4.6× slower | 10.1K× faster |
| 🥉 | Node.js | 720.26M/s | 8.8× slower | 5.2K× faster |
| 4 | Galerina/WASM legacy lane | 489.98M/s | 13× slower | 3.6K× faster |
| 5 | Python | 3.63M/s | 1.7K× slower | 26× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 182.5K/s | 34.7K× slower | 1.3× faster |
| 7 | Galerina governed ⟨interp⟩ | 144.3K/s | 43.9K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 137.7K/s | 46.1K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.23B/s | 🏆 winner | 3.8K× faster |
| 🥈 | Rust (generic) | 1.23B/s | 1.0× slower | 3.7K× faster |
| 🥉 | Node.js | 1.02B/s | 1.2× slower | 3.1K× faster |
| 4 | Galerina/WASM legacy lane | 495.71M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 5.79M/s | 213× slower | 18× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.22M/s | 292× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 377.0K/s | 3.3K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 348.5K/s | 3.5K× slower | 1.1× faster |
| 9 | Galerina governed ⟨interp⟩ | 328.1K/s | 3.8K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 28.78B/s | 🏆 winner | 42.4K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.71B/s | 17× slower | 2.5K× faster |
| 🥉 | Rust (generic) | 1.54B/s | 19× slower | 2.3K× faster |
| 4 | Rust AVX2 | 1.46B/s | 20× slower | 2.2K× faster |
| 5 | Node.js | 637.52M/s | 45× slower | 940× faster |
| 6 | Galerina/WASM legacy lane | 461.79M/s | 62× slower | 681× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 900.5K/s | 32.0K× slower | 1.3× faster |
| 8 | Galerina governed ⟨interp⟩ | 771.0K/s | 37.3K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 678.4K/s | 42.4K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.9K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.8K/s | 🏆 winner | 30× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.9K/s | 3.1× slower | 9.6× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 197.0/s | 30× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.5K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 60.0K/s | 🏆 winner | 64× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.5K/s | 24× slower | 2.7× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 943.0/s | 64× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.43B/s | 🏆 winner | 4.6K× faster |
| 🥈 | Rust (generic) | 1.40B/s | 1.0× slower | 4.5K× faster |
| 🥉 | Node.js | 1.03B/s | 1.4× slower | 3.3K× faster |
| 4 | Galerina/WASM legacy lane | 490.75M/s | 2.9× slower | 1.6K× faster |
| 5 | Python | 7.30M/s | 196× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 327.0K/s | 4.4K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 315.5K/s | 4.5K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 311.5K/s | 4.6K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 3.75B/s | 🏆 winner | 396× faster |
| 🥈 | Rust AVX2 | 3.73B/s | 1.0× slower | 394× faster |
| 🥉 | Node.js | 2.04B/s | 1.8× slower | 215× faster |
| 4 | Python | 9.48M/s | 396× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 392.71M/s | 🏆 winner | 1.5K× faster |
| 🥈 | Python | 5.89M/s | 67× slower | 23× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 301.5K/s | 1.3K× slower | 1.2× faster |
| 4 | Galerina manifest ⟨interp⟩ | 259.3K/s | 1.5K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 257.2K/s | 1.5K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 154.51M/s | 🏆 winner | 3.1K× faster |
| 🥈 | Rust (generic) | 138.39M/s | 1.1× slower | 2.8K× faster |
| 🥉 | Galerina/WASM legacy lane | 56.90M/s | 2.7× slower | 1.1K× faster |
| 4 | Node.js | 47.41M/s | 3.3× slower | 944× faster |
| 5 | Python | 2.49M/s | 62× slower | 50× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 54.0K/s | 2.9K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 52.5K/s | 2.9K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 50.3K/s | 3.1K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 125.43M/s | 🏆 winner | 2.1K× faster |
| 🥈 | Galerina/WASM legacy lane | 30.53M/s | 4.1× slower | 504× faster |
| 🥉 | Python | 1.69M/s | 74× slower | 28× faster |
| 4 | Galerina manifest ⟨interp⟩ | 61.2K/s | 2.0K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 61.1K/s | 2.1K× slower | 1.0× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 60.6K/s | 2.1K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.68M/s | 🏆 winner | 761× faster |
| 🥈 | Python | 435.5K/s | 8.4× slower | 90× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 9.6K/s | 381× slower | 2.0× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.3K/s | 692× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.8K/s | 761× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 24.39M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust (generic) | 23.63M/s | 1.0× slower | 3.2K× faster |
| 🥉 | Galerina/WASM legacy lane | 9.20M/s | 2.7× slower | 1.2K× faster |
| 4 | Node.js | 6.47M/s | 3.8× slower | 867× faster |
| 5 | Python | 167.9K/s | 145× slower | 22× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.2K/s | 3.0K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 7.6K/s | 3.2K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 7.5K/s | 3.3K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 393.17M/s | 🏆 winner | 226× faster |
| 🥈 | Rust (generic) | 390.26M/s | 1.0× slower | 224× faster |
| 🥉 | Node.js | 245.33M/s | 1.6× slower | 141× faster |
| 4 | Python | 1.74M/s | 226× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 608.78M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 81.35M/s | 7.5× slower | 245× faster |
| 🥉 | Rust (generic) | 21.46M/s | 28× slower | 65× faster |
| 4 | Rust AVX2 | 20.68M/s | 29× slower | 62× faster |
| 5 | Python | 2.92M/s | 208× slower | 8.8× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 400.8K/s | 1.5K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 349.8K/s | 1.7K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 331.9K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 147.1K/s | 🏆 winner | 3.4× faster |
| 🥈 | Rust AVX2 | 145.4K/s | 1.0× slower | 3.3× faster |
| 🥉 | Python | 61.8K/s | 2.4× slower | 1.4× faster |
| 4 | Node.js | 43.9K/s | 3.4× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 132.5K/s | 🏆 winner | 1.2× faster |
| 🥈 | Python | 114.2K/s | 1.2× slower | — (slowest) |


---

## Benchmark Glossary — what each benchmark measures

| Benchmark | What it measures | Why it matters |
|---|---|---|
| **arithmetic-threshold** | Integer arithmetic loop: count operations above a threshold at 4B/s | Raw CPU / WASM JIT ceiling — the fastest possible pure number-crunching |
| **call-chain** | Flow-to-flow call chain (A→B→C→D): function-call overhead | Real programs call multiple governed flows; this isolates dispatch cost |
| **collection-pipeline** | Functional pipeline: filter → map → reduce over 10K integer records | Data transformation throughput — the bread-and-butter of governed APIs |
| **compute-mix** | Mixed workload: string ops, conditionals, arithmetic, object creation | Closest to real-world application code; no single hot path |
| **crypto-ops** | SHA-256 hashing, HMAC, Ed25519 sign+verify (via stdlib) | Performance of governed cryptographic operations (used in every secure flow) |
| **data-query** | `scanRecords(10K)`: one pass — filter (WHERE amount>threshold) + GROUP BY category — the same bulk-N scan on every runtime | Governed data-query throughput in record-scans/sec (aligned 2026-07-11); the `Tainted<String>` query path is a compile-time cost layered on top |
| **fibonacci-recursive** | Recursive fib(20): tail-call and LRU cache warm path | Tests recursion overhead + caching benefit across governed/passive/WASM tiers |
| **governance-cost** | Sum 1..100 (triangle number) with full governance verification overhead | Directly measures the cost of Galerina's contract{} checking vs raw arithmetic |
| **gpu-compute** | Parallel map-reduce kernel (100K elements) via Deno WebGPU | GPU dispatch throughput on RTX 2060 — the WASM/GPU crossover point |
| **hardware-targets** | Dispatch to 5 hardware targets: CPU/GPU/NPU/WASM/fallback | Route decision overhead when contract.targets{} selects execution path |
| **http-throughput** | Sequential HTTP requests/sec to a governed localhost endpoint | Server throughput — how fast Galerina can handle real HTTP requests |
| **json-parse** | Parse 500 JSON records: split on comma, split on colon, accumulate | Real I/O parsing workload — string-heavy, cache-friendly on repeat calls |
| **spore-container** | Create the canonical .spore trust-container (TMX-256 SHAKE Merkle + LE packing). **The "Node.js" column IS Galerina's `@galerina/ext-spore` engine** (pure TS/Node); Python/Rust are byte-identical reference writers — all assert the same golden root | Can other languages create a .spore, and how fast? Honest SHAKE256+packing race (the engine is pure Node, so it has no separate interpreter column) |
| **framework-pipeline** | One full governed request through the **Galerina App Kernel's fixed 12-gate pipeline** (route→policy→size→content-type→auth→decode→idempotency→concurrency→dispatch→encode→audit). **The "Node.js" column IS the App Kernel** (no middleware chain); Python is an equivalent sync gate chain | "Native framework, no middleware" vs a middleware chain — measures pipeline cost in-process (no sockets). The structural win is fewer deps + non-reorderable gates, not raw speed |
| **low-memory** | Process 10K items with strict heap budget (measures bytes/op) | Memory efficiency — critical for edge/embedded deployment targets |
| **matrix-multiply** | 32×32 integer GEMM (matrix multiplication) | Scientific / ML workload: dense arithmetic, benefits from SIMD/GPU |
| **nbody** | N-body gravitational force: pairwise O(N²) physics simulation | Compute-heavy scientific workload — measured in force-evals/sec; Node/Python (native loops) are far faster than the tree-walker |
| **record-allocation** | Create 10K records at 2.3B/s: struct construction throughput | Memory allocation cost under governance — critical for high-frequency APIs |
| **six-digit-guess** | Brute-force 6-digit PIN search with early exit | Branch-heavy search — tests conditional execution + JIT branch prediction |
| **text-html** | HTML template rendering: string interpolation + escaping | Web/rendering workload — string manipulation under governance |
| **tri-logic** | Balanced ternary (base-3) logic operations: trit arithmetic | Photonic/ternary compute path — future hardware target validation |
| **naming-check** | FUNGI-NAMING checker over 27 auth-service .fungi files | DevTools throughput: how fast the naming linter processes a codebase |
| **context-receipt** | Context Receipt generation: 51–97% token reduction per flow | AI context window generation speed — how fast receipts are produced |
| **intelligence-search** | BM25 hybrid code search: index 81 flows, 10 queries/run | Code search latency — how fast galerina search responds |
| **provenance-trace** | Data lineage graph: source→transform→sink for 27 files | Compliance evidence generation speed — how fast the audit trail is built |

