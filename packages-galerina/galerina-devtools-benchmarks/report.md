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
| compute-mix | 71.70M/s | ⚪ 1.8× slower | ⚪ 1.8× slower | 1.67M/s | WASM near native |
| arithmetic-threshold | 450.35M/s | UNCERTIFIED | UNCERTIFIED | 4.19M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 33.40M/s | UNCERTIFIED | UNCERTIFIED | 42.3K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 16.5K/s | UNCERTIFIED | UNCERTIFIED | 11.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 117.34M/s | 🟡 2.1× slower | 🟢 1.0× slower | 79.8K/s | WASM usable |
| hardware-targets | 35.52M/s | UNCERTIFIED | UNCERTIFIED | 3.3K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 418.29M/s | 🟡 3.6× slower | ⚪ 1.4× slower | 605.2K/s | WASM usable |
| tri-logic | 450.19M/s | 🟡 3.0× slower | 🟡 2.0× slower | 285.1K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 206.4K/s | WASM not built for this lane yet |
| call-chain | 51.61M/s | 🟡 3.0× slower | 🟢 1.3× | 45.6K/s | WASM usable |
| nbody | 28.15M/s | — | 🟡 4.3× slower | 53.1K/s | WASM 2–10× under Node |
| mandelbrot | 8.67M/s | 🟡 2.7× slower | 🟢 1.4× | 6.6K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 27.99B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **Galerina/WASM legacy lane** (~0) | ~0 | ~0 | ~0 | 6 B/op | 8 B/op |
| collection-pipeline | **Galerina/WASM legacy lane** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 56 B/op | 195 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 9 B/op | 5 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | Galerina/WASM legacy lane | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.17B/s | 446.64M/s | 3.85M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 27.99B/s | 418.29M/s | 1.51B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the Galerina/WASM legacy lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | Galerina/WASM legacy lane | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (124.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 124.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (699.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 699.0/s |
| json-parse | records/s | **Node.js** (2.99M/s) | 2.99M/s | 438.0K/s | not run — no native impl | no WASM — strings/records | 4.8K/s |
| spore-container | containers/s | **Rust (generic)** (150.0K/s) | 39.8K/s | 59.4K/s | 150.0K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (117.9K/s) | 117.9K/s | 94.3K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.5K/s) | 3.5K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (5.9K/s) | 5.9K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (15.0K/s) | 15.0K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (106.4K/s) | 106.4K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (717.0/s) | 717.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina/WASM legacy lane | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 660.0/s | 571.0/s | 2.22M/s | 1.16× governed/manifest (gov overhead ≈ 0.87×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | Galerina/WASM legacy lane | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **124.82M/s** | **126.80M/s** | not run — no C++ impl | **131.25M/s** | 724.9K/s | 2.19M/s | 1.74M/s | 1.67M/s | 71.70M/s | not run — no GPU path | 78.6× |
| arithmetic-threshold | not run — no AVX-512 | **1.56B/s** | **1.56B/s** | not run — no C++ impl | 958.99M/s | 3.69M/s | 28.5K/s | 4.90M/s | 4.19M/s | 450.35M/s | not run — no GPU path | 229.1× |
| six-digit-guess | not run — no AVX-512 | **75.11M/s** | **77.12M/s** | not run — no C++ impl | 2.47M/s | 84.3K/s | 21.9K/s | 44.0K/s | 42.3K/s | 33.40M/s | not run — no GPU path | 58.4× |
| record-allocation | not run — no AVX-512 | **1.16B/s** | **1.17B/s** | not run — no C++ impl | 55.87M/s | 3.78M/s | 6.42M/s | 1.89M/s | 1.89M/s | 484.09M/s | not run — no GPU path | 29.6× |
| fibonacci-recursive | not run — no AVX-512 | 450.8/s | 496.5/s | not run — no C++ impl | 102.5/s | 4.2/s | **73.9K/s** | 16.0/s | 11.0/s | 16.5K/s | not run — no GPU path | 9.32× |
| tower-of-hanoi | not run — no AVX-512 | 230.82M/s | **249.54M/s** | not run — no C++ impl | 118.27M/s | 2.79M/s | 80.0K/s | 77.3K/s | 79.8K/s | 117.34M/s | not run — no GPU path | 1.5K× |
| collection-pipeline | not run — no AVX-512 | **12.37B/s** | 4.16B/s | not run — no C++ impl | 68.70M/s | 10.01M/s | 8.06M/s | 1.82M/s | 2.16M/s | 384.15M/s | not run — no GPU path | 31.9× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.16M/s | 1.16M/s | not run — no C++ impl | 824.1K/s | not run | 87.2K/s | 3.8K/s | 3.3K/s | **35.52M/s** | not run — no GPU path | 247.3× |
| low-memory | not run — no AVX-512 | **5.69B/s** | 1.32B/s | not run — no C++ impl | 702.95M/s | 2.64M/s | 147.8K/s | 84.6K/s | 110.0K/s | 453.30M/s | not run — no GPU path | 6.4K× |
| gpu-compute | not run — no AVX-512 | **1.17B/s** | **1.17B/s** | not run — no C++ impl | 954.12M/s | 5.34M/s | 335.0K/s | 296.9K/s | 302.4K/s | 446.64M/s | 3.85M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.22B/s | 1.51B/s | not run — no C++ impl | 587.37M/s | **27.99B/s** | 794.3K/s | 584.8K/s | 605.2K/s | 418.29M/s | 1.51B/s | 970.5× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **3.5K/s** | 1.9K/s | 124.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **54.6K/s** | 2.4K/s | 699.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | 1.27B/s | **1.36B/s** | not run — no C++ impl | 913.98M/s | 6.41M/s | 303.0K/s | 287.3K/s | 285.1K/s | 450.19M/s | not run — no GPU path | 3.2K× |
| verified-native-operation | not run — no AVX-512 | **3.65B/s** | 2.35B/s | not run — no C++ impl | 1.99B/s | 8.84M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **384.44M/s** | 3.07M/s | 265.8K/s | 215.9K/s | 206.4K/s | no WASM build | not run — no GPU path | 1.9K× |
| call-chain | not run — no AVX-512 | **154.46M/s** | **154.46M/s** | not run — no C++ impl | 40.61M/s | 1.27M/s | 48.5K/s | 45.5K/s | 45.6K/s | 51.61M/s | not run — no GPU path | 891.0× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **121.48M/s** | 952.2K/s | 55.7K/s | 54.3K/s | 53.1K/s | 28.15M/s | not run — no GPU path | 2.3K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **2.99M/s** | 438.0K/s | 8.5K/s | 4.4K/s | 4.8K/s | no WASM — strings/records | not run — no GPU path | 617.5× |
| mandelbrot | not run — no AVX-512 | **23.01M/s** | **23.41M/s** | not run — no C++ impl | 6.23M/s | 130.9K/s | 6.7K/s | 6.7K/s | 6.6K/s | 8.67M/s | not run — no GPU path | 943.3× |
| spectral-norm | not run — no AVX-512 | **370.02M/s** | **370.82M/s** | not run — no C++ impl | 221.83M/s | 1.51M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 13.54M/s | 14.16M/s | not run — no C++ impl | 62.08M/s | 2.72M/s | 364.1K/s | 310.2K/s | 296.8K/s | **543.35M/s** | not run — no GPU path | 209.1× |
| spore-container | not run — no AVX-512 | **146.5K/s** | **150.0K/s** | not run — no C++ impl | 39.8K/s | 59.4K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **117.9K/s** | 94.3K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 5.69B/s | — | — |
| 🥈 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.32B/s | — | — |
| 🥉 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 702.95M/s | — | 20KB |
| 4 | ⚪ | Galerina/WASM legacy lane | 0.00 bytes/op ⚡ ~0 — no boxing | 453.30M/s | — | 6KB |
| 5 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.64M/s | — | 272B |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 56 bytes/op ⚠ moderate | 110.0K/s | — | 563KB |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 67 bytes/op ⚠ moderate | 147.8K/s | — | 666KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 195 bytes/op ✗ high — object per node | 84.6K/s | — | 1.9MB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 66.9MB | 67.2MB | 5.0MB | 925KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 105.0MB | 105.0MB | 22.0MB | 301KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 104.8MB | 104.8MB | 25.4MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 104.6MB | 104.6MB | 25.1MB | 4.4MB |
| compute-mix | Galerina/WASM legacy lane | 94.1MB | 94.1MB | 18.3MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 66.3MB | 66.5MB | 4.4MB | 286KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 105.5MB | 105.5MB | 23.1MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 105.3MB | 105.3MB | 22.0MB | 867KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 105.2MB | 105.2MB | 22.1MB | 946KB |
| arithmetic-threshold | Galerina/WASM legacy lane | 107.5MB | 107.5MB | 21.4MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 71.0MB | 71.0MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 106.2MB | 106.2MB | 23.7MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 106.0MB | 106.0MB | 22.9MB | 1.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 105.9MB | 105.9MB | 23.0MB | 1.6MB |
| six-digit-guess | Galerina/WASM legacy lane | 108.2MB | 108.2MB | 21.8MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 67.1MB | 67.1MB | 4.3MB | 194KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 106.9MB | 106.9MB | 22.6MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 106.6MB | 106.6MB | 22.0MB | 76KB |
| record-allocation | Galerina governed ⟨interp⟩ | 107.0MB | 107.0MB | 22.0MB | 60KB |
| record-allocation | Galerina/WASM legacy lane | 108.4MB | 108.4MB | 22.3MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 65.1MB | 65.1MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 106.3MB | 106.3MB | 23.4MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 106.3MB | 106.3MB | 23.0MB | 812KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 106.4MB | 106.4MB | 22.8MB | 677KB |
| fibonacci-recursive | Galerina/WASM legacy lane | 108.6MB | 108.6MB | 22.3MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 65.3MB | 65.3MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 106.7MB | 106.7MB | 27.4MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 106.5MB | 106.5MB | 25.2MB | 4.0MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 106.7MB | 106.7MB | 22.1MB | 881KB |
| tower-of-hanoi | Galerina/WASM legacy lane | 108.6MB | 108.6MB | 21.6MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 82.1MB | 82.1MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 107.0MB | 107.0MB | 22.2MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 107.0MB | 107.0MB | 21.5MB | 145KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 108.0MB | 108.0MB | 21.5MB | 168KB |
| collection-pipeline | Galerina/WASM legacy lane | 109.6MB | 109.6MB | 21.4MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 65.3MB | 65.3MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 107.9MB | 107.9MB | 22.4MB | 514KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 110.8MB | 110.8MB | 22.0MB | 486KB |
| governance-cost | Galerina governed ⟨interp⟩ | 108.6MB | 108.6MB | 22.0MB | 518KB |
| governance-cost | Galerina/WASM legacy lane | 109.5MB | 109.5MB | 21.8MB | 53KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 66.9MB | 66.9MB | 4.5MB | 364KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 108.8MB | 108.8MB | 22.6MB | 267KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 107.6MB | 107.6MB | 21.7MB | 91KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 107.2MB | 107.2MB | 21.7MB | 83KB |
| hardware-targets | Galerina/WASM legacy lane | 109.9MB | 109.9MB | 22.0MB | 80KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 65.4MB | 65.4MB | 4.1MB | 20KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 109.1MB | 109.1MB | 23.7MB | 666KB |
| low-memory | Galerina manifest ⟨interp⟩ | 107.7MB | 107.7MB | 23.6MB | 1.9MB |
| low-memory | Galerina governed ⟨interp⟩ | 108.0MB | 108.0MB | 22.2MB | 563KB |
| low-memory | Galerina/WASM legacy lane | 110.6MB | 110.6MB | 21.9MB | 6KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 65.6MB | 65.6MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 109.6MB | 109.6MB | 22.3MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 109.6MB | 109.6MB | 23.0MB | 1.2MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 107.5MB | 107.5MB | 22.0MB | 164KB |
| gpu-compute | Galerina/WASM legacy lane | 111.8MB | 111.8MB | 22.0MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 67.1MB | 67.1MB | 4.6MB | 439KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 109.4MB | 109.4MB | 22.4MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 109.4MB | 109.4MB | 22.3MB | 540KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 109.4MB | 109.4MB | 22.3MB | 441KB |
| matrix-multiply | Galerina/WASM legacy lane | 111.9MB | 111.9MB | 22.4MB | 2KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 79.6MB | 79.6MB | 8.0MB | 2.5MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 109.8MB | 109.8MB | 22.6MB | 26KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 109.5MB | 109.5MB | 22.1MB | 190KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 109.5MB | 109.5MB | 22.1MB | 342KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 108.0MB | 108.0MB | 23.0MB | -296KB |
| text-html | Galerina manifest ⟨interp⟩ | 108.6MB | 108.6MB | 22.4MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 108.4MB | 108.4MB | 22.5MB | 176KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 219KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 109.9MB | 109.9MB | 23.1MB | 268KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 109.9MB | 109.9MB | 22.7MB | 402KB |
| tri-logic | Galerina governed ⟨interp⟩ | 109.6MB | 109.6MB | 22.7MB | 495KB |
| tri-logic | Galerina/WASM legacy lane | 112.2MB | 112.2MB | 22.6MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 27KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 109.3MB | 109.3MB | 26.9MB | 1.2MB |
| data-query | Galerina manifest ⟨interp⟩ | 109.1MB | 109.1MB | 24.2MB | 1.3MB |
| data-query | Galerina governed ⟨interp⟩ | 110.5MB | 110.5MB | 25.3MB | 2.3MB |
| call-chain | Rust AVX2 | — | — | — | — |
| call-chain | Rust (generic) | — | — | — | — |
| call-chain | Node.js | 65.6MB | 65.6MB | 4.1MB | 8KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 110.4MB | 110.4MB | 25.0MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 110.4MB | 110.4MB | 26.4MB | 3.2MB |
| call-chain | Galerina governed ⟨interp⟩ | 110.2MB | 110.2MB | 26.5MB | 3.4MB |
| call-chain | Galerina/WASM legacy lane | 112.1MB | 112.1MB | 23.2MB | 1KB |
| nbody | Node.js | 67.4MB | 67.4MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 113.0MB | 113.0MB | 24.7MB | 236KB |
| nbody | Galerina manifest ⟨interp⟩ | 113.0MB | 113.0MB | 24.2MB | 982KB |
| nbody | Galerina governed ⟨interp⟩ | 110.4MB | 110.4MB | 24.3MB | 1.1MB |
| nbody | Galerina/WASM legacy lane | 113.0MB | 113.0MB | 23.5MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 113.6MB | 113.6MB | 25.5MB | 435KB |
| json-parse | Galerina manifest ⟨interp⟩ | 111.4MB | 111.4MB | 28.3MB | 4.6MB |
| json-parse | Galerina governed ⟨interp⟩ | 119.4MB | 119.4MB | 25.9MB | 2.6MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 67.6MB | 67.6MB | 4.4MB | 279KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 114.4MB | 114.4MB | 24.3MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 114.4MB | 114.4MB | 27.9MB | 4.3MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 114.4MB | 114.4MB | 26.1MB | 2.2MB |
| mandelbrot | Galerina/WASM legacy lane | 118.2MB | 118.2MB | 24.2MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 67.1MB | 67.1MB | 4.4MB | 294KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 67.3MB | 67.3MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 114.2MB | 114.2MB | 27.3MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 114.2MB | 114.2MB | 24.3MB | 619KB |
| binary-trees | Galerina governed ⟨interp⟩ | 112.1MB | 112.1MB | 24.9MB | 1.2MB |
| binary-trees | Galerina/WASM legacy lane | 116.5MB | 116.5MB | 24.0MB | 1KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 83.0MB | 83.0MB | 9.2MB | 2.0MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 93.6MB | 93.6MB | 21.9MB | 11.2MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 131.3K ops/CPU-ms |
| compute-mix | Python | 5.04s | 5.05s | 100% | 723.22 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.8ms | 47.0ms | 163% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 30.0ms | 15.0ms | 50% | 3.3K ops/CPU-ms |
| compute-mix | Galerina/WASM legacy lane | 1.39s | 1.39s | 100% | 71.9K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.9ms | 15.0ms | 72% | 1.33M ops/CPU-ms |
| arithmetic-threshold | Python | 5.42s | 5.41s | 100% | 3.7K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.9ms | 32.0ms | 248% | 2.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 15.1ms | 15.0ms | 99% | 4.2K ops/CPU-ms |
| arithmetic-threshold | Galerina/WASM legacy lane | 1.12s | 1.13s | 100% | 449.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 17.0ms | 16.0ms | 94% | 2.6K ops/CPU-ms |
| six-digit-guess | Python | 499.1ms | 500.0ms | 100% | 84.14 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 15.0ms | 10949% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 956.4ms | 984.0ms | 103% | 42.75 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 994.5ms | 999.0ms | 100% | 42.11 ops/CPU-ms |
| six-digit-guess | Galerina/WASM legacy lane | 1.26s | 1.27s | 101% | 33.2K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.6ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.6ms | 0.0ms | 0% | — |
| record-allocation | Python | 52.9ms | 46.9ms | 89% | 4.3K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 5.3ms | 47.0ms | 890% | 212.77 ops/CPU-ms |
| record-allocation | Galerina governed ⟨interp⟩ | 5.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina/WASM legacy lane | 1.01s | 1.00s | 99% | 490.0K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 443.7ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 402.8ms | — | — | — |
| fibonacci-recursive | Node.js | 975.6ms | 969.0ms | 99% | 0.10 ops/CPU-ms |
| fibonacci-recursive | Python | 4.80s | 4.80s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 61.8ms | 140.0ms | 227% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 91.0ms | 156.0ms | 171% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina/WASM legacy lane | 1.03s | 1.03s | 100% | 16.47 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 567.8ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 525.2ms | — | — | — |
| tower-of-hanoi | Node.js | 110.8ms | 109.0ms | 98% | 120.2K ops/CPU-ms |
| tower-of-hanoi | Python | 469.7ms | 468.8ms | 100% | 2.8K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 847.6ms | 860.0ms | 101% | 76.20 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 821.7ms | 829.0ms | 101% | 79.05 ops/CPU-ms |
| tower-of-hanoi | Galerina/WASM legacy lane | 1.12s | 1.11s | 99% | 118.2K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 80.8ms | — | — | — |
| collection-pipeline | Rust (generic) | 240.3ms | — | — | — |
| collection-pipeline | Node.js | 727.8ms | 734.0ms | 101% | 68.1K ops/CPU-ms |
| collection-pipeline | Python | 4.99s | 5.00s | 100% | 10.0K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 5.5ms | 31.0ms | 564% | 322.58 ops/CPU-ms |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.6ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina/WASM legacy lane | 1.02s | 1.01s | 100% | 384.2K ops/CPU-ms |
| governance-cost | Rust AVX2 | 12.5ms | — | — | — |
| governance-cost | Rust (generic) | 11.4ms | — | — | — |
| governance-cost | Node.js | 51.9ms | 47.0ms | 91% | — |
| governance-cost | Python | 4.73s | 4.72s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 2.7ms | 32.0ms | 1204% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.8ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| governance-cost | Galerina/WASM legacy lane | 1.00s | 985.0ms | 98% | — |
| hardware-targets | Rust AVX2 | 860.3ms | — | — | — |
| hardware-targets | Rust (generic) | 862.0ms | — | — | — |
| hardware-targets | Node.js | 1.21s | 1.22s | 100% | 820.34 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.5ms | 15.0ms | 131% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina/WASM legacy lane | 1.00s | 1.00s | 100% | 35.5K ops/CPU-ms |
| low-memory | Rust AVX2 | 175.7ms | — | — | — |
| low-memory | Rust (generic) | 757.1ms | — | — | — |
| low-memory | Node.js | 71.1ms | 62.0ms | 87% | 806.5K ops/CPU-ms |
| low-memory | Python | 3.79s | 3.80s | 100% | 2.6K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 118.2ms | 172.0ms | 146% | 58.14 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 90.9ms | 109.0ms | 120% | 91.74 ops/CPU-ms |
| low-memory | Galerina/WASM legacy lane | 1.01s | 1.02s | 100% | 452.8K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.26s | — | — | — |
| gpu-compute | Rust (generic) | 4.26s | — | — | — |
| gpu-compute | Node.js | 524.0ms | 516.0ms | 98% | 969.0K ops/CPU-ms |
| gpu-compute | Python | 9.37s | 9.36s | 100% | 5.3K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 336.8ms | 344.0ms | 102% | 290.70 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 330.7ms | 375.0ms | 113% | 266.67 ops/CPU-ms |
| gpu-compute | Galerina/WASM legacy lane | 1.12s | 1.13s | 100% | 444.4K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.9ms | — | — | — |
| matrix-multiply | Rust AVX2 | 107.0ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.8ms | — | — | — |
| matrix-multiply | Node.js | 223.2ms | 219.0ms | 98% | 598.5K ops/CPU-ms |
| matrix-multiply | Python | 0.5ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 56.0ms | 47.0ms | 84% | 697.19 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 54.1ms | 94.0ms | 174% | 348.60 ops/CPU-ms |
| matrix-multiply | Galerina/WASM legacy lane | 1.02s | 1.02s | 100% | 419.3K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 13.9ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 28.7ms | 31.0ms | 108% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 8.1ms | 16.0ms | 199% | 0.06 ops/CPU-ms |
| text-html | Galerina passive ⟨interp⟩ | 1.8ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.4ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 473.0ms | — | — | — |
| tri-logic | Rust (generic) | 442.4ms | — | — | — |
| tri-logic | Node.js | 328.2ms | — | — | — |
| tri-logic | Python | 1.87s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.04s | 1.14s | 109% | 263.16 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.05s | 1.08s | 103% | 278.03 ops/CPU-ms |
| tri-logic | Galerina/WASM legacy lane | 1.33s | 1.33s | 100% | 451.5K ops/CPU-ms |
| data-query | Node.js | 130.1ms | — | — | — |
| data-query | Python | 978.2ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 46.3ms | 47.0ms | 101% | 212.77 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 48.4ms | 63.0ms | 130% | 158.73 ops/CPU-ms |
| call-chain | Rust AVX2 | 0.3ms | — | — | — |
| call-chain | Rust (generic) | 0.3ms | — | — | — |
| call-chain | Node.js | 1.2ms | 0.0ms | 0% | — |
| call-chain | Python | 39.3ms | 46.9ms | 119% | 1.1K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.10s | 1.14s | 104% | 43.82 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.10s | 1.11s | 101% | 45.09 ops/CPU-ms |
| call-chain | Galerina/WASM legacy lane | 1.94s | 1.94s | 100% | 51.6K ops/CPU-ms |
| nbody | Node.js | 53.9ms | 63.0ms | 117% | 104.0K ops/CPU-ms |
| nbody | Python | 1.72s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 603.2ms | 609.0ms | 101% | 53.81 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 617.4ms | 687.0ms | 111% | 47.70 ops/CPU-ms |
| nbody | Galerina/WASM legacy lane | 1.16s | 1.17s | 101% | 28.0K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.5ms | 15.0ms | 2762% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 112.8ms | 156.0ms | 138% | 3.20 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 103.1ms | 187.0ms | 181% | 2.67 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 142.4ms | — | — | — |
| mandelbrot | Rust (generic) | 139.9ms | — | — | — |
| mandelbrot | Node.js | 526.2ms | 547.0ms | 104% | 6.0K ops/CPU-ms |
| mandelbrot | Python | 25.03s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.46s | 2.56s | 104% | 6.39 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.48s | 2.53s | 102% | 6.47 ops/CPU-ms |
| mandelbrot | Galerina/WASM legacy lane | 1.89s | 1.89s | 100% | 8.7K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 27.0ms | — | — | — |
| spectral-norm | Rust (generic) | 27.0ms | — | — | — |
| spectral-norm | Node.js | 45.1ms | 31.0ms | 69% | 322.6K ops/CPU-ms |
| spectral-norm | Python | 6.62s | — | — | — |
| binary-trees | Rust AVX2 | 10.0ms | — | — | — |
| binary-trees | Rust (generic) | 9.6ms | — | — | — |
| binary-trees | Node.js | 2.2ms | 0.0ms | 0% | — |
| binary-trees | Python | 49.9ms | 46.9ms | 94% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 438.0ms | 453.0ms | 103% | 299.90 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 457.7ms | 453.0ms | 99% | 299.90 ops/CPU-ms |
| binary-trees | Galerina/WASM legacy lane | 1.00s | 984.0ms | 98% | 552.3K ops/CPU-ms |
| spore-container | Rust AVX2 | 2.05s | — | — | — |
| spore-container | Rust (generic) | 2.00s | — | — | — |
| spore-container | Node.js | 7.53s | 9.03s | 120% | 33.22 ops/CPU-ms |
| spore-container | Python | 1.68s | — | — | — |
| framework-pipeline | Node.js | 1.70s | 2.52s | 148% | 79.49 ops/CPU-ms |
| framework-pipeline | Python | 2.12s | — | — | — |
| http-throughput | Node.js | 87.0ms | — | — | — |
| naming-check | Node.js | 523.0ms | — | — | — |
| context-receipt | Node.js | 386.0ms | — | — | — |
| intelligence-search | Node.js | 47.0ms | — | — | — |
| provenance-trace | Node.js | 2.16s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 131.25M/s | 5.00s | 5.00s | 66.9MB | ~0 | 181.1× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 126.80M/s | 5.00s | — | — | ~0 (native) | 174.9× | 0.97× |
| 🥉 | 🟢 | Rust AVX2 | 124.82M/s | 5.00s | — | — | ~0 (native) | 172.2× | 0.95× |
| 4 | ⚪ | Galerina/WASM legacy lane | 71.70M/s | 1.39s | 1.39s | 94.1MB | ~0 | 98.9× | 0.55× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.19M/s | 0.5ms | 0.0ms | 105.0MB | 303 B/op | 3.02× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.74M/s | 28.8ms | 47.0ms | 104.8MB | 89 B/op | 2.39× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.67M/s | 30.0ms | 15.0ms | 104.6MB | 88 B/op | 2.30× | 0.01× |
| 8 | ⚫ | Python | 724.9K/s | 5.04s | 5.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (303 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 423.8× | 1.63× |
| 🥈 | 🟢 | Rust AVX2 | 1.56B/s | 12.8ms | — | — | ~0 (native) | 421.9× | 1.62× |
| 🥉 | 🟢 | Node.js | 958.99M/s | 20.9ms | 15.0ms | 66.3MB | ~0 | 259.8× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 450.35M/s | 1.12s | 1.13s | 107.5MB | ~0 | 122.0× | 0.47× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.90M/s | 12.9ms | 32.0ms | 105.3MB | 14 B/op | 1.33× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 4.19M/s | 15.1ms | 15.0ms | 105.2MB | 15 B/op | 1.13× | 0.00× |
| 7 | ⚫ | Python | 3.69M/s | 5.42s | 5.41s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 28.5K/s | 0.1ms | 0.0ms | 105.5MB | 18.6 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (18.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.12M/s | 0.5ms | — | — | ~0 (native) | 914.9× | 31.2× |
| 🥈 | 🟢 | Rust AVX2 | 75.11M/s | 0.6ms | — | — | ~0 (native) | 891.1× | 30.4× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 33.40M/s | 1.26s | 1.27s | 108.2MB | ~0 | 396.2× | 13.5× |
| 4 | 🟢 | Node.js | 2.47M/s | 17.0ms | 16.0ms | 71.0MB | 26 B/op | 29.3× | 1.00× |
| 5 | 🔴 | Python | 84.3K/s | 499.1ms | 500.0ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 44.0K/s | 956.4ms | 984.0ms | 106.0MB | 26 B/op | 0.52× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 42.3K/s | 994.5ms | 999.0ms | 105.9MB | 37 B/op | 0.50× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 21.9K/s | 0.1ms | 15.0ms | 106.2MB | 32.5 KB/op | 0.26× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (32.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 310.3× | 21.0× |
| 🥈 | 🟢 | Rust AVX2 | 1.16B/s | 8.6ms | — | — | ~0 (native) | 306.6× | 20.8× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 484.09M/s | 1.01s | 1.00s | 108.4MB | ~0 | 128.0× | 8.66× |
| 4 | 🟢 | Node.js | 55.87M/s | 3.6ms | 0.0ms | 67.1MB | ~0 | 14.8× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 6.42M/s | 0.5ms | 0.0ms | 106.9MB | 80 B/op | 1.70× | 0.11× |
| 6 | 🔴 | Python | 3.78M/s | 52.9ms | 46.9ms | — | ~0 | 1.00× | 0.07× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 1.89M/s | 5.3ms | 47.0ms | 106.6MB | 8 B/op | 0.50× | 0.03× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 1.89M/s | 5.3ms | 0.0ms | 107.0MB | 6 B/op | 0.50× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (80 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 73.9K/s | 0.1ms | 0.0ms | 106.3MB | 11.8 KB/op | 17.7K× | 720.5× |
| 🥈 | 🟢 | Galerina/WASM legacy lane | 16.5K/s | 1.03s | 1.03s | 108.6MB | ~0 | 4.0K× | 161.3× |
| 🥉 | 🟢 | Rust (generic) | 496.5/s | 402.8ms | — | — | ~0 (native) | 119.1× | 4.84× |
| 4 | 🟢 | Rust AVX2 | 450.8/s | 443.7ms | — | — | ~0 (native) | 108.1× | 4.40× |
| 5 | 🟢 | Node.js | 102.5/s | 975.6ms | 969.0ms | 65.1MB | 53 B/op | 24.6× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 16.0/s | 61.8ms | 140.0ms | 106.3MB | 802.7 KB/op | 3.84× | 0.16× |
| 7 | 🟡 | Galerina governed ⟨interp⟩ | 11.0/s | 91.0ms | 156.0ms | 106.4MB | 660.6 KB/op | 2.64× | 0.11× |
| 8 | 🔴 | Python | 4.2/s | 4.80s | 4.80s | — | 23 B/op | 1.00× | 0.04× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina manifest ⟨interp⟩ (802.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 249.54M/s | 525.2ms | — | — | ~0 (native) | 89.4× | 2.11× |
| 🥈 | 🟢 | Rust AVX2 | 230.82M/s | 567.8ms | — | — | ~0 (native) | 82.7× | 1.95× |
| 🥉 | 🟢 | Node.js | 118.27M/s | 110.8ms | 109.0ms | 65.3MB | ~0 | 42.4× | 1.00× |
| 4 | 🟢 | Galerina/WASM legacy lane | 117.34M/s | 1.12s | 1.11s | 108.6MB | ~0 | 42.1× | 0.99× |
| 5 | 🔴 | Python | 2.79M/s | 469.7ms | 468.8ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 80.0K/s | 0.1ms | 0.0ms | 106.7MB | 9.8 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 79.8K/s | 821.7ms | 829.0ms | 106.7MB | 13 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 77.3K/s | 847.6ms | 860.0ms | 106.5MB | 61 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (9.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 12.37B/s | 80.8ms | — | — | ~0 (native) | 1.2K× | 180.1× |
| 🥈 | 🟢 | Rust (generic) | 4.16B/s | 240.3ms | — | — | ~0 (native) | 415.6× | 60.6× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 384.15M/s | 1.02s | 1.01s | 109.6MB | ~0 | 38.4× | 5.59× |
| 4 | 🟢 | Node.js | 68.70M/s | 727.8ms | 734.0ms | 82.1MB | ~0 | 6.86× | 1.00× |
| 5 | 🟡 | Python | 10.01M/s | 4.99s | 5.00s | — | ~0 | 1.00× | 0.15× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.06M/s | 0.3ms | 0.0ms | 107.0MB | 143 B/op | 0.80× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.16M/s | 4.6ms | 0.0ms | 108.0MB | 17 B/op | 0.22× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 1.82M/s | 5.5ms | 31.0ms | 107.0MB | 14 B/op | 0.18× | 0.03× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (143 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 799.62M/s | 12.5ms |
| Rust (generic) | 877.62M/s | 11.4ms |
| Node.js | 1.93M/s | 51.9ms |
| Python | 21.1K/s | 4.73s |
| Galerina passive ⟨interp⟩ | 1.2K/s | 2.7ms |
| Galerina manifest ⟨interp⟩ | 571.0/s | 1.8ms |
| Galerina governed ⟨interp⟩ | 660.0/s | 1.5ms |
| Galerina/WASM legacy lane | 2.22M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 35.52M/s | 1.00s | 1.00s | 109.9MB | ~0 | — | 43.1× |
| 🥈 | 🟢 | Rust AVX2 | 1.16M/s | 860.3ms | — | — | ~0 (native) | — | 1.41× |
| 🥉 | 🟢 | Rust (generic) | 1.16M/s | 862.0ms | — | — | ~0 (native) | — | 1.41× |
| 4 | 🟢 | Node.js | 824.1K/s | 1.21s | 1.22s | 66.9MB | ~0 | — | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 87.2K/s | 11.5ms | 15.0ms | 108.8MB | 267 B/op | — | 0.11× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 3.8K/s | 0.3ms | 0.0ms | 107.6MB | 89.3 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 3.3K/s | 0.3ms | 0.0ms | 107.2MB | 81.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina manifest ⟨interp⟩ (89.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 5.69B/s | 175.7ms | — | — | ~0 | 2.2K× | 8.10× |
| 🥈 | 🟢 | Rust (generic) | 1.32B/s | 757.1ms | — | — | ~0 | 501.2× | 1.88× |
| 🥉 | 🟢 | Node.js | 702.95M/s | 71.1ms | 62.0ms | 65.4MB | ~0 | 266.7× | 1.00× |
| 4 | ⚪ | Galerina/WASM legacy lane | 453.30M/s | 1.01s | 1.02s | 110.6MB | ~0 | 172.0× | 0.64× |
| 5 | ⚫ | Python | 2.64M/s | 3.79s | 3.80s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 147.8K/s | 0.9ms | 0.0ms | 109.1MB | 4.7 KB/op | 0.06× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 110.0K/s | 90.9ms | 109.0ms | 108.0MB | 56 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 84.6K/s | 118.2ms | 172.0ms | 107.7MB | 195 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** Rust AVX2 (~0) · **highest:** Galerina passive ⟨interp⟩ (4.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.17B/s | 4.26s | — | — | ~0 (native) | 219.8× | 1.23× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 4.26s | — | — | ~0 (native) | 219.8× | 1.23× |
| 🥉 | 🟢 | Node.js | 954.12M/s | 524.0ms | 516.0ms | 65.6MB | ~0 | 178.7× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 446.64M/s | 1.12s | 1.13s | 111.8MB | ~0 | 83.7× | 0.47× |
| 5 | ⚫ | Python | 5.34M/s | 9.37s | 9.36s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.85M/s | 25.9ms | — | — | — | 0.72× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 335.0K/s | 0.2ms | 0.0ms | 109.6MB | 3.1 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 302.4K/s | 330.7ms | 375.0ms | 107.5MB | 2 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 296.9K/s | 336.8ms | 344.0ms | 109.6MB | 12 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (3.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 27.99B/s | 0.5ms | — | — | 332 B/op | 1.00× | 47.7× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.51B/s | 13.9ms | — | — | — | 0.05× | 2.58× |
| 🥉 | 🟢 | Rust (generic) | 1.51B/s | 86.8ms | — | — | ~0 (native) | 0.05× | 2.57× |
| 4 | 🟢 | Rust AVX2 | 1.22B/s | 107.0ms | — | — | ~0 (native) | 0.04× | 2.08× |
| 5 | 🟢 | Node.js | 587.37M/s | 223.2ms | 219.0ms | 67.1MB | ~0 | 0.02× | 1.00× |
| 6 | ⚪ | Galerina/WASM legacy lane | 418.29M/s | 1.02s | 1.02s | 111.9MB | ~0 | 0.01× | 0.71× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 794.3K/s | 0.1ms | 0.0ms | 109.4MB | 1.4 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 605.2K/s | 54.1ms | 94.0ms | 109.4MB | 13 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 584.8K/s | 56.0ms | 47.0ms | 109.4MB | 16 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (1.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 3.5K/s | 28.7ms | 31.0ms | 109.8MB | 263 B/op | — | — |
| 🥈 | ⚪ | Galerina manifest ⟨interp⟩ | 1.9K/s | 0.5ms | 0.0ms | 109.5MB | 185.8 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 124.0/s | 8.1ms | 16.0ms | 109.5MB | 334.1 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (263 B/op) · **highest:** Galerina governed ⟨interp⟩ (334.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 54.6K/s | 1.8ms | 0.0ms | 108.0MB | -2.9 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.4K/s | 0.4ms | 0.0ms | 108.6MB | 152.2 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 699.0/s | 1.4ms | 0.0ms | 108.4MB | 171.8 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-2.9 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.36B/s | 442.4ms | — | — | ~0 (native) | 211.5× | 1.48× |
| 🥈 | 🟢 | Rust AVX2 | 1.27B/s | 473.0ms | — | — | ~0 (native) | 197.8× | 1.39× |
| 🥉 | 🟢 | Node.js | 913.98M/s | 328.2ms | — | — | ~0 | 142.5× | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 450.19M/s | 1.33s | 1.33s | 112.2MB | ~0 | 70.2× | 0.49× |
| 5 | ⚫ | Python | 6.41M/s | 1.87s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 303.0K/s | 1.6ms | 0.0ms | 109.9MB | 551 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 287.3K/s | 1.04s | 1.14s | 109.9MB | 1 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 285.1K/s | 1.05s | 1.08s | 109.6MB | 2 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (551 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.65B/s | — | — | — | ~0 (native) | 412.2× | 1.83× |
| 🥈 | 🟢 | Rust (generic) | 2.35B/s | — | — | — | ~0 (native) | 266.2× | 1.18× |
| 🥉 | 🟢 | Node.js | 1.99B/s | — | — | — | — | 224.8× | 1.00× |
| 4 | ⚫ | Python | 8.84M/s | — | — | — | — | 1.00× | 0.00× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 384.44M/s | 130.1ms | — | — | ~0 | 125.3× | 1.00× |
| 🥈 | ⚫ | Python | 3.07M/s | 978.2ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 265.8K/s | 0.7ms | 0.0ms | 109.3MB | 5.7 KB/op | 0.09× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 215.9K/s | 46.3ms | 47.0ms | 109.1MB | 126 B/op | 0.07× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 206.4K/s | 48.4ms | 63.0ms | 110.5MB | 228 B/op | 0.07× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (5.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 154.46M/s | 0.3ms | — | — | ~0 (native) | 121.5× | 3.80× |
| 🥈 | 🟢 | Rust (generic) | 154.46M/s | 0.3ms | — | — | ~0 (native) | 121.5× | 3.80× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 51.61M/s | 1.94s | 1.94s | 112.1MB | ~0 | 40.6× | 1.27× |
| 4 | 🟢 | Node.js | 40.61M/s | 1.2ms | 0.0ms | 65.6MB | ~0 | 32.0× | 1.00× |
| 5 | 🔴 | Python | 1.27M/s | 39.3ms | 46.9ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 48.5K/s | 0.1ms | 0.0ms | 110.4MB | 18.8 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 45.6K/s | 1.10s | 1.11s | 110.2MB | 67 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 45.5K/s | 1.10s | 1.14s | 110.4MB | 65 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (18.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 121.48M/s | 53.9ms | 63.0ms | 67.4MB | ~0 | 127.6× | 1.00× |
| 🥈 | 🟡 | Galerina/WASM legacy lane | 28.15M/s | 1.16s | 1.17s | 113.0MB | ~0 | 29.6× | 0.23× |
| 🥉 | ⚫ | Python | 952.2K/s | 1.72s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 55.7K/s | 0.2ms | 0.0ms | 113.0MB | 17.9 KB/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 54.3K/s | 603.2ms | 609.0ms | 113.0MB | 30 B/op | 0.06× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 53.1K/s | 617.4ms | 687.0ms | 110.4MB | 33 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (17.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 2.99M/s | — | — | — | — | 6.83× | 1.00× |
| 🥈 | 🟡 | Python | 438.0K/s | — | — | — | 1 B/op | 1.00× | 0.15× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 8.5K/s | 0.5ms | 15.0ms | 113.6MB | 91.8 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 4.8K/s | 103.1ms | 187.0ms | 119.4MB | 5.1 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.4K/s | 112.8ms | 156.0ms | 111.4MB | 8.9 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (91.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 23.41M/s | 139.9ms | — | — | ~0 (native) | 178.9× | 3.76× |
| 🥈 | 🟢 | Rust AVX2 | 23.01M/s | 142.4ms | — | — | ~0 (native) | 175.7× | 3.69× |
| 🥉 | 🟢 | Galerina/WASM legacy lane | 8.67M/s | 1.89s | 1.89s | 118.2MB | ~0 | 66.2× | 1.39× |
| 4 | 🟢 | Node.js | 6.23M/s | 526.2ms | 547.0ms | 67.6MB | ~0 | 47.6× | 1.00× |
| 5 | 🔴 | Python | 130.9K/s | 25.03s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 6.7K/s | 0.2ms | 0.0ms | 114.4MB | 146.2 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 6.7K/s | 2.46s | 2.56s | 114.4MB | 261 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 6.6K/s | 2.48s | 2.53s | 114.4MB | 132 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina/WASM legacy lane (~0) · **highest:** Galerina passive ⟨interp⟩ (146.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 370.82M/s | 27.0ms | — | — | ~0 (native) | 245.6× | 1.67× |
| 🥈 | 🟢 | Rust AVX2 | 370.02M/s | 27.0ms | — | — | ~0 (native) | 245.1× | 1.67× |
| 🥉 | 🟢 | Node.js | 221.83M/s | 45.1ms | 31.0ms | 67.1MB | ~0 | 146.9× | 1.00× |
| 4 | ⚫ | Python | 1.51M/s | 6.62s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina/WASM legacy lane | 543.35M/s | 1.00s | 984.0ms | 116.5MB | ~0 | 199.6× | 8.75× |
| 🥈 | 🟢 | Node.js | 62.08M/s | 2.2ms | 0.0ms | 67.3MB | 3 B/op | 22.8× | 1.00× |
| 🥉 | 🟡 | Rust (generic) | 14.16M/s | 9.6ms | — | — | ~0 (native) | 5.20× | 0.23× |
| 4 | 🟡 | Rust AVX2 | 13.54M/s | 10.0ms | — | — | ~0 (native) | 4.98× | 0.22× |
| 5 | 🔴 | Python | 2.72M/s | 49.9ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 364.1K/s | 0.1ms | 0.0ms | 114.2MB | 2.2 KB/op | 0.13× | 0.01× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 310.2K/s | 438.0ms | 453.0ms | 114.2MB | 5 B/op | 0.11× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 296.8K/s | 457.7ms | 453.0ms | 112.1MB | 9 B/op | 0.11× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 150.0K/s | 2.00s | — | — | ~0 (native) | 2.53× | 3.77× |
| 🥈 | 🟢 | Rust AVX2 | 146.5K/s | 2.05s | — | — | ~0 (native) | 2.47× | 3.68× |
| 🥉 | 🟢 | Python | 59.4K/s | 1.68s | — | — | ~0 | 1.00× | 1.49× |
| 4 | 🟢 | Node.js | 39.8K/s | 7.53s | 9.03s | 83.0MB | 7 B/op | 0.67× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (7 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 117.9K/s | 1.70s | 2.52s | 93.6MB | 56 B/op | 1.25× | 1.00× |
| 🥈 | ⚪ | Python | 94.3K/s | 2.12s | — | — | ~0 | 1.00× | 0.80× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (56 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.17B/s | 4.26s | 1.23× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.17B/s | 4.26s | 1.23× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 954.12M/s | 524.0ms | 1.00× |
| 4 | 🟡 | Galerina/WASM legacy lane | 🖥️ CPU (cpu (wasm)) | 446.64M/s | 1.12s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.34M/s | 9.37s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 3.85M/s | 25.9ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 335.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 302.4K/s | 330.7ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 296.9K/s | 336.8ms | 0.00× |

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
| **compute-mix** | Node.js | 1.1× slower | **🏆 winner** | **🏆 winner** | **181× slower** | **60× slower** | **76× slower** | **79× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **424× slower** | **54.9K× slower** | **319× slower** | **374× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | **31× slower** | **915× slower** | **3.5K× slower** | **1.8K× slower** | **1.8K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **21× slower** | **310× slower** | **183× slower** | **620× slower** | **622× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **164× slower** | **149× slower** | **721× slower** | **17.7K× slower** | **🏆 winner** | **4.6K× slower** | **6.7K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust (generic) | 1.1× slower | **🏆 winner** | 2× slower | **89× slower** | **3.1K× slower** | **3.2K× slower** | **3.1K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **180× slower** | **1.2K× slower** | **1.5K× slower** | **6.8K× slower** | **5.7K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | Galerina/WASM legacy lane | **31× slower** | **31× slower** | **43× slower** | not run | **407× slower** | **9.2K× slower** | **10.7K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 4× slower | 8× slower | **2.2K× slower** | **38.5K× slower** | **67.3K× slower** | **51.7K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **220× slower** | **3.5K× slower** | **4.0K× slower** | **3.9K× slower** | 3× slower | **304× slower** |
| **matrix-multiply** | Python | **23× slower** | **19× slower** | **48× slower** | **🏆 winner** | **35.2K× slower** | **47.9K× slower** | **46.3K× slower** | **67× slower** | **19× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 2× slower | **28× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **23× slower** | **78× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust (generic) | 1.1× slower | **🏆 winner** | 1.5× slower | **211× slower** | **4.5K× slower** | **4.7K× slower** | **4.8K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 2× slower | 2× slower | **412× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **125× slower** | **1.4K× slower** | **1.8K× slower** | **1.9K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **122× slower** | **3.2K× slower** | **3.4K× slower** | **3.4K× slower** | 3× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **128× slower** | **2.2K× slower** | **2.2K× slower** | **2.3K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 7× slower | **351× slower** | **675× slower** | **617× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | **179× slower** | **3.5K× slower** | **3.5K× slower** | **3.5K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **246× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | Galerina/WASM legacy lane | **40× slower** | **38× slower** | 9× slower | **200× slower** | **1.5K× slower** | **1.8K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 131.25M/s | 🏆 winner | 181× faster |
| 🥈 | Rust (generic) | 126.80M/s | 1.0× slower | 175× faster |
| 🥉 | Rust AVX2 | 124.82M/s | 1.1× slower | 172× faster |
| 4 | Galerina/WASM legacy lane | 71.70M/s | 1.8× slower | 99× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.19M/s | 60× slower | 3.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.74M/s | 76× slower | 2.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.67M/s | 79× slower | 2.3× faster |
| 8 | Python | 724.9K/s | 181× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.56B/s | 🏆 winner | 54.9K× faster |
| 🥈 | Rust AVX2 | 1.56B/s | 1.0× slower | 54.7K× faster |
| 🥉 | Node.js | 958.99M/s | 1.6× slower | 33.7K× faster |
| 4 | Galerina/WASM legacy lane | 450.35M/s | 3.5× slower | 15.8K× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.90M/s | 319× slower | 172× faster |
| 6 | Galerina governed ⟨interp⟩ | 4.19M/s | 374× slower | 147× faster |
| 7 | Python | 3.69M/s | 424× slower | 130× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 28.5K/s | 54.9K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.12M/s | 🏆 winner | 3.5K× faster |
| 🥈 | Rust AVX2 | 75.11M/s | 1.0× slower | 3.4K× faster |
| 🥉 | Galerina/WASM legacy lane | 33.40M/s | 2.3× slower | 1.5K× faster |
| 4 | Node.js | 2.47M/s | 31× slower | 113× faster |
| 5 | Python | 84.3K/s | 915× slower | 3.9× faster |
| 6 | Galerina manifest ⟨interp⟩ | 44.0K/s | 1.8K× slower | 2.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 42.3K/s | 1.8K× slower | 1.9× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 21.9K/s | 3.5K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.17B/s | 🏆 winner | 622× faster |
| 🥈 | Rust AVX2 | 1.16B/s | 1.0× slower | 615× faster |
| 🥉 | Galerina/WASM legacy lane | 484.09M/s | 2.4× slower | 257× faster |
| 4 | Node.js | 55.87M/s | 21× slower | 30× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 6.42M/s | 183× slower | 3.4× faster |
| 6 | Python | 3.78M/s | 310× slower | 2.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 1.89M/s | 620× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 1.89M/s | 622× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina/WASM legacy lane at 16.5K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 73.9K/s | 🏆 winner | 17.7K× faster |
| 🥈 | Galerina/WASM legacy lane | 16.5K/s | 4.5× slower | 4.0K× faster |
| 🥉 | Rust (generic) | 496.5/s | 149× slower | 119× faster |
| 4 | Rust AVX2 | 450.8/s | 164× slower | 108× faster |
| 5 | Node.js | 102.5/s | 721× slower | 25× faster |
| 6 | Galerina manifest ⟨interp⟩ | 16.0/s | 4.6K× slower | 3.8× faster |
| 7 | Galerina governed ⟨interp⟩ | 11.0/s | 6.7K× slower | 2.6× faster |
| 8 | Python | 4.2/s | 17.7K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 249.54M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust AVX2 | 230.82M/s | 1.1× slower | 3.0K× faster |
| 🥉 | Node.js | 118.27M/s | 2.1× slower | 1.5K× faster |
| 4 | Galerina/WASM legacy lane | 117.34M/s | 2.1× slower | 1.5K× faster |
| 5 | Python | 2.79M/s | 89× slower | 36× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 80.0K/s | 3.1K× slower | 1.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 79.8K/s | 3.1K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 77.3K/s | 3.2K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 12.37B/s | 🏆 winner | 6.8K× faster |
| 🥈 | Rust (generic) | 4.16B/s | 3.0× slower | 2.3K× faster |
| 🥉 | Galerina/WASM legacy lane | 384.15M/s | 32× slower | 211× faster |
| 4 | Node.js | 68.70M/s | 180× slower | 38× faster |
| 5 | Python | 10.01M/s | 1.2K× slower | 5.5× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.06M/s | 1.5K× slower | 4.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.16M/s | 5.7K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 1.82M/s | 6.8K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 35.52M/s | 🏆 winner | 10.7K× faster |
| 🥈 | Rust AVX2 | 1.16M/s | 31× slower | 349× faster |
| 🥉 | Rust (generic) | 1.16M/s | 31× slower | 348× faster |
| 4 | Node.js | 824.1K/s | 43× slower | 247× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 87.2K/s | 407× slower | 26× faster |
| 6 | Galerina manifest ⟨interp⟩ | 3.8K/s | 9.2K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 3.3K/s | 10.7K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 5.69B/s | 🏆 winner | 67.3K× faster |
| 🥈 | Rust (generic) | 1.32B/s | 4.3× slower | 15.6K× faster |
| 🥉 | Node.js | 702.95M/s | 8.1× slower | 8.3K× faster |
| 4 | Galerina/WASM legacy lane | 453.30M/s | 13× slower | 5.4K× faster |
| 5 | Python | 2.64M/s | 2.2K× slower | 31× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 147.8K/s | 38.5K× slower | 1.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 110.0K/s | 51.7K× slower | 1.3× faster |
| 8 | Galerina manifest ⟨interp⟩ | 84.6K/s | 67.3K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.17B/s | 🏆 winner | 4.0K× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 4.0K× faster |
| 🥉 | Node.js | 954.12M/s | 1.2× slower | 3.2K× faster |
| 4 | Galerina/WASM legacy lane | 446.64M/s | 2.6× slower | 1.5K× faster |
| 5 | Python | 5.34M/s | 220× slower | 18× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.85M/s | 304× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 335.0K/s | 3.5K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 302.4K/s | 3.9K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 296.9K/s | 4.0K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 27.99B/s | 🏆 winner | 47.9K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.51B/s | 19× slower | 2.6K× faster |
| 🥉 | Rust (generic) | 1.51B/s | 19× slower | 2.6K× faster |
| 4 | Rust AVX2 | 1.22B/s | 23× slower | 2.1K× faster |
| 5 | Node.js | 587.37M/s | 48× slower | 1.0K× faster |
| 6 | Galerina/WASM legacy lane | 418.29M/s | 67× slower | 715× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 794.3K/s | 35.2K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 605.2K/s | 46.3K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 584.8K/s | 47.9K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.9K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 3.5K/s | 🏆 winner | 28× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.9K/s | 1.8× slower | 15× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 124.0/s | 28× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 54.6K/s | 🏆 winner | 78× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.4K/s | 23× slower | 3.4× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 699.0/s | 78× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.36B/s | 🏆 winner | 4.8K× faster |
| 🥈 | Rust AVX2 | 1.27B/s | 1.1× slower | 4.4K× faster |
| 🥉 | Node.js | 913.98M/s | 1.5× slower | 3.2K× faster |
| 4 | Galerina/WASM legacy lane | 450.19M/s | 3.0× slower | 1.6K× faster |
| 5 | Python | 6.41M/s | 211× slower | 22× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 303.0K/s | 4.5K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 287.3K/s | 4.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 285.1K/s | 4.8K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.65B/s | 🏆 winner | 412× faster |
| 🥈 | Rust (generic) | 2.35B/s | 1.5× slower | 266× faster |
| 🥉 | Node.js | 1.99B/s | 1.8× slower | 225× faster |
| 4 | Python | 8.84M/s | 412× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 384.44M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Python | 3.07M/s | 125× slower | 15× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 265.8K/s | 1.4K× slower | 1.3× faster |
| 4 | Galerina manifest ⟨interp⟩ | 215.9K/s | 1.8K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 206.4K/s | 1.9K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 154.46M/s | 🏆 winner | 3.4K× faster |
| 🥈 | Rust (generic) | 154.46M/s | 1.0× slower | 3.4K× faster |
| 🥉 | Galerina/WASM legacy lane | 51.61M/s | 3.0× slower | 1.1K× faster |
| 4 | Node.js | 40.61M/s | 3.8× slower | 892× faster |
| 5 | Python | 1.27M/s | 122× slower | 28× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 48.5K/s | 3.2K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 45.6K/s | 3.4K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 45.5K/s | 3.4K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 121.48M/s | 🏆 winner | 2.3K× faster |
| 🥈 | Galerina/WASM legacy lane | 28.15M/s | 4.3× slower | 530× faster |
| 🥉 | Python | 952.2K/s | 128× slower | 18× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 55.7K/s | 2.2K× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 54.3K/s | 2.2K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 53.1K/s | 2.3K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 2.99M/s | 🏆 winner | 675× faster |
| 🥈 | Python | 438.0K/s | 6.8× slower | 99× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 8.5K/s | 351× slower | 1.9× faster |
| 4 | Galerina governed ⟨interp⟩ | 4.8K/s | 617× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.4K/s | 675× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 23.41M/s | 🏆 winner | 3.5K× faster |
| 🥈 | Rust AVX2 | 23.01M/s | 1.0× slower | 3.5K× faster |
| 🥉 | Galerina/WASM legacy lane | 8.67M/s | 2.7× slower | 1.3K× faster |
| 4 | Node.js | 6.23M/s | 3.8× slower | 943× faster |
| 5 | Python | 130.9K/s | 179× slower | 20× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 6.7K/s | 3.5K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 6.7K/s | 3.5K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 6.6K/s | 3.5K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 370.82M/s | 🏆 winner | 246× faster |
| 🥈 | Rust AVX2 | 370.02M/s | 1.0× slower | 245× faster |
| 🥉 | Node.js | 221.83M/s | 1.7× slower | 147× faster |
| 4 | Python | 1.51M/s | 246× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina/WASM legacy lane | 543.35M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 62.08M/s | 8.8× slower | 209× faster |
| 🥉 | Rust (generic) | 14.16M/s | 38× slower | 48× faster |
| 4 | Rust AVX2 | 13.54M/s | 40× slower | 46× faster |
| 5 | Python | 2.72M/s | 200× slower | 9.2× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 364.1K/s | 1.5K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 310.2K/s | 1.8K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 296.8K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 150.0K/s | 🏆 winner | 3.8× faster |
| 🥈 | Rust AVX2 | 146.5K/s | 1.0× slower | 3.7× faster |
| 🥉 | Python | 59.4K/s | 2.5× slower | 1.5× faster |
| 4 | Node.js | 39.8K/s | 3.8× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 117.9K/s | 🏆 winner | 1.3× faster |
| 🥈 | Python | 94.3K/s | 1.3× slower | — (slowest) |


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

