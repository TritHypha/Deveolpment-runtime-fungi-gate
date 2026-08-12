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
- **WASM ▶ production** — `galerina run` → WAT → WebAssembly. Governance gates compiled IN. **This is the production governed runtime** — the row to read for shipping cost.

> **Taxonomy — read this before the governance numbers.** The three `⟨interp⟩` rows below are **Stage-A interpreter diagnostic tiers**, NOT the production path. They exist to (a) *measure* the cost of pre-planning vs runtime proving, and (b) *verify* the WASM compiler against the reference interpreter. Do not read the interpreter's governed throughput as the shipping governance cost — read the **WASM ▶ production** row for that.
- **Galerina governed ⟨interp⟩** — Stage-A: full governance tree-walker (capabilities + audit + proof rebuilt per call). *Diagnostic worst-case.*
- **Galerina manifest ⟨interp⟩** — Stage-A: pre-verified runtime manifest, governance erased at runtime. *Diagnostic.*
- **Galerina passive ⟨interp⟩** — Stage-A: pre-compiled deployment model with LRU result cache (warm path). *Diagnostic.*

---

## 1. Per-Metric Scoreboards

> Categories: 15 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **WASM ▶ production** lane to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | WASM ▶ production | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 74.69M/s | ⚪ 1.7× slower | ⚪ 1.8× slower | 1.68M/s | WASM near native |
| arithmetic-threshold | 477.12M/s | UNCERTIFIED | UNCERTIFIED | 5.20M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 35.77M/s | UNCERTIFIED | UNCERTIFIED | 44.8K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.1K/s | UNCERTIFIED | UNCERTIFIED | 10.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 118.49M/s | 🟡 2.1× slower | 🟢 1.1× slower | 82.6K/s | WASM usable |
| hardware-targets | 36.33M/s | UNCERTIFIED | UNCERTIFIED | 3.8K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 432.92M/s | 🟡 3.5× slower | ⚪ 1.4× slower | 674.5K/s | WASM usable |
| tri-logic | 457.69M/s | 🟡 2.9× slower | 🟡 2.1× slower | 287.2K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 193.1K/s | WASM not built for this lane yet |
| call-chain | 53.58M/s | — | 🟡 4.9× slower | 46.0K/s | WASM 2–10× under Node |
| nbody | 25.52M/s | — | 🟡 4.8× slower | 52.7K/s | WASM 2–10× under Node |
| mandelbrot | 8.80M/s | 🟡 2.6× slower | 🟢 1.3× | 6.6K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 27.58B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 11 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 29 B/op | 56 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 2 B/op | 16 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.18B/s | 456.89M/s | 3.86M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 27.58B/s | 432.92M/s | 1.64B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (193.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 193.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (667.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 667.0/s |
| json-parse | records/s | **Node.js** (2.81M/s) | 2.81M/s | 428.0K/s | not run — no native impl | no WASM — strings/records | 4.4K/s |
| spore-container | containers/s | **Rust (generic)** (156.7K/s) | 39.6K/s | 61.8K/s | 156.7K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (119.7K/s) | 119.7K/s | 108.7K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.4K/s) | 3.4K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (5.8K/s) | 5.8K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (14.1K/s) | 14.1K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (84.6K/s) | 84.6K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (686.0/s) | 686.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 651.0/s | 801.0/s | 2.86M/s | 0.81× governed/manifest (gov overhead ≈ 1.23×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **128.26M/s** | **130.33M/s** | not run — no C++ impl | **132.80M/s** | 701.9K/s | 2.12M/s | 1.75M/s | 1.68M/s | 74.69M/s | not run — no GPU path | 78.9× |
| arithmetic-threshold | not run — no AVX-512 | **1.56B/s** | **1.56B/s** | not run — no C++ impl | 978.70M/s | 3.73M/s | 34.9K/s | 5.24M/s | 5.20M/s | 477.12M/s | not run — no GPU path | 188.2× |
| six-digit-guess | not run — no AVX-512 | 73.18M/s | **77.85M/s** | not run — no C++ impl | 2.74M/s | 85.5K/s | 26.3K/s | 44.9K/s | 44.8K/s | 35.77M/s | not run — no GPU path | 61.1× |
| record-allocation | not run — no AVX-512 | **1.16B/s** | **1.16B/s** | not run — no C++ impl | 61.46M/s | 3.15M/s | 8.03M/s | 5.75M/s | 1.89M/s | 548.13M/s | not run — no GPU path | 32.5× |
| fibonacci-recursive | not run — no AVX-512 | 491.0/s | 496.4/s | not run — no C++ impl | 125.1/s | 4.0/s | **67.8K/s** | 15.0/s | 10.0/s | 17.1K/s | not run — no GPU path | 12.5× |
| tower-of-hanoi | not run — no AVX-512 | **250.36M/s** | **249.25M/s** | not run — no C++ impl | 128.93M/s | 2.57M/s | 85.9K/s | 83.5K/s | 82.6K/s | 118.49M/s | not run — no GPU path | 1.6K× |
| collection-pipeline | not run — no AVX-512 | **13.24B/s** | 4.20B/s | not run — no C++ impl | 69.00M/s | 9.50M/s | 8.17M/s | 2.04M/s | 2.32M/s | 411.33M/s | not run — no GPU path | 29.7× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.17M/s | not run — no C++ impl | 878.0K/s | not run | 90.3K/s | 4.5K/s | 3.8K/s | **36.33M/s** | not run — no GPU path | 228.3× |
| low-memory | not run — no AVX-512 | **6.03B/s** | 1.32B/s | not run — no C++ impl | 708.43M/s | 2.81M/s | 152.8K/s | 106.1K/s | 123.6K/s | 457.76M/s | not run — no GPU path | 5.7K× |
| gpu-compute | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 967.44M/s | 5.50M/s | 356.0K/s | 313.0K/s | 319.4K/s | 456.89M/s | 3.86M/s | 3.0K× |
| matrix-multiply | not run — no AVX-512 | 1.41B/s | 1.50B/s | not run — no C++ impl | 605.30M/s | **27.58B/s** | 843.8K/s | 587.3K/s | 674.5K/s | 432.92M/s | 1.64B/s | 897.4× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **4.8K/s** | 1.9K/s | 193.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **68.6K/s** | 2.3K/s | 667.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.32B/s** | **1.33B/s** | not run — no C++ impl | 976.29M/s | 6.55M/s | 303.0K/s | 295.4K/s | 287.2K/s | 457.69M/s | not run — no GPU path | 3.4K× |
| verified-native-operation | not run — no AVX-512 | **3.70B/s** | 2.34B/s | not run — no C++ impl | 1.49B/s | 9.15M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **377.67M/s** | 3.28M/s | 244.3K/s | 197.0K/s | 193.1K/s | no WASM build | not run — no GPU path | 2.0K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **261.28M/s** | 1.37M/s | 51.0K/s | 45.8K/s | 46.0K/s | 53.58M/s | not run — no GPU path | 5.7K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.26M/s** | 998.4K/s | 56.0K/s | 55.0K/s | 52.7K/s | 25.52M/s | not run — no GPU path | 2.3K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **2.81M/s** | 428.0K/s | 8.7K/s | 4.4K/s | 4.4K/s | no WASM — strings/records | not run — no GPU path | 636.7× |
| mandelbrot | not run — no AVX-512 | **21.99M/s** | **23.14M/s** | not run — no C++ impl | 6.74M/s | 135.0K/s | 6.7K/s | 6.7K/s | 6.6K/s | 8.80M/s | not run — no GPU path | 1.0K× |
| spectral-norm | not run — no AVX-512 | **369.33M/s** | **369.38M/s** | not run — no C++ impl | 227.17M/s | 1.60M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 15.66M/s | 14.65M/s | not run — no C++ impl | 72.39M/s | 3.77M/s | 365.4K/s | 314.5K/s | 316.2K/s | **562.02M/s** | not run — no GPU path | 229.0× |
| spore-container | not run — no AVX-512 | **155.4K/s** | **156.7K/s** | not run — no C++ impl | 39.6K/s | 61.8K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **119.7K/s** | 108.7K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -38.00 bytes/op ⚡ ~0 — no boxing | 152.8K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.03B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.32B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 708.43M/s | — | 19KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 457.76M/s | — | 42KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.81M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 29 bytes/op ⚠ moderate | 123.6K/s | — | 292KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 56 bytes/op ⚠ moderate | 106.1K/s | — | 557KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 67.2MB | 67.3MB | 5.0MB | 932KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 97.7MB | 97.7MB | 19.3MB | 311KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 93.4MB | 93.4MB | 22.8MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 92.7MB | 92.7MB | 22.5MB | 4.5MB |
| compute-mix | WASM ▶ production | 94.0MB | 94.0MB | 18.3MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 66.1MB | 66.3MB | 4.3MB | 154KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 99.2MB | 99.2MB | 19.5MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 99.0MB | 99.0MB | 19.4MB | 846KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 98.7MB | 98.7MB | 19.4MB | 849KB |
| arithmetic-threshold | WASM ▶ production | 101.4MB | 101.4MB | 18.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 70.9MB | 70.9MB | 5.9MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 100.1MB | 100.1MB | 21.2MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 100.2MB | 100.2MB | 20.3MB | 1.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 100.1MB | 100.1MB | 19.3MB | 481KB |
| six-digit-guess | WASM ▶ production | 101.8MB | 101.8MB | 19.1MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 67.1MB | 67.1MB | 4.2MB | 99KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 100.4MB | 100.4MB | 20.0MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 101.3MB | 101.3MB | 19.5MB | 110KB |
| record-allocation | Galerina governed ⟨interp⟩ | 101.0MB | 101.0MB | 19.4MB | 59KB |
| record-allocation | WASM ▶ production | 102.5MB | 102.5MB | 19.7MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 65.1MB | 65.1MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 100.7MB | 100.7MB | 21.8MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 100.7MB | 100.7MB | 21.4MB | 1.8MB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 100.9MB | 100.9MB | 20.2MB | 719KB |
| fibonacci-recursive | WASM ▶ production | 103.1MB | 103.1MB | 19.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 65.3MB | 65.3MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 103.5MB | 103.5MB | 20.4MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 102.8MB | 102.8MB | 22.7MB | 4.1MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 102.7MB | 102.7MB | 22.3MB | 3.7MB |
| tower-of-hanoi | WASM ▶ production | 102.9MB | 102.9MB | 19.0MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 82.0MB | 82.0MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 103.4MB | 103.4MB | 19.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 103.4MB | 103.4MB | 18.8MB | 144KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 104.3MB | 104.3MB | 18.8MB | 169KB |
| collection-pipeline | WASM ▶ production | 105.3MB | 105.3MB | 18.9MB | 26KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 65.4MB | 65.4MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 105.2MB | 105.2MB | 19.7MB | 525KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 106.9MB | 106.9MB | 19.3MB | 491KB |
| governance-cost | Galerina governed ⟨interp⟩ | 104.8MB | 104.8MB | 19.3MB | 518KB |
| governance-cost | WASM ▶ production | 105.5MB | 105.5MB | 19.1MB | 51KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 67.0MB | 67.0MB | 4.5MB | 329KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 104.9MB | 104.9MB | 20.4MB | 679KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 103.3MB | 103.3MB | 19.0MB | 92KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 103.3MB | 103.3MB | 19.0MB | 83KB |
| hardware-targets | WASM ▶ production | 105.3MB | 105.3MB | 19.3MB | 75KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 65.2MB | 65.2MB | 4.1MB | 19KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 103.3MB | 103.3MB | 19.7MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 103.8MB | 103.8MB | 19.6MB | 557KB |
| low-memory | Galerina governed ⟨interp⟩ | 103.6MB | 103.6MB | 19.3MB | 292KB |
| low-memory | WASM ▶ production | 105.7MB | 105.7MB | 19.3MB | 42KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 65.3MB | 65.3MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 104.0MB | 104.0MB | 19.7MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 103.9MB | 103.9MB | 19.4MB | 260KB |
| gpu-compute | Galerina governed ⟨interp⟩ | 103.8MB | 103.8MB | 19.6MB | 431KB |
| gpu-compute | WASM ▶ production | 106.9MB | 106.9MB | 19.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 67.1MB | 67.1MB | 4.7MB | 546KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 105.8MB | 105.8MB | 20.0MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 105.8MB | 105.8MB | 19.4MB | 156KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 105.7MB | 105.7MB | 20.2MB | 1.0MB |
| matrix-multiply | WASM ▶ production | 107.3MB | 107.3MB | 20.0MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 80.1MB | 80.1MB | 8.0MB | 2.5MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 105.6MB | 105.6MB | 20.0MB | -12KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 105.8MB | 105.8MB | 19.5MB | 199KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 19.5MB | 346KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 475KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 106.6MB | 106.6MB | 20.4MB | -240KB |
| text-html | Galerina manifest ⟨interp⟩ | 105.8MB | 105.8MB | 19.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 19.9MB | 176KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 175KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 106.2MB | 106.2MB | 21.4MB | 298KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 106.2MB | 106.2MB | 21.0MB | 1.2MB |
| tri-logic | Galerina governed ⟨interp⟩ | 106.0MB | 106.0MB | 20.2MB | 466KB |
| tri-logic | WASM ▶ production | 108.8MB | 108.8MB | 20.1MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 104.8MB | 104.8MB | 21.2MB | -930KB |
| data-query | Galerina manifest ⟨interp⟩ | 104.5MB | 104.5MB | 20.6MB | 681KB |
| data-query | Galerina governed ⟨interp⟩ | 104.7MB | 104.7MB | 21.1MB | 1.2MB |
| call-chain | Node.js | 66.3MB | 66.3MB | 4.5MB | 308KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 107.0MB | 107.0MB | 24.3MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 107.0MB | 107.0MB | 21.3MB | 1.3MB |
| call-chain | Galerina governed ⟨interp⟩ | 105.3MB | 105.3MB | 21.4MB | 1.5MB |
| call-chain | WASM ▶ production | 107.9MB | 107.9MB | 20.2MB | 1KB |
| nbody | Node.js | 67.2MB | 67.2MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 105.1MB | 105.1MB | 21.1MB | 236KB |
| nbody | Galerina manifest ⟨interp⟩ | 105.1MB | 105.1MB | 20.6MB | 548KB |
| nbody | Galerina governed ⟨interp⟩ | 106.6MB | 106.6MB | 22.3MB | 2.2MB |
| nbody | WASM ▶ production | 107.5MB | 107.5MB | 20.3MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 113.9MB | 113.9MB | 24.1MB | 432KB |
| json-parse | Galerina manifest ⟨interp⟩ | 108.3MB | 108.3MB | 22.1MB | 1.6MB |
| json-parse | Galerina governed ⟨interp⟩ | 113.9MB | 113.9MB | 22.2MB | 2.1MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 67.0MB | 67.0MB | 4.2MB | 42KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 110.2MB | 110.2MB | 24.1MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 110.2MB | 110.2MB | 23.6MB | 3.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 107.4MB | 107.4MB | 21.9MB | 1.2MB |
| mandelbrot | WASM ▶ production | 109.7MB | 109.7MB | 21.0MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 67.0MB | 67.0MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 67.1MB | 67.1MB | 4.6MB | 429KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 109.2MB | 109.2MB | 21.4MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 109.2MB | 109.2MB | 22.7MB | 2.2MB |
| binary-trees | Galerina governed ⟨interp⟩ | 109.3MB | 109.3MB | 20.8MB | 308KB |
| binary-trees | WASM ▶ production | 112.3MB | 112.3MB | 20.8MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 82.9MB | 82.9MB | 9.2MB | 2.0MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 93.5MB | 93.5MB | 20.9MB | 14.4MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 132.8K ops/CPU-ms |
| compute-mix | Python | 5.06s | 5.05s | 100% | 703.41 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.5ms | 47.0ms | 165% | 1.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 29.7ms | 31.0ms | 104% | 1.6K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.34s | 1.33s | 99% | 75.3K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 20.4ms | 46.0ms | 225% | 434.8K ops/CPU-ms |
| arithmetic-threshold | Python | 5.36s | 5.36s | 100% | 3.7K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.1ms | 16.0ms | 132% | 4.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.2ms | 16.0ms | 132% | 4.0K ops/CPU-ms |
| arithmetic-threshold | WASM ▶ production | 1.06s | 1.05s | 99% | 483.3K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 15.4ms | 32.0ms | 208% | 1.3K ops/CPU-ms |
| six-digit-guess | Python | 491.9ms | 500.0ms | 102% | 84.14 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 936.0ms | 969.0ms | 104% | 43.41 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 939.4ms | 984.0ms | 105% | 42.75 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.18s | 1.17s | 100% | 35.9K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.6ms | — | — | — |
| record-allocation | Rust (generic) | 8.6ms | — | — | — |
| record-allocation | Node.js | 3.3ms | 0.0ms | 0% | — |
| record-allocation | Python | 63.5ms | 62.5ms | 98% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 5.3ms | 31.0ms | 587% | 322.58 ops/CPU-ms |
| record-allocation | WASM ▶ production | 1.00s | 1.02s | 101% | 541.3K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 407.4ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 402.9ms | — | — | — |
| fibonacci-recursive | Node.js | 799.4ms | 797.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 5.00s | 5.00s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 64.8ms | 78.0ms | 120% | 0.01 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 95.9ms | 93.0ms | 97% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.05s | 1.05s | 99% | 17.21 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 523.5ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 525.8ms | — | — | — |
| tower-of-hanoi | Node.js | 101.7ms | 94.0ms | 92% | 139.4K ops/CPU-ms |
| tower-of-hanoi | Python | 510.5ms | 515.6ms | 101% | 2.5K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 784.6ms | 860.0ms | 110% | 76.20 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 793.5ms | 844.0ms | 106% | 77.65 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.11s | 1.11s | 100% | 118.2K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.5ms | — | — | — |
| collection-pipeline | Rust (generic) | 238.2ms | — | — | — |
| collection-pipeline | Node.js | 724.7ms | 750.0ms | 103% | 66.7K ops/CPU-ms |
| collection-pipeline | Python | 5.27s | 5.27s | 100% | 9.5K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.9ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.3ms | 32.0ms | 742% | 312.50 ops/CPU-ms |
| collection-pipeline | WASM ▶ production | 1.02s | 1.01s | 99% | 413.8K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.6ms | — | — | — |
| governance-cost | Rust (generic) | 11.2ms | — | — | — |
| governance-cost | Node.js | 47.1ms | 47.0ms | 100% | — |
| governance-cost | Python | 5.10s | 5.09s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.8ms | 31.0ms | 1684% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.3ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.02s | 102% | — |
| hardware-targets | Rust AVX2 | 852.8ms | — | — | — |
| hardware-targets | Rust (generic) | 854.2ms | — | — | — |
| hardware-targets | Node.js | 1.14s | 1.14s | 100% | 877.19 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.1ms | 47.0ms | 424% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.01s | 101% | 35.8K ops/CPU-ms |
| low-memory | Rust AVX2 | 165.8ms | — | — | — |
| low-memory | Rust (generic) | 755.5ms | — | — | — |
| low-memory | Node.js | 70.6ms | 79.0ms | 112% | 632.9K ops/CPU-ms |
| low-memory | Python | 3.56s | 3.56s | 100% | 2.8K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 15.0ms | 2530% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 94.2ms | 140.0ms | 149% | 71.43 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 80.9ms | 95.0ms | 117% | 105.26 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.00s | 1.00s | 100% | 460.0K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.24s | — | — | — |
| gpu-compute | Rust (generic) | 4.25s | — | — | — |
| gpu-compute | Node.js | 516.8ms | 516.0ms | 100% | 969.0K ops/CPU-ms |
| gpu-compute | Python | 9.10s | 9.09s | 100% | 5.5K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 319.5ms | 344.0ms | 108% | 290.70 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 313.0ms | 390.0ms | 125% | 256.41 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.09s | 1.09s | 100% | 457.0K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 25.9ms | — | — | — |
| matrix-multiply | Rust AVX2 | 93.0ms | — | — | — |
| matrix-multiply | Rust (generic) | 87.6ms | — | — | — |
| matrix-multiply | Node.js | 216.5ms | 219.0ms | 101% | 598.5K ops/CPU-ms |
| matrix-multiply | Python | 0.5ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 55.8ms | 93.0ms | 167% | 352.34 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 48.6ms | 78.0ms | 161% | 420.10 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.06s | 1.13s | 106% | 407.8K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.8ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 21.1ms | 31.0ms | 147% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 5.2ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.5ms | 16.0ms | 1097% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.5ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 453.0ms | — | — | — |
| tri-logic | Rust (generic) | 449.5ms | — | — | — |
| tri-logic | Node.js | 307.3ms | — | — | — |
| tri-logic | Python | 1.83s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 2.0ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 1.02s | 1.06s | 105% | 282.49 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.04s | 1.08s | 103% | 278.29 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.31s | 1.31s | 100% | 457.3K ops/CPU-ms |
| data-query | Node.js | 132.4ms | — | — | — |
| data-query | Python | 913.3ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.9ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 50.8ms | 78.0ms | 154% | 128.21 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 51.8ms | 63.0ms | 122% | 158.73 ops/CPU-ms |
| call-chain | Node.js | 7.7ms | 0.0ms | 0% | — |
| call-chain | Python | 729.5ms | 718.8ms | 99% | 1.4K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.09s | 1.11s | 102% | 45.09 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.09s | 1.08s | 99% | 46.38 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.87s | 1.86s | 100% | 53.8K ops/CPU-ms |
| nbody | Node.js | 53.6ms | 47.0ms | 88% | 139.4K ops/CPU-ms |
| nbody | Python | 1.64s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 595.5ms | 609.0ms | 102% | 53.81 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 621.6ms | 656.0ms | 106% | 49.95 ops/CPU-ms |
| nbody | WASM ▶ production | 1.28s | 1.28s | 100% | 25.6K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 112.8ms | 218.0ms | 193% | 2.29 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 113.4ms | 203.0ms | 179% | 2.46 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 149.0ms | — | — | — |
| mandelbrot | Rust (generic) | 141.6ms | — | — | — |
| mandelbrot | Node.js | 486.5ms | 500.0ms | 103% | 6.6K ops/CPU-ms |
| mandelbrot | Python | 24.28s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.46s | 2.55s | 104% | 6.43 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.50s | 2.58s | 103% | 6.36 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.86s | 1.86s | 100% | 8.8K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 27.1ms | — | — | — |
| spectral-norm | Rust (generic) | 27.1ms | — | — | — |
| spectral-norm | Node.js | 44.0ms | 47.0ms | 107% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 6.26s | — | — | — |
| binary-trees | Rust AVX2 | 8.7ms | — | — | — |
| binary-trees | Rust (generic) | 9.3ms | — | — | — |
| binary-trees | Node.js | 1.9ms | 0.0ms | 0% | — |
| binary-trees | Python | 36.0ms | 31.3ms | 87% | 4.3K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 431.9ms | 438.0ms | 101% | 310.17 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 429.7ms | 437.0ms | 102% | 310.88 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.21s | 1.19s | 98% | 572.3K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.93s | — | — | — |
| spore-container | Rust (generic) | 1.91s | — | — | — |
| spore-container | Node.js | 7.58s | 9.31s | 123% | 32.21 ops/CPU-ms |
| spore-container | Python | 1.62s | — | — | — |
| framework-pipeline | Node.js | 1.67s | 2.53s | 151% | 79.02 ops/CPU-ms |
| framework-pipeline | Python | 1.84s | — | — | — |
| http-throughput | Node.js | 89.0ms | — | — | — |
| naming-check | Node.js | 535.0ms | — | — | — |
| context-receipt | Node.js | 412.0ms | — | — | — |
| intelligence-search | Node.js | 59.0ms | — | — | — |
| provenance-trace | Node.js | 2.26s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 132.80M/s | 5.00s | 5.00s | 67.2MB | ~0 | 189.2× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 130.33M/s | 5.00s | — | — | ~0 (native) | 185.7× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 128.26M/s | 5.00s | — | — | ~0 (native) | 182.7× | 0.97× |
| 4 | ⚪ | WASM ▶ production | 74.69M/s | 1.34s | 1.33s | 94.0MB | ~0 | 106.4× | 0.56× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 2.12M/s | 0.3ms | 0.0ms | 97.7MB | 461 B/op | 3.02× | 0.02× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.75M/s | 28.5ms | 47.0ms | 93.4MB | 89 B/op | 2.50× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.68M/s | 29.7ms | 31.0ms | 92.7MB | 89 B/op | 2.40× | 0.01× |
| 8 | ⚫ | Python | 701.9K/s | 5.06s | 5.05s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (461 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.56B/s | 12.8ms | — | — | ~0 (native) | 418.8× | 1.60× |
| 🥈 | 🟢 | Rust (generic) | 1.56B/s | 12.8ms | — | — | ~0 (native) | 418.5× | 1.60× |
| 🥉 | 🟢 | Node.js | 978.70M/s | 20.4ms | 46.0ms | 66.1MB | ~0 | 262.4× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 477.12M/s | 1.06s | 1.05s | 101.4MB | ~0 | 127.9× | 0.49× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.24M/s | 12.1ms | 16.0ms | 99.0MB | 13 B/op | 1.40× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.20M/s | 12.2ms | 16.0ms | 98.7MB | 13 B/op | 1.39× | 0.01× |
| 7 | ⚫ | Python | 3.73M/s | 5.36s | 5.36s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 34.9K/s | 0.1ms | 0.0ms | 99.2MB | 18.6 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.85M/s | 0.5ms | — | — | ~0 (native) | 910.3× | 28.4× |
| 🥈 | 🟢 | Rust AVX2 | 73.18M/s | 0.6ms | — | — | ~0 (native) | 855.7× | 26.7× |
| 🥉 | 🟢 | WASM ▶ production | 35.77M/s | 1.18s | 1.17s | 101.8MB | ~0 | 418.3× | 13.1× |
| 4 | 🟢 | Node.js | 2.74M/s | 15.4ms | 32.0ms | 70.9MB | 27 B/op | 32.0× | 1.00× |
| 5 | 🔴 | Python | 85.5K/s | 491.9ms | 500.0ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 44.9K/s | 936.0ms | 969.0ms | 100.2MB | 26 B/op | 0.53× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 44.8K/s | 939.4ms | 984.0ms | 100.1MB | 11 B/op | 0.52× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 26.3K/s | 0.1ms | 0.0ms | 100.1MB | 32.5 KB/op | 0.31× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.16B/s | 8.6ms | — | — | ~0 (native) | 369.7× | 19.0× |
| 🥈 | 🟢 | Rust AVX2 | 1.16B/s | 8.6ms | — | — | ~0 (native) | 368.9× | 18.9× |
| 🥉 | 🟢 | WASM ▶ production | 548.13M/s | 1.00s | 1.02s | 102.5MB | ~0 | 174.0× | 8.92× |
| 4 | 🟢 | Node.js | 61.46M/s | 3.3ms | 0.0ms | 67.1MB | ~0 | 19.5× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.03M/s | 0.3ms | 0.0ms | 100.4MB | 110 B/op | 2.55× | 0.13× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 5.75M/s | 1.7ms | 0.0ms | 101.3MB | 11 B/op | 1.82× | 0.09× |
| 7 | 🔴 | Python | 3.15M/s | 63.5ms | 62.5ms | — | ~0 | 1.00× | 0.05× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 1.89M/s | 5.3ms | 31.0ms | 101.0MB | 6 B/op | 0.60× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (110 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 67.8K/s | 0.1ms | 0.0ms | 100.7MB | 11.8 KB/op | 17.0K× | 542.3× |
| 🥈 | 🟢 | WASM ▶ production | 17.1K/s | 1.05s | 1.05s | 103.1MB | ~0 | 4.3K× | 136.7× |
| 🥉 | 🟢 | Rust (generic) | 496.4/s | 402.9ms | — | — | ~0 (native) | 124.1× | 3.97× |
| 4 | 🟢 | Rust AVX2 | 491.0/s | 407.4ms | — | — | ~0 (native) | 122.7× | 3.92× |
| 5 | 🟢 | Node.js | 125.1/s | 799.4ms | 797.0ms | 65.1MB | 53 B/op | 31.3× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 15.0/s | 64.8ms | 78.0ms | 100.7MB | 1772.5 KB/op | 3.75× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 10.0/s | 95.9ms | 93.0ms | 100.9MB | 732.0 KB/op | 2.50× | 0.08× |
| 8 | 🔴 | Python | 4.0/s | 5.00s | 5.00s | — | 23 B/op | 1.00× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (1772.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 250.36M/s | 523.5ms | — | — | ~0 (native) | 97.5× | 1.94× |
| 🥈 | 🟢 | Rust (generic) | 249.25M/s | 525.8ms | — | — | ~0 (native) | 97.1× | 1.93× |
| 🥉 | 🟢 | Node.js | 128.93M/s | 101.7ms | 94.0ms | 65.3MB | ~0 | 50.2× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 118.49M/s | 1.11s | 1.11s | 102.9MB | ~0 | 46.1× | 0.92× |
| 5 | 🔴 | Python | 2.57M/s | 510.5ms | 515.6ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 85.9K/s | 0.1ms | 0.0ms | 103.5MB | 9.6 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 83.5K/s | 784.6ms | 860.0ms | 102.8MB | 62 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 82.6K/s | 793.5ms | 844.0ms | 102.7MB | 57 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (9.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.24B/s | 75.5ms | — | — | ~0 (native) | 1.4K× | 191.9× |
| 🥈 | 🟢 | Rust (generic) | 4.20B/s | 238.2ms | — | — | ~0 (native) | 442.0× | 60.8× |
| 🥉 | 🟢 | WASM ▶ production | 411.33M/s | 1.02s | 1.01s | 105.3MB | ~0 | 43.3× | 5.96× |
| 4 | 🟢 | Node.js | 69.00M/s | 724.7ms | 750.0ms | 82.0MB | ~0 | 7.27× | 1.00× |
| 5 | 🟡 | Python | 9.50M/s | 5.27s | 5.27s | — | ~0 | 1.00× | 0.14× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.17M/s | 0.3ms | 0.0ms | 103.4MB | 148 B/op | 0.86× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.32M/s | 4.3ms | 32.0ms | 104.3MB | 17 B/op | 0.24× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.04M/s | 4.9ms | 0.0ms | 103.4MB | 14 B/op | 0.21× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (148 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 862.23M/s | 11.6ms |
| Rust (generic) | 890.91M/s | 11.2ms |
| Node.js | 2.12M/s | 47.1ms |
| Python | 19.6K/s | 5.10s |
| Galerina passive ⟨interp⟩ | 1.7K/s | 1.8ms |
| Galerina manifest ⟨interp⟩ | 801.0/s | 1.3ms |
| Galerina governed ⟨interp⟩ | 651.0/s | 1.5ms |
| WASM ▶ production | 2.86M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 36.33M/s | 1.00s | 1.01s | 105.3MB | ~0 | — | 41.4× |
| 🥈 | 🟢 | Rust AVX2 | 1.17M/s | 852.8ms | — | — | ~0 (native) | — | 1.34× |
| 🥉 | 🟢 | Rust (generic) | 1.17M/s | 854.2ms | — | — | ~0 (native) | — | 1.33× |
| 4 | 🟢 | Node.js | 878.0K/s | 1.14s | 1.14s | 67.0MB | ~0 | — | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 90.3K/s | 11.1ms | 47.0ms | 104.9MB | 679 B/op | — | 0.10× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 4.5K/s | 0.2ms | 0.0ms | 103.3MB | 89.8 KB/op | — | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 3.8K/s | 0.3ms | 0.0ms | 103.3MB | 81.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (89.8 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.03B/s | 165.8ms | — | — | ~0 | 2.1K× | 8.52× |
| 🥈 | 🟢 | Rust (generic) | 1.32B/s | 755.5ms | — | — | ~0 | 470.9× | 1.87× |
| 🥉 | 🟢 | Node.js | 708.43M/s | 70.6ms | 79.0ms | 65.2MB | ~0 | 252.0× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 457.76M/s | 1.00s | 1.00s | 105.7MB | ~0 | 162.8× | 0.65× |
| 5 | ⚫ | Python | 2.81M/s | 3.56s | 3.56s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 152.8K/s | 0.6ms | 15.0ms | 103.3MB | -4.1 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 123.6K/s | 80.9ms | 95.0ms | 103.6MB | 29 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 106.1K/s | 94.2ms | 140.0ms | 103.8MB | 56 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.1 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (56 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 4.24s | — | — | ~0 (native) | 214.3× | 1.22× |
| 🥈 | 🟢 | Rust (generic) | 1.18B/s | 4.25s | — | — | ~0 (native) | 214.1× | 1.22× |
| 🥉 | 🟢 | Node.js | 967.44M/s | 516.8ms | 516.0ms | 65.3MB | ~0 | 176.0× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 456.89M/s | 1.09s | 1.09s | 106.9MB | ~0 | 83.1× | 0.47× |
| 5 | ⚫ | Python | 5.50M/s | 9.10s | 9.09s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.86M/s | 25.9ms | — | — | — | 0.70× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 356.0K/s | 0.2ms | 0.0ms | 104.0MB | 3.1 KB/op | 0.06× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 319.4K/s | 313.0ms | 390.0ms | 103.8MB | 4 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 313.0K/s | 319.5ms | 344.0ms | 103.9MB | 3 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 27.58B/s | 0.5ms | — | — | 332 B/op | 1.00× | 45.6× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.64B/s | 12.8ms | — | — | — | 0.06× | 2.71× |
| 🥉 | 🟢 | Rust (generic) | 1.50B/s | 87.6ms | — | — | ~0 (native) | 0.05× | 2.47× |
| 4 | 🟢 | Rust AVX2 | 1.41B/s | 93.0ms | — | — | ~0 (native) | 0.05× | 2.33× |
| 5 | 🟢 | Node.js | 605.30M/s | 216.5ms | 219.0ms | 67.1MB | ~0 | 0.02× | 1.00× |
| 6 | ⚪ | WASM ▶ production | 432.92M/s | 1.06s | 1.13s | 107.3MB | ~0 | 0.02× | 0.72× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 843.8K/s | 0.1ms | 0.0ms | 105.8MB | 1.4 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 674.5K/s | 48.6ms | 78.0ms | 105.7MB | 32 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 587.3K/s | 55.8ms | 93.0ms | 105.8MB | 5 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 4.8K/s | 21.1ms | 31.0ms | 105.6MB | -121 B/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.9K/s | 0.5ms | 0.0ms | 105.8MB | 194.4 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 193.0/s | 5.2ms | 0.0ms | 105.8MB | 337.2 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-121 B/op) · **highest:** Galerina governed ⟨interp⟩ (337.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 68.6K/s | 1.5ms | 16.0ms | 106.6MB | -2.3 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.3K/s | 0.4ms | 0.0ms | 105.8MB | 152.2 KB/op | — | — |
| 🥉 | ⚫ | Galerina governed ⟨interp⟩ | 667.0/s | 1.5ms | 0.0ms | 105.8MB | 171.7 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-2.3 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.33B/s | 449.5ms | — | — | ~0 (native) | 204.0× | 1.37× |
| 🥈 | 🟢 | Rust AVX2 | 1.32B/s | 453.0ms | — | — | ~0 (native) | 202.4× | 1.36× |
| 🥉 | 🟢 | Node.js | 976.29M/s | 307.3ms | — | — | ~0 | 149.2× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 457.69M/s | 1.31s | 1.31s | 108.8MB | ~0 | 69.9× | 0.47× |
| 5 | ⚫ | Python | 6.55M/s | 1.83s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 303.0K/s | 2.0ms | 0.0ms | 106.2MB | 500 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 295.4K/s | 1.02s | 1.06s | 106.2MB | 4 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 287.2K/s | 1.04s | 1.08s | 106.0MB | 2 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (500 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.70B/s | — | — | — | ~0 (native) | 404.0× | 2.48× |
| 🥈 | 🟢 | Rust (generic) | 2.34B/s | — | — | — | ~0 (native) | 256.0× | 1.57× |
| 🥉 | 🟢 | Node.js | 1.49B/s | — | — | — | — | 163.2× | 1.00× |
| 4 | ⚫ | Python | 9.15M/s | — | — | — | — | 1.00× | 0.01× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 377.67M/s | 132.4ms | — | — | ~0 | 115.0× | 1.00× |
| 🥈 | ⚫ | Python | 3.28M/s | 913.3ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 244.3K/s | 0.9ms | 0.0ms | 104.8MB | -4.2 KB/op | 0.07× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 197.0K/s | 50.8ms | 78.0ms | 104.5MB | 68 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 193.1K/s | 51.8ms | 63.0ms | 104.7MB | 120 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.2 KB/op) · **highest:** Galerina governed ⟨interp⟩ (120 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 261.28M/s | 7.7ms | 0.0ms | 66.3MB | ~0 | 190.6× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 53.58M/s | 1.87s | 1.86s | 107.9MB | ~0 | 39.1× | 0.21× |
| 🥉 | ⚫ | Python | 1.37M/s | 729.5ms | 718.8ms | — | ~0 | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 51.0K/s | 0.1ms | 0.0ms | 107.0MB | 18.7 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 46.0K/s | 1.09s | 1.08s | 105.3MB | 30 B/op | 0.03× | 0.00× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 45.8K/s | 1.09s | 1.11s | 107.0MB | 26 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.26M/s | 53.6ms | 47.0ms | 67.2MB | ~0 | 122.5× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 25.52M/s | 1.28s | 1.28s | 107.5MB | ~0 | 25.6× | 0.21× |
| 🥉 | ⚫ | Python | 998.4K/s | 1.64s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 56.0K/s | 0.2ms | 0.0ms | 105.1MB | 19.2 KB/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 55.0K/s | 595.5ms | 609.0ms | 105.1MB | 17 B/op | 0.06× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 52.7K/s | 621.6ms | 656.0ms | 106.6MB | 68 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (19.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 2.81M/s | — | — | — | — | 6.56× | 1.00× |
| 🥈 | 🟡 | Python | 428.0K/s | — | — | — | 1 B/op | 1.00× | 0.15× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 8.7K/s | 0.7ms | 0.0ms | 113.9MB | 74.9 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 4.4K/s | 112.8ms | 218.0ms | 108.3MB | 3.1 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 4.4K/s | 113.4ms | 203.0ms | 113.9MB | 4.2 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (74.9 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 23.14M/s | 141.6ms | — | — | ~0 (native) | 171.5× | 3.44× |
| 🥈 | 🟢 | Rust AVX2 | 21.99M/s | 149.0ms | — | — | ~0 (native) | 162.9× | 3.26× |
| 🥉 | 🟢 | WASM ▶ production | 8.80M/s | 1.86s | 1.86s | 109.7MB | ~0 | 65.2× | 1.31× |
| 4 | 🟢 | Node.js | 6.74M/s | 486.5ms | 500.0ms | 67.0MB | ~0 | 49.9× | 1.00× |
| 5 | 🔴 | Python | 135.0K/s | 24.28s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 6.7K/s | 0.2ms | 0.0ms | 110.2MB | 139.5 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 6.7K/s | 2.46s | 2.55s | 110.2MB | 191 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 6.6K/s | 2.50s | 2.58s | 107.4MB | 74 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (139.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 369.38M/s | 27.1ms | — | — | ~0 (native) | 231.2× | 1.63× |
| 🥈 | 🟢 | Rust AVX2 | 369.33M/s | 27.1ms | — | — | ~0 (native) | 231.2× | 1.63× |
| 🥉 | 🟢 | Node.js | 227.17M/s | 44.0ms | 47.0ms | 67.0MB | ~0 | 142.2× | 1.00× |
| 4 | ⚫ | Python | 1.60M/s | 6.26s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 562.02M/s | 1.21s | 1.19s | 112.3MB | ~0 | 149.1× | 7.76× |
| 🥈 | 🟢 | Node.js | 72.39M/s | 1.9ms | 0.0ms | 67.1MB | 3 B/op | 19.2× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 15.66M/s | 8.7ms | — | — | ~0 (native) | 4.15× | 0.22× |
| 4 | 🟡 | Rust (generic) | 14.65M/s | 9.3ms | — | — | ~0 (native) | 3.89× | 0.20× |
| 5 | 🔴 | Python | 3.77M/s | 36.0ms | 31.3ms | — | ~0 | 1.00× | 0.05× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 365.4K/s | 0.1ms | 0.0ms | 109.2MB | 2.2 KB/op | 0.10× | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 316.2K/s | 429.7ms | 437.0ms | 109.3MB | 2 B/op | 0.08× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 314.5K/s | 431.9ms | 438.0ms | 109.2MB | 16 B/op | 0.08× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 156.7K/s | 1.91s | — | — | ~0 (native) | 2.53× | 3.96× |
| 🥈 | 🟢 | Rust AVX2 | 155.4K/s | 1.93s | — | — | ~0 (native) | 2.51× | 3.93× |
| 🥉 | 🟢 | Python | 61.8K/s | 1.62s | — | — | ~0 | 1.00× | 1.56× |
| 4 | 🟢 | Node.js | 39.6K/s | 7.58s | 9.31s | 82.9MB | 7 B/op | 0.64× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (7 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 119.7K/s | 1.67s | 2.53s | 93.5MB | 72 B/op | 1.10× | 1.00× |
| 🥈 | 🟢 | Python | 108.7K/s | 1.84s | — | — | ~0 | 1.00× | 0.91× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (72 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.24s | 1.22× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.25s | 1.22× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 967.44M/s | 516.8ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 456.89M/s | 1.09s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.50M/s | 9.10s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 3.86M/s | 25.9ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 356.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 319.4K/s | 313.0ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 313.0K/s | 319.5ms | 0.00× |

**GPU execution status (archived run):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | no archived GPU execution |
| Node.js | WebGPU | 🖥️ CPU only | ⏳ toolchain required (no navigator.gpu in Node.js) |
| Deno | WebGPU (built-in) | 🎮 GPU (NVIDIA GeForce RTX 2060) | ✅ available — real GPU dispatch detected (Phase 38 ready) |
| **Galerina** | WebGPUComputePlan → WGSL | 🖥️ CPU (GPU pending) | ❌ **pending Phase 38** — stub only, no measured number (by design) |

> Per the project's honesty rule (same as the Runtime-in-Galerina 0% metric): no GPU number is shown until a backend actually executes. Galerina's real result on this workload is its **WASM/CPU** row above.
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

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **189× slower** | **63× slower** | **76× slower** | **79× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **419× slower** | **44.8K× slower** | **298× slower** | **300× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | 1.1× slower | **🏆 winner** | **28× slower** | **910× slower** | **3.0K× slower** | **1.7K× slower** | **1.7K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust (generic) | **🏆 winner** | **🏆 winner** | **19× slower** | **370× slower** | **145× slower** | **203× slower** | **615× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **138× slower** | **137× slower** | **542× slower** | **17.0K× slower** | **🏆 winner** | **4.5K× slower** | **6.8K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **98× slower** | **2.9K× slower** | **3.0K× slower** | **3.0K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **192× slower** | **1.4K× slower** | **1.6K× slower** | **6.5K× slower** | **5.7K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **31× slower** | **31× slower** | **41× slower** | not run | **402× slower** | **8.0K× slower** | **9.4K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | 9× slower | **2.1K× slower** | **39.5K× slower** | **56.8K× slower** | **48.8K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.2× slower | **214× slower** | **3.3K× slower** | **3.8K× slower** | **3.7K× slower** | 3× slower | **305× slower** |
| **matrix-multiply** | Python | **20× slower** | **18× slower** | **46× slower** | **🏆 winner** | **32.7K× slower** | **47.0K× slower** | **40.9K× slower** | **64× slower** | **17× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **25× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **29× slower** | **103× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.4× slower | **204× slower** | **4.4K× slower** | **4.5K× slower** | **4.6K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 2× slower | 2× slower | **404× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **115× slower** | **1.5K× slower** | **1.9K× slower** | **2.0K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **191× slower** | **5.1K× slower** | **5.7K× slower** | **5.7K× slower** | 5× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **122× slower** | **2.2K× slower** | **2.2K× slower** | **2.3K× slower** | 5× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 7× slower | **324× slower** | **634× slower** | **637× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust (generic) | 1.1× slower | **🏆 winner** | 3× slower | **171× slower** | **3.4K× slower** | **3.5K× slower** | **3.5K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **231× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **36× slower** | **38× slower** | 8× slower | **149× slower** | **1.5K× slower** | **1.8K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 1.1× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 132.80M/s | 🏆 winner | 189× faster |
| 🥈 | Rust (generic) | 130.33M/s | 1.0× slower | 186× faster |
| 🥉 | Rust AVX2 | 128.26M/s | 1.0× slower | 183× faster |
| 4 | WASM ▶ production | 74.69M/s | 1.8× slower | 106× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 2.12M/s | 63× slower | 3.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.75M/s | 76× slower | 2.5× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.68M/s | 79× slower | 2.4× faster |
| 8 | Python | 701.9K/s | 189× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.56B/s | 🏆 winner | 44.8K× faster |
| 🥈 | Rust (generic) | 1.56B/s | 1.0× slower | 44.8K× faster |
| 🥉 | Node.js | 978.70M/s | 1.6× slower | 28.1K× faster |
| 4 | WASM ▶ production | 477.12M/s | 3.3× slower | 13.7K× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.24M/s | 298× slower | 150× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.20M/s | 300× slower | 149× faster |
| 7 | Python | 3.73M/s | 419× slower | 107× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 34.9K/s | 44.8K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.85M/s | 🏆 winner | 3.0K× faster |
| 🥈 | Rust AVX2 | 73.18M/s | 1.1× slower | 2.8K× faster |
| 🥉 | WASM ▶ production | 35.77M/s | 2.2× slower | 1.4K× faster |
| 4 | Node.js | 2.74M/s | 28× slower | 104× faster |
| 5 | Python | 85.5K/s | 910× slower | 3.3× faster |
| 6 | Galerina manifest ⟨interp⟩ | 44.9K/s | 1.7K× slower | 1.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 44.8K/s | 1.7K× slower | 1.7× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 26.3K/s | 3.0K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.16B/s | 🏆 winner | 615× faster |
| 🥈 | Rust AVX2 | 1.16B/s | 1.0× slower | 614× faster |
| 🥉 | WASM ▶ production | 548.13M/s | 2.1× slower | 289× faster |
| 4 | Node.js | 61.46M/s | 19× slower | 32× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.03M/s | 145× slower | 4.2× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.75M/s | 203× slower | 3.0× faster |
| 7 | Python | 3.15M/s | 370× slower | 1.7× faster |
| 8 | Galerina governed ⟨interp⟩ | 1.89M/s | 615× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.1K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 67.8K/s | 🏆 winner | 17.0K× faster |
| 🥈 | WASM ▶ production | 17.1K/s | 4.0× slower | 4.3K× faster |
| 🥉 | Rust (generic) | 496.4/s | 137× slower | 124× faster |
| 4 | Rust AVX2 | 491.0/s | 138× slower | 123× faster |
| 5 | Node.js | 125.1/s | 542× slower | 31× faster |
| 6 | Galerina manifest ⟨interp⟩ | 15.0/s | 4.5K× slower | 3.8× faster |
| 7 | Galerina governed ⟨interp⟩ | 10.0/s | 6.8K× slower | 2.5× faster |
| 8 | Python | 4.0/s | 17.0K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 250.36M/s | 🏆 winner | 3.0K× faster |
| 🥈 | Rust (generic) | 249.25M/s | 1.0× slower | 3.0K× faster |
| 🥉 | Node.js | 128.93M/s | 1.9× slower | 1.6K× faster |
| 4 | WASM ▶ production | 118.49M/s | 2.1× slower | 1.4K× faster |
| 5 | Python | 2.57M/s | 98× slower | 31× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 85.9K/s | 2.9K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 83.5K/s | 3.0K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 82.6K/s | 3.0K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.24B/s | 🏆 winner | 6.5K× faster |
| 🥈 | Rust (generic) | 4.20B/s | 3.2× slower | 2.1K× faster |
| 🥉 | WASM ▶ production | 411.33M/s | 32× slower | 202× faster |
| 4 | Node.js | 69.00M/s | 192× slower | 34× faster |
| 5 | Python | 9.50M/s | 1.4K× slower | 4.7× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.17M/s | 1.6K× slower | 4.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.32M/s | 5.7K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.04M/s | 6.5K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 36.33M/s | 🏆 winner | 9.4K× faster |
| 🥈 | Rust AVX2 | 1.17M/s | 31× slower | 305× faster |
| 🥉 | Rust (generic) | 1.17M/s | 31× slower | 304× faster |
| 4 | Node.js | 878.0K/s | 41× slower | 228× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 90.3K/s | 402× slower | 23× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.5K/s | 8.0K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 3.8K/s | 9.4K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.03B/s | 🏆 winner | 56.8K× faster |
| 🥈 | Rust (generic) | 1.32B/s | 4.6× slower | 12.5K× faster |
| 🥉 | Node.js | 708.43M/s | 8.5× slower | 6.7K× faster |
| 4 | WASM ▶ production | 457.76M/s | 13× slower | 4.3K× faster |
| 5 | Python | 2.81M/s | 2.1K× slower | 26× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 152.8K/s | 39.5K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 123.6K/s | 48.8K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 106.1K/s | 56.8K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 3.8K× faster |
| 🥈 | Rust (generic) | 1.18B/s | 1.0× slower | 3.8K× faster |
| 🥉 | Node.js | 967.44M/s | 1.2× slower | 3.1K× faster |
| 4 | WASM ▶ production | 456.89M/s | 2.6× slower | 1.5K× faster |
| 5 | Python | 5.50M/s | 214× slower | 18× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 3.86M/s | 305× slower | 12× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 356.0K/s | 3.3K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 319.4K/s | 3.7K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 313.0K/s | 3.8K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 27.58B/s | 🏆 winner | 47.0K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.64B/s | 17× slower | 2.8K× faster |
| 🥉 | Rust (generic) | 1.50B/s | 18× slower | 2.5K× faster |
| 4 | Rust AVX2 | 1.41B/s | 20× slower | 2.4K× faster |
| 5 | Node.js | 605.30M/s | 46× slower | 1.0K× faster |
| 6 | WASM ▶ production | 432.92M/s | 64× slower | 737× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 843.8K/s | 32.7K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 674.5K/s | 40.9K× slower | 1.1× faster |
| 9 | Galerina manifest ⟨interp⟩ | 587.3K/s | 47.0K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.9K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 4.8K/s | 🏆 winner | 25× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.9K/s | 2.5× slower | 9.8× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 193.0/s | 25× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.3K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 68.6K/s | 🏆 winner | 103× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.3K/s | 29× slower | 3.5× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 667.0/s | 103× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.33B/s | 🏆 winner | 4.6K× faster |
| 🥈 | Rust AVX2 | 1.32B/s | 1.0× slower | 4.6K× faster |
| 🥉 | Node.js | 976.29M/s | 1.4× slower | 3.4K× faster |
| 4 | WASM ▶ production | 457.69M/s | 2.9× slower | 1.6K× faster |
| 5 | Python | 6.55M/s | 204× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 303.0K/s | 4.4K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 295.4K/s | 4.5K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 287.2K/s | 4.6K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.70B/s | 🏆 winner | 404× faster |
| 🥈 | Rust (generic) | 2.34B/s | 1.6× slower | 256× faster |
| 🥉 | Node.js | 1.49B/s | 2.5× slower | 163× faster |
| 4 | Python | 9.15M/s | 404× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 377.67M/s | 🏆 winner | 2.0K× faster |
| 🥈 | Python | 3.28M/s | 115× slower | 17× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 244.3K/s | 1.5K× slower | 1.3× faster |
| 4 | Galerina manifest ⟨interp⟩ | 197.0K/s | 1.9K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 193.1K/s | 2.0K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 261.28M/s | 🏆 winner | 5.7K× faster |
| 🥈 | WASM ▶ production | 53.58M/s | 4.9× slower | 1.2K× faster |
| 🥉 | Python | 1.37M/s | 191× slower | 30× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 51.0K/s | 5.1K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 46.0K/s | 5.7K× slower | 1.0× faster |
| 6 | Galerina manifest ⟨interp⟩ | 45.8K/s | 5.7K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.26M/s | 🏆 winner | 2.3K× faster |
| 🥈 | WASM ▶ production | 25.52M/s | 4.8× slower | 484× faster |
| 🥉 | Python | 998.4K/s | 122× slower | 19× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 56.0K/s | 2.2K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 55.0K/s | 2.2K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 52.7K/s | 2.3K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 2.81M/s | 🏆 winner | 637× faster |
| 🥈 | Python | 428.0K/s | 6.6× slower | 97× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 8.7K/s | 324× slower | 2.0× faster |
| 4 | Galerina manifest ⟨interp⟩ | 4.4K/s | 634× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 4.4K/s | 637× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 23.14M/s | 🏆 winner | 3.5K× faster |
| 🥈 | Rust AVX2 | 21.99M/s | 1.1× slower | 3.3K× faster |
| 🥉 | WASM ▶ production | 8.80M/s | 2.6× slower | 1.3K× faster |
| 4 | Node.js | 6.74M/s | 3.4× slower | 1.0K× faster |
| 5 | Python | 135.0K/s | 171× slower | 21× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 6.7K/s | 3.4K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 6.7K/s | 3.5K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 6.6K/s | 3.5K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 369.38M/s | 🏆 winner | 231× faster |
| 🥈 | Rust AVX2 | 369.33M/s | 1.0× slower | 231× faster |
| 🥉 | Node.js | 227.17M/s | 1.6× slower | 142× faster |
| 4 | Python | 1.60M/s | 231× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 562.02M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 72.39M/s | 7.8× slower | 230× faster |
| 🥉 | Rust AVX2 | 15.66M/s | 36× slower | 50× faster |
| 4 | Rust (generic) | 14.65M/s | 38× slower | 47× faster |
| 5 | Python | 3.77M/s | 149× slower | 12× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 365.4K/s | 1.5K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 316.2K/s | 1.8K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 314.5K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 156.7K/s | 🏆 winner | 4.0× faster |
| 🥈 | Rust AVX2 | 155.4K/s | 1.0× slower | 3.9× faster |
| 🥉 | Python | 61.8K/s | 2.5× slower | 1.6× faster |
| 4 | Node.js | 39.6K/s | 4.0× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 119.7K/s | 🏆 winner | 1.1× faster |
| 🥈 | Python | 108.7K/s | 1.1× slower | — (slowest) |


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

