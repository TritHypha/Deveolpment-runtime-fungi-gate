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
| compute-mix | 75.04M/s | ⚪ 1.8× slower | ⚪ 1.8× slower | 1.59M/s | WASM near native |
| arithmetic-threshold | 489.53M/s | UNCERTIFIED | UNCERTIFIED | 5.05M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.43M/s | UNCERTIFIED | UNCERTIFIED | 44.8K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.2K/s | UNCERTIFIED | UNCERTIFIED | 12.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 121.55M/s | 🟡 2.1× slower | 🟢 1.1× slower | 82.4K/s | WASM usable |
| hardware-targets | 36.32M/s | UNCERTIFIED | UNCERTIFIED | 4.0K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 439.66M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 713.0K/s | WASM usable |
| tri-logic | 467.19M/s | 🟡 3.0× slower | 🟡 2.1× slower | 306.3K/s | WASM usable |
| verified-native-operation | no WASM build | — | — | not run | WASM not built for this lane yet |
| data-query | no WASM build | — | — | 203.1K/s | WASM not built for this lane yet |
| call-chain | 54.12M/s | 🟡 2.9× slower | 🟢 1.3× | 48.7K/s | WASM usable |
| nbody | 28.90M/s | — | 🟡 4.3× slower | 56.7K/s | WASM 2–10× under Node |
| mandelbrot | 9.03M/s | 🟡 2.6× slower | 🟢 1.4× | 7.2K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Python — 28.19B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 8 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 21 B/op | 43 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 4 B/op | 16 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust (generic) | 1.18B/s | 467.31M/s | 4.17M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Python | 28.19B/s | 439.66M/s | 1.63B/s | ⚪ 1.4× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (190.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 190.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (840.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 840.0/s |
| json-parse | records/s | **Node.js** (3.05M/s) | 3.05M/s | 502.0K/s | not run — no native impl | no WASM — strings/records | 4.9K/s |
| spore-container | containers/s | **Rust (generic)** (158.5K/s) | 42.2K/s | 62.4K/s | 158.5K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (127.6K/s) | 127.6K/s | 107.0K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.5K/s) | 3.5K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.4K/s) | 6.4K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (17.6K/s) | 17.6K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (107.4K/s) | 107.4K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (731.0/s) | 731.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 643.0/s | 906.0/s | 2.87M/s | 0.71× governed/manifest (gov overhead ≈ 1.41×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **129.35M/s** | **131.54M/s** | not run — no C++ impl | **134.65M/s** | 722.3K/s | 1.93M/s | 1.72M/s | 1.59M/s | 75.04M/s | not run — no GPU path | 84.8× |
| arithmetic-threshold | not run — no AVX-512 | **1.57B/s** | **1.57B/s** | not run — no C++ impl | 929.24M/s | 3.75M/s | 35.8K/s | 5.20M/s | 5.05M/s | 489.53M/s | not run — no GPU path | 183.9× |
| six-digit-guess | not run — no AVX-512 | 70.84M/s | **77.55M/s** | not run — no C++ impl | 2.76M/s | 86.0K/s | 24.1K/s | 46.0K/s | 44.8K/s | 36.43M/s | not run — no GPU path | 61.6× |
| record-allocation | not run — no AVX-512 | **1.17B/s** | **1.17B/s** | not run — no C++ impl | 57.24M/s | 3.57M/s | 8.06M/s | 2.24M/s | 2.36M/s | 542.58M/s | not run — no GPU path | 24.3× |
| fibonacci-recursive | not run — no AVX-512 | 499.1/s | 495.3/s | not run — no C++ impl | 127.1/s | 3.9/s | **73.6K/s** | 17.0/s | 12.0/s | 17.2K/s | not run — no GPU path | 10.6× |
| tower-of-hanoi | not run — no AVX-512 | **244.02M/s** | **252.26M/s** | not run — no C++ impl | 129.76M/s | 2.37M/s | 85.2K/s | 84.2K/s | 82.4K/s | 121.55M/s | not run — no GPU path | 1.6K× |
| collection-pipeline | not run — no AVX-512 | **13.29B/s** | 4.32B/s | not run — no C++ impl | 71.60M/s | 9.49M/s | 8.25M/s | 2.08M/s | 2.22M/s | 416.74M/s | not run — no GPU path | 32.3× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.17M/s | 1.18M/s | not run — no C++ impl | 899.0K/s | not run | 85.4K/s | 2.9K/s | 4.0K/s | **36.32M/s** | not run — no GPU path | 224.7× |
| low-memory | not run — no AVX-512 | **6.11B/s** | 1.35B/s | not run — no C++ impl | 724.06M/s | 2.63M/s | 155.7K/s | 114.1K/s | 126.9K/s | 469.03M/s | not run — no GPU path | 5.7K× |
| gpu-compute | not run — no AVX-512 | **1.18B/s** | **1.18B/s** | not run — no C++ impl | 987.46M/s | 5.26M/s | 356.0K/s | 305.5K/s | 311.7K/s | 467.31M/s | 4.17M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.43B/s | 1.51B/s | not run — no C++ impl | 618.31M/s | **28.19B/s** | 880.5K/s | 611.9K/s | 713.0K/s | 439.66M/s | 1.63B/s | 867.2× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.5K/s** | 1.5K/s | 190.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **63.2K/s** | 2.4K/s | 840.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.38B/s** | **1.38B/s** | not run — no C++ impl | 993.36M/s | 6.48M/s | 306.0K/s | 302.2K/s | 306.3K/s | 467.19M/s | not run — no GPU path | 3.2K× |
| verified-native-operation | not run — no AVX-512 | **3.31B/s** | 2.32B/s | not run — no C++ impl | 1.98B/s | 8.90M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **387.15M/s** | 3.11M/s | 256.7K/s | 205.8K/s | 203.1K/s | no WASM build | not run — no GPU path | 1.9K× |
| call-chain | not run — no AVX-512 | **154.42M/s** | **153.14M/s** | not run — no C++ impl | 42.26M/s | 1.27M/s | 52.5K/s | 48.3K/s | 48.7K/s | 54.12M/s | not run — no GPU path | 868.5× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.98M/s** | 972.6K/s | 57.7K/s | 57.5K/s | 56.7K/s | 28.90M/s | not run — no GPU path | 2.2K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.05M/s** | 502.0K/s | 8.9K/s | 4.7K/s | 4.9K/s | no WASM — strings/records | not run — no GPU path | 626.2× |
| mandelbrot | not run — no AVX-512 | **23.43M/s** | **23.43M/s** | not run — no C++ impl | 6.25M/s | 133.2K/s | 7.2K/s | 7.4K/s | 7.2K/s | 9.03M/s | not run — no GPU path | 872.0× |
| spectral-norm | not run — no AVX-512 | **373.36M/s** | **372.46M/s** | not run — no C++ impl | 241.12M/s | 1.52M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 14.50M/s | 16.49M/s | not run — no C++ impl | 78.76M/s | 2.88M/s | 372.2K/s | 336.2K/s | 317.1K/s | **584.53M/s** | not run — no GPU path | 248.4× |
| spore-container | not run — no AVX-512 | **158.2K/s** | **158.5K/s** | not run — no C++ impl | 42.2K/s | 62.4K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **127.6K/s** | 107.0K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -37.97 bytes/op ⚡ ~0 — no boxing | 155.7K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.11B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.35B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 724.06M/s | — | 8KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 469.03M/s | — | 41KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 2.63M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 21 bytes/op ⚠ moderate | 126.9K/s | — | 207KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 43 bytes/op ⚠ moderate | 114.1K/s | — | 428KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | Node.js | 66.9MB | 67.1MB | 5.0MB | 944KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 97.9MB | 97.9MB | 19.3MB | 110KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 93.7MB | 93.7MB | 22.9MB | 4.6MB |
| compute-mix | Galerina governed ⟨interp⟩ | 92.9MB | 92.9MB | 22.5MB | 4.5MB |
| compute-mix | WASM ▶ production | 93.9MB | 93.9MB | 18.3MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | Node.js | 66.4MB | 66.5MB | 4.5MB | 356KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 99.4MB | 99.4MB | 19.5MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 99.2MB | 99.2MB | 19.4MB | 850KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 99.1MB | 99.1MB | 19.4MB | 845KB |
| arithmetic-threshold | WASM ▶ production | 101.5MB | 101.5MB | 18.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | Node.js | 71.0MB | 71.0MB | 5.8MB | 1.1MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 101.3MB | 101.3MB | 20.3MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 100.9MB | 100.9MB | 19.4MB | -55KB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 100.7MB | 100.7MB | 19.4MB | 522KB |
| six-digit-guess | WASM ▶ production | 102.3MB | 102.3MB | 19.1MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 67.0MB | 67.0MB | 4.2MB | 102KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 101.0MB | 101.0MB | 20.0MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 101.0MB | 101.0MB | 19.4MB | 78KB |
| record-allocation | Galerina governed ⟨interp⟩ | 101.7MB | 101.7MB | 19.5MB | 60KB |
| record-allocation | WASM ▶ production | 103.2MB | 103.2MB | 19.7MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 65.1MB | 65.1MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 101.7MB | 101.7MB | 21.8MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 101.7MB | 101.7MB | 21.4MB | 1.8MB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 101.5MB | 101.5MB | 20.3MB | 752KB |
| fibonacci-recursive | WASM ▶ production | 104.1MB | 104.1MB | 19.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 65.2MB | 65.2MB | 4.1MB | 15KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 104.0MB | 104.0MB | 24.7MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 103.4MB | 103.4MB | 22.6MB | 4.0MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 103.3MB | 103.3MB | 21.9MB | 3.3MB |
| tower-of-hanoi | WASM ▶ production | 104.3MB | 104.3MB | 19.0MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 82.1MB | 82.1MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 103.9MB | 103.9MB | 19.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 103.9MB | 103.9MB | 18.8MB | 142KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 104.7MB | 104.7MB | 18.8MB | 168KB |
| collection-pipeline | WASM ▶ production | 106.6MB | 106.6MB | 19.0MB | 26KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 65.1MB | 65.1MB | 4.1MB | 27KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 105.7MB | 105.7MB | 19.8MB | 557KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 107.7MB | 107.7MB | 19.3MB | 487KB |
| governance-cost | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 19.3MB | 518KB |
| governance-cost | WASM ▶ production | 106.1MB | 106.1MB | 19.1MB | 50KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 67.0MB | 67.0MB | 4.5MB | 367KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 106.0MB | 106.0MB | 20.0MB | 299KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 104.7MB | 104.7MB | 19.0MB | 91KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 104.3MB | 104.3MB | 19.1MB | 95KB |
| hardware-targets | WASM ▶ production | 106.8MB | 106.8MB | 19.3MB | 74KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 65.3MB | 65.3MB | 4.1MB | 8KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 104.5MB | 104.5MB | 19.5MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 105.0MB | 105.0MB | 19.5MB | 428KB |
| low-memory | Galerina governed ⟨interp⟩ | 104.7MB | 104.7MB | 19.2MB | 207KB |
| low-memory | WASM ▶ production | 107.1MB | 107.1MB | 19.3MB | 41KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 65.4MB | 65.4MB | 4.1MB | 16KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 106.4MB | 106.4MB | 19.6MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 106.4MB | 106.4MB | 20.4MB | 1.2MB |
| gpu-compute | Galerina governed ⟨interp⟩ | 104.8MB | 104.8MB | 19.5MB | 353KB |
| gpu-compute | WASM ▶ production | 107.7MB | 107.7MB | 19.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 67.2MB | 67.2MB | 4.7MB | 520KB |
| matrix-multiply | Python | — | — | 17KB | 17KB |
| matrix-multiply | Galerina passive ⟨interp⟩ | 106.3MB | 106.3MB | 20.0MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 106.3MB | 106.3MB | 19.4MB | 177KB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 106.6MB | 106.6MB | 20.3MB | 1.1MB |
| matrix-multiply | WASM ▶ production | 107.8MB | 107.8MB | 19.5MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 80.0MB | 80.0MB | 8.0MB | 2.4MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 106.6MB | 106.6MB | 20.1MB | 67KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 105.9MB | 105.9MB | 19.5MB | 230KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 105.8MB | 105.8MB | 19.5MB | 346KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 486KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 107.2MB | 107.2MB | 20.4MB | -311KB |
| text-html | Galerina manifest ⟨interp⟩ | 106.7MB | 106.7MB | 19.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 106.6MB | 106.6MB | 19.8MB | 175KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 139KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 105.1MB | 105.1MB | 21.2MB | 268KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 107.1MB | 107.1MB | 20.8MB | 996KB |
| tri-logic | Galerina governed ⟨interp⟩ | 105.2MB | 105.2MB | 21.3MB | 1.6MB |
| tri-logic | WASM ▶ production | 109.5MB | 109.5MB | 20.1MB | 1KB |
| verified-native-operation | Rust AVX2 | — | — | — | — |
| verified-native-operation | Rust (generic) | — | — | — | — |
| verified-native-operation | Node.js | — | — | — | — |
| verified-native-operation | Python | — | — | — | — |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 105.8MB | 105.8MB | 20.9MB | -930KB |
| data-query | Galerina manifest ⟨interp⟩ | 107.8MB | 107.8MB | 20.4MB | 449KB |
| data-query | Galerina governed ⟨interp⟩ | 106.3MB | 106.3MB | 21.7MB | 1.7MB |
| call-chain | Rust AVX2 | — | — | — | — |
| call-chain | Rust (generic) | — | — | — | — |
| call-chain | Node.js | 65.3MB | 65.3MB | 4.1MB | 14KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 109.0MB | 109.0MB | 23.7MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 111.0MB | 111.0MB | 25.2MB | 2.7MB |
| call-chain | Galerina governed ⟨interp⟩ | 108.5MB | 108.5MB | 25.3MB | 2.8MB |
| call-chain | WASM ▶ production | 110.0MB | 110.0MB | 20.3MB | 1KB |
| nbody | Node.js | 67.4MB | 67.4MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 111.5MB | 111.5MB | 23.6MB | 237KB |
| nbody | Galerina manifest ⟨interp⟩ | 110.9MB | 110.9MB | 23.1MB | 587KB |
| nbody | Galerina governed ⟨interp⟩ | 110.9MB | 110.9MB | 24.4MB | 1.8MB |
| nbody | WASM ▶ production | 111.7MB | 111.7MB | 22.8MB | 1KB |
| json-parse | Node.js | — | — | — | 255KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 119.2MB | 119.2MB | 24.3MB | 432KB |
| json-parse | Galerina manifest ⟨interp⟩ | 115.4MB | 115.4MB | 26.6MB | 3.5MB |
| json-parse | Galerina governed ⟨interp⟩ | 115.1MB | 115.1MB | 23.8MB | 1.3MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 67.1MB | 67.1MB | 4.8MB | 678KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 113.9MB | 113.9MB | 26.6MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 113.9MB | 113.9MB | 26.1MB | 3.2MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 113.0MB | 113.0MB | 24.4MB | 1.2MB |
| mandelbrot | WASM ▶ production | 117.1MB | 117.1MB | 23.4MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 67.3MB | 67.3MB | 4.4MB | 294KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 67.1MB | 67.1MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 113.1MB | 113.1MB | 26.0MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 113.1MB | 113.1MB | 25.1MB | 2.1MB |
| binary-trees | Galerina governed ⟨interp⟩ | 112.9MB | 112.9MB | 23.5MB | 525KB |
| binary-trees | WASM ▶ production | 116.0MB | 116.0MB | 23.2MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 82.9MB | 82.9MB | 9.3MB | 2.0MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 93.8MB | 93.8MB | 20.2MB | 13.7MB |
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
| compute-mix | Node.js | 5.00s | 5.00s | 100% | 134.7K ops/CPU-ms |
| compute-mix | Python | 5.05s | 5.06s | 100% | 720.99 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 29.1ms | 93.0ms | 319% | 537.63 ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 31.5ms | 32.0ms | 102% | 1.6K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.33s | 1.33s | 100% | 75.3K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.8ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.8ms | — | — | — |
| arithmetic-threshold | Node.js | 21.5ms | 15.0ms | 70% | 1.33M ops/CPU-ms |
| arithmetic-threshold | Python | 5.33s | 5.31s | 100% | 3.8K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 12.2ms | 16.0ms | 131% | 4.0K ops/CPU-ms |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.5ms | 15.0ms | 120% | 4.2K ops/CPU-ms |
| arithmetic-threshold | WASM ▶ production | 1.03s | 1.03s | 100% | 490.8K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | Node.js | 15.2ms | 47.0ms | 308% | 895.13 ops/CPU-ms |
| six-digit-guess | Python | 489.4ms | 484.4ms | 99% | 86.85 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 914.0ms | 953.0ms | 104% | 44.14 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 938.1ms | 984.0ms | 105% | 42.75 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.15s | 1.16s | 100% | 36.4K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.6ms | — | — | — |
| record-allocation | Node.js | 3.5ms | 32.0ms | 916% | 6.3K ops/CPU-ms |
| record-allocation | Python | 56.1ms | 62.5ms | 111% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 4.5ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 4.2ms | 31.0ms | 731% | 322.58 ops/CPU-ms |
| record-allocation | WASM ▶ production | 1.01s | 1.03s | 102% | 533.5K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 400.8ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 403.8ms | — | — | — |
| fibonacci-recursive | Node.js | 786.7ms | 781.0ms | 99% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 5.12s | 5.13s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 58.6ms | 63.0ms | 108% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 83.9ms | 140.0ms | 167% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.05s | 1.03s | 99% | 17.46 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 537.1ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 519.6ms | — | — | — |
| tower-of-hanoi | Node.js | 101.0ms | 94.0ms | 93% | 139.4K ops/CPU-ms |
| tower-of-hanoi | Python | 553.3ms | 546.9ms | 99% | 2.4K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 778.5ms | 843.0ms | 108% | 77.74 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 795.8ms | 875.0ms | 110% | 74.90 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.08s | 1.08s | 100% | 121.5K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 75.3ms | — | — | — |
| collection-pipeline | Rust (generic) | 231.7ms | — | — | — |
| collection-pipeline | Node.js | 698.3ms | 719.0ms | 103% | 69.5K ops/CPU-ms |
| collection-pipeline | Python | 5.27s | 5.27s | 100% | 9.5K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.4ms | 16.0ms | 4520% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.8ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.5ms | 31.0ms | 687% | 322.58 ops/CPU-ms |
| collection-pipeline | WASM ▶ production | 1.01s | 1.02s | 101% | 413.4K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.2ms | — | — | — |
| governance-cost | Rust (generic) | 11.2ms | — | — | — |
| governance-cost | Node.js | 49.1ms | 78.0ms | 159% | — |
| governance-cost | Python | 5.15s | 5.14s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.7ms | 0.0ms | 0% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.02s | 102% | — |
| hardware-targets | Rust AVX2 | 851.3ms | — | — | — |
| hardware-targets | Rust (generic) | 850.7ms | — | — | — |
| hardware-targets | Node.js | 1.11s | 1.13s | 101% | 888.89 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 11.7ms | 62.0ms | 529% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.00s | 100% | 36.3K ops/CPU-ms |
| low-memory | Rust AVX2 | 163.5ms | — | — | — |
| low-memory | Rust (generic) | 738.7ms | — | — | — |
| low-memory | Node.js | 69.1ms | 78.0ms | 113% | 641.0K ops/CPU-ms |
| low-memory | Python | 3.80s | 3.80s | 100% | 2.6K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 87.6ms | 141.0ms | 161% | 70.92 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 78.8ms | 93.0ms | 118% | 107.53 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.00s | 1.00s | 100% | 470.0K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.24s | — | — | — |
| gpu-compute | Rust (generic) | 4.24s | — | — | — |
| gpu-compute | Node.js | 506.3ms | 500.0ms | 99% | 1000.0K ops/CPU-ms |
| gpu-compute | Python | 9.51s | 9.52s | 100% | 5.3K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 327.3ms | 328.0ms | 100% | 304.88 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 320.9ms | 360.0ms | 112% | 277.78 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.07s | 1.08s | 101% | 463.8K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 24.0ms | — | — | — |
| matrix-multiply | Rust AVX2 | 91.7ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.6ms | — | — | — |
| matrix-multiply | Node.js | 212.0ms | 203.0ms | 96% | 645.7K ops/CPU-ms |
| matrix-multiply | Python | 0.5ms | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 53.5ms | 110.0ms | 205% | 297.89 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 46.0ms | 94.0ms | 205% | 348.60 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.04s | 1.05s | 100% | 438.6K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.9ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 18.3ms | 47.0ms | 257% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.7ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 5.3ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 433.4ms | — | — | — |
| tri-logic | Rust (generic) | 433.8ms | — | — | — |
| tri-logic | Node.js | 302.0ms | — | — | — |
| tri-logic | Python | 1.85s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 992.8ms | 1.03s | 104% | 290.98 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 979.4ms | 1.00s | 102% | 300.00 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.28s | 1.28s | 100% | 468.0K ops/CPU-ms |
| data-query | Node.js | 129.1ms | — | — | — |
| data-query | Python | 963.8ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 48.6ms | 141.0ms | 290% | 70.92 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 49.2ms | 62.0ms | 126% | 161.29 ops/CPU-ms |
| call-chain | Rust AVX2 | 0.3ms | — | — | — |
| call-chain | Rust (generic) | 0.3ms | — | — | — |
| call-chain | Node.js | 1.2ms | 0.0ms | 0% | — |
| call-chain | Python | 39.5ms | 31.3ms | 79% | 1.6K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 1.03s | 1.03s | 100% | 48.50 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.03s | 1.03s | 100% | 48.50 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.85s | 1.84s | 100% | 54.2K ops/CPU-ms |
| nbody | Node.js | 53.3ms | 63.0ms | 118% | 104.0K ops/CPU-ms |
| nbody | Python | 1.68s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 570.1ms | 625.0ms | 110% | 52.43 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 578.4ms | 609.0ms | 105% | 53.81 ops/CPU-ms |
| nbody | WASM ▶ production | 1.13s | 1.13s | 99% | 29.1K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 106.2ms | 156.0ms | 147% | 3.20 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 102.6ms | 188.0ms | 183% | 2.66 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.9ms | — | — | — |
| mandelbrot | Rust (generic) | 139.9ms | — | — | — |
| mandelbrot | Node.js | 524.3ms | 547.0ms | 104% | 6.0K ops/CPU-ms |
| mandelbrot | Python | 24.60s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.22s | 2.28s | 103% | 7.18 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.29s | 2.30s | 100% | 7.14 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.82s | 1.81s | 100% | 9.0K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.8ms | — | — | — |
| spectral-norm | Rust (generic) | 26.8ms | — | — | — |
| spectral-norm | Node.js | 41.5ms | 31.0ms | 75% | 322.6K ops/CPU-ms |
| spectral-norm | Python | 6.56s | — | — | — |
| binary-trees | Rust AVX2 | 9.4ms | — | — | — |
| binary-trees | Rust (generic) | 8.2ms | — | — | — |
| binary-trees | Node.js | 1.7ms | 0.0ms | 0% | — |
| binary-trees | Python | 47.1ms | 46.9ms | 99% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 404.1ms | 484.0ms | 120% | 280.69 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 428.4ms | 437.0ms | 102% | 310.88 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.16s | 1.16s | 99% | 587.6K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.90s | — | — | — |
| spore-container | Rust (generic) | 1.89s | — | — | — |
| spore-container | Node.js | 7.11s | 8.30s | 117% | 36.16 ops/CPU-ms |
| spore-container | Python | 1.60s | — | — | — |
| framework-pipeline | Node.js | 1.57s | 2.41s | 154% | 83.09 ops/CPU-ms |
| framework-pipeline | Python | 1.87s | — | — | — |
| http-throughput | Node.js | 85.0ms | — | — | — |
| naming-check | Node.js | 481.0ms | — | — | — |
| context-receipt | Node.js | 330.0ms | — | — | — |
| intelligence-search | Node.js | 47.0ms | — | — | — |
| provenance-trace | Node.js | 2.12s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 134.65M/s | 5.00s | 5.00s | 66.9MB | ~0 | 186.4× | 1.00× |
| 🥈 | 🟢 | Rust (generic) | 131.54M/s | 5.00s | — | — | ~0 (native) | 182.1× | 0.98× |
| 🥉 | 🟢 | Rust AVX2 | 129.35M/s | 5.00s | — | — | ~0 (native) | 179.1× | 0.96× |
| 4 | ⚪ | WASM ▶ production | 75.04M/s | 1.33s | 1.33s | 93.9MB | ~0 | 103.9× | 0.56× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 1.93M/s | 0.4ms | 0.0ms | 97.9MB | 155 B/op | 2.67× | 0.01× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 1.72M/s | 29.1ms | 93.0ms | 93.7MB | 91 B/op | 2.38× | 0.01× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 1.59M/s | 31.5ms | 32.0ms | 92.9MB | 90 B/op | 2.20× | 0.01× |
| 8 | ⚫ | Python | 722.3K/s | 5.05s | 5.06s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (155 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.57B/s | 12.8ms | — | — | ~0 (native) | 417.4× | 1.69× |
| 🥈 | 🟢 | Rust AVX2 | 1.57B/s | 12.8ms | — | — | ~0 (native) | 417.1× | 1.68× |
| 🥉 | 🟢 | Node.js | 929.24M/s | 21.5ms | 15.0ms | 66.4MB | ~0 | 247.6× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 489.53M/s | 1.03s | 1.03s | 101.5MB | ~0 | 130.4× | 0.53× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.20M/s | 12.2ms | 16.0ms | 99.2MB | 13 B/op | 1.38× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 5.05M/s | 12.5ms | 15.0ms | 99.1MB | 13 B/op | 1.35× | 0.01× |
| 7 | ⚫ | Python | 3.75M/s | 5.33s | 5.31s | — | ~0 | 1.00× | 0.00× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 35.8K/s | 0.1ms | 0.0ms | 99.4MB | 18.5 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.55M/s | 0.5ms | — | — | ~0 (native) | 902.1× | 28.1× |
| 🥈 | 🟢 | Rust AVX2 | 70.84M/s | 0.6ms | — | — | ~0 (native) | 824.1× | 25.7× |
| 🥉 | 🟢 | WASM ▶ production | 36.43M/s | 1.15s | 1.16s | 102.3MB | ~0 | 423.8× | 13.2× |
| 4 | 🟢 | Node.js | 2.76M/s | 15.2ms | 47.0ms | 71.0MB | 26 B/op | 32.1× | 1.00× |
| 5 | 🔴 | Python | 86.0K/s | 489.4ms | 484.4ms | — | ~0 | 1.00× | 0.03× |
| 6 | 🔴 | Galerina manifest ⟨interp⟩ | 46.0K/s | 914.0ms | 953.0ms | 100.9MB | -1 B/op | 0.54× | 0.02× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 44.8K/s | 938.1ms | 984.0ms | 100.7MB | 12 B/op | 0.52× | 0.02× |
| 8 | ⚫ | Galerina passive ⟨interp⟩ | 24.1K/s | 0.1ms | 0.0ms | 101.3MB | 32.5 KB/op | 0.28× | 0.01× |

> 🧠 **Lowest heap/op:** Galerina manifest ⟨interp⟩ (-1 B/op) · **highest:** Galerina passive ⟨interp⟩ (32.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.17B/s | 8.5ms | — | — | ~0 (native) | 328.4× | 20.5× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 8.6ms | — | — | ~0 (native) | 327.6× | 20.4× |
| 🥉 | 🟢 | WASM ▶ production | 542.58M/s | 1.01s | 1.03s | 103.2MB | ~0 | 152.1× | 9.48× |
| 4 | 🟢 | Node.js | 57.24M/s | 3.5ms | 32.0ms | 67.0MB | ~0 | 16.0× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.06M/s | 0.2ms | 0.0ms | 101.0MB | 137 B/op | 2.26× | 0.14× |
| 6 | 🔴 | Python | 3.57M/s | 56.1ms | 62.5ms | — | ~0 | 1.00× | 0.06× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.36M/s | 4.2ms | 31.0ms | 101.7MB | 6 B/op | 0.66× | 0.04× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.24M/s | 4.5ms | 0.0ms | 101.0MB | 8 B/op | 0.63× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (137 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 73.6K/s | 0.1ms | 0.0ms | 101.7MB | 11.9 KB/op | 18.9K× | 579.3× |
| 🥈 | 🟢 | WASM ▶ production | 17.2K/s | 1.05s | 1.03s | 104.1MB | ~0 | 4.4K× | 135.3× |
| 🥉 | 🟢 | Rust AVX2 | 499.1/s | 400.8ms | — | — | ~0 (native) | 128.0× | 3.93× |
| 4 | 🟢 | Rust (generic) | 495.3/s | 403.8ms | — | — | ~0 (native) | 127.0× | 3.90× |
| 5 | 🟢 | Node.js | 127.1/s | 786.7ms | 781.0ms | 65.1MB | 53 B/op | 32.6× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 17.0/s | 58.6ms | 63.0ms | 101.7MB | 1773.4 KB/op | 4.36× | 0.13× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 12.0/s | 83.9ms | 140.0ms | 101.5MB | 729.7 KB/op | 3.08× | 0.09× |
| 8 | 🔴 | Python | 3.9/s | 5.12s | 5.13s | — | 23 B/op | 1.00× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina manifest ⟨interp⟩ (1773.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 252.26M/s | 519.6ms | — | — | ~0 (native) | 106.5× | 1.94× |
| 🥈 | 🟢 | Rust AVX2 | 244.02M/s | 537.1ms | — | — | ~0 (native) | 103.0× | 1.88× |
| 🥉 | 🟢 | Node.js | 129.76M/s | 101.0ms | 94.0ms | 65.2MB | ~0 | 54.8× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 121.55M/s | 1.08s | 1.08s | 104.3MB | ~0 | 51.3× | 0.94× |
| 5 | 🔴 | Python | 2.37M/s | 553.3ms | 546.9ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 85.2K/s | 0.1ms | 0.0ms | 104.0MB | 9.2 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 84.2K/s | 778.5ms | 843.0ms | 103.4MB | 61 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 82.4K/s | 795.8ms | 875.0ms | 103.3MB | 50 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (9.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.29B/s | 75.3ms | — | — | ~0 (native) | 1.4K× | 185.6× |
| 🥈 | 🟢 | Rust (generic) | 4.32B/s | 231.7ms | — | — | ~0 (native) | 454.8× | 60.3× |
| 🥉 | 🟢 | WASM ▶ production | 416.74M/s | 1.01s | 1.02s | 106.6MB | ~0 | 43.9× | 5.82× |
| 4 | 🟢 | Node.js | 71.60M/s | 698.3ms | 719.0ms | 82.1MB | ~0 | 7.55× | 1.00× |
| 5 | 🟡 | Python | 9.49M/s | 5.27s | 5.27s | — | ~0 | 1.00× | 0.13× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 8.25M/s | 0.4ms | 16.0ms | 103.9MB | 130 B/op | 0.87× | 0.12× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.22M/s | 4.5ms | 31.0ms | 104.7MB | 17 B/op | 0.23× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.08M/s | 4.8ms | 0.0ms | 103.9MB | 14 B/op | 0.22× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (130 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 891.21M/s | 11.2ms |
| Rust (generic) | 891.49M/s | 11.2ms |
| Node.js | 2.04M/s | 49.1ms |
| Python | 19.4K/s | 5.15s |
| Galerina passive ⟨interp⟩ | 1.7K/s | 1.7ms |
| Galerina manifest ⟨interp⟩ | 906.0/s | 1.1ms |
| Galerina governed ⟨interp⟩ | 643.0/s | 1.6ms |
| WASM ▶ production | 2.87M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 36.32M/s | 1.00s | 1.00s | 106.8MB | ~0 | — | 40.4× |
| 🥈 | 🟢 | Rust (generic) | 1.18M/s | 850.7ms | — | — | ~0 (native) | — | 1.31× |
| 🥉 | 🟢 | Rust AVX2 | 1.17M/s | 851.3ms | — | — | ~0 (native) | — | 1.31× |
| 4 | 🟢 | Node.js | 899.0K/s | 1.11s | 1.13s | 67.0MB | ~0 | — | 1.00× |
| 5 | 🔴 | Galerina passive ⟨interp⟩ | 85.4K/s | 11.7ms | 62.0ms | 106.0MB | 299 B/op | — | 0.09× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 4.0K/s | 0.3ms | 0.0ms | 104.3MB | 92.4 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 2.9K/s | 0.3ms | 0.0ms | 104.7MB | 89.1 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (92.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.11B/s | 163.5ms | — | — | ~0 | 2.3K× | 8.45× |
| 🥈 | 🟢 | Rust (generic) | 1.35B/s | 738.7ms | — | — | ~0 | 514.6× | 1.87× |
| 🥉 | 🟢 | Node.js | 724.06M/s | 69.1ms | 78.0ms | 65.3MB | ~0 | 275.3× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 469.03M/s | 1.00s | 1.00s | 107.1MB | ~0 | 178.3× | 0.65× |
| 5 | ⚫ | Python | 2.63M/s | 3.80s | 3.80s | — | ~0 | 1.00× | 0.00× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 155.7K/s | 0.6ms | 0.0ms | 104.5MB | -4.0 KB/op | 0.06× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 126.9K/s | 78.8ms | 93.0ms | 104.7MB | 21 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 114.1K/s | 87.6ms | 141.0ms | 105.0MB | 43 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.0 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (43 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 1.18B/s | 4.24s | — | — | ~0 (native) | 224.4× | 1.19× |
| 🥈 | 🟢 | Rust AVX2 | 1.18B/s | 4.24s | — | — | ~0 (native) | 224.4× | 1.19× |
| 🥉 | 🟢 | Node.js | 987.46M/s | 506.3ms | 500.0ms | 65.4MB | ~0 | 187.9× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 467.31M/s | 1.07s | 1.08s | 107.7MB | ~0 | 88.9× | 0.47× |
| 5 | ⚫ | Python | 5.26M/s | 9.51s | 9.52s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.17M/s | 24.0ms | — | — | — | 0.79× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 356.0K/s | 0.2ms | 0.0ms | 106.4MB | 3.1 KB/op | 0.07× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 311.7K/s | 320.9ms | 360.0ms | 104.8MB | 4 B/op | 0.06× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 305.5K/s | 327.3ms | 328.0ms | 106.4MB | 12 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.1 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Python | 28.19B/s | 0.5ms | — | — | 332 B/op | 1.00× | 45.6× |
| 🥈 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 12.9ms | — | — | — | 0.06× | 2.63× |
| 🥉 | 🟢 | Rust (generic) | 1.51B/s | 86.6ms | — | — | ~0 (native) | 0.05× | 2.45× |
| 4 | 🟢 | Rust AVX2 | 1.43B/s | 91.7ms | — | — | ~0 (native) | 0.05× | 2.31× |
| 5 | 🟢 | Node.js | 618.31M/s | 212.0ms | 203.0ms | 67.2MB | ~0 | 0.02× | 1.00× |
| 6 | ⚪ | WASM ▶ production | 439.66M/s | 1.04s | 1.05s | 107.8MB | ~0 | 0.02× | 0.71× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 880.5K/s | 0.1ms | 0.0ms | 106.3MB | 1.3 KB/op | 0.00× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 713.0K/s | 46.0ms | 94.0ms | 106.6MB | 34 B/op | 0.00× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 611.9K/s | 53.5ms | 110.0ms | 106.3MB | 5 B/op | 0.00× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.5K/s | 18.3ms | 47.0ms | 106.6MB | 671 B/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 1.5K/s | 0.7ms | 0.0ms | 105.9MB | 224.3 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 190.0/s | 5.3ms | 0.0ms | 105.8MB | 338.0 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (671 B/op) · **highest:** Galerina governed ⟨interp⟩ (338.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 63.2K/s | 1.6ms | 0.0ms | 107.2MB | -3.0 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.4K/s | 0.4ms | 0.0ms | 106.7MB | 152.1 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 840.0/s | 1.2ms | 0.0ms | 106.6MB | 171.4 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.0 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.38B/s | 433.4ms | — | — | ~0 (native) | 213.5× | 1.39× |
| 🥈 | 🟢 | Rust (generic) | 1.38B/s | 433.8ms | — | — | ~0 (native) | 213.3× | 1.39× |
| 🥉 | 🟢 | Node.js | 993.36M/s | 302.0ms | — | — | ~0 | 153.2× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 467.19M/s | 1.28s | 1.28s | 109.5MB | ~0 | 72.1× | 0.47× |
| 5 | ⚫ | Python | 6.48M/s | 1.85s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 306.3K/s | 979.4ms | 1.00s | 105.2MB | 5 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 306.0K/s | 1.6ms | 0.0ms | 105.1MB | 533 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 302.2K/s | 992.8ms | 1.03s | 107.1MB | 3 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (533 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### verified-native-operation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 3.31B/s | — | — | — | ~0 (native) | 371.9× | 1.67× |
| 🥈 | 🟢 | Rust (generic) | 2.32B/s | — | — | — | ~0 (native) | 260.7× | 1.17× |
| 🥉 | 🟢 | Node.js | 1.98B/s | — | — | — | — | 222.9× | 1.00× |
| 4 | ⚫ | Python | 8.90M/s | — | — | — | — | 1.00× | 0.00× |

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 387.15M/s | 129.1ms | — | — | ~0 | 124.4× | 1.00× |
| 🥈 | ⚫ | Python | 3.11M/s | 963.8ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 256.7K/s | 1.1ms | 0.0ms | 105.8MB | -3.3 KB/op | 0.08× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 205.8K/s | 48.6ms | 141.0ms | 107.8MB | 45 B/op | 0.07× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 203.1K/s | 49.2ms | 62.0ms | 106.3MB | 173 B/op | 0.07× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-3.3 KB/op) · **highest:** Galerina governed ⟨interp⟩ (173 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 154.42M/s | 0.3ms | — | — | ~0 (native) | 121.9× | 3.65× |
| 🥈 | 🟢 | Rust (generic) | 153.14M/s | 0.3ms | — | — | ~0 (native) | 120.9× | 3.62× |
| 🥉 | 🟢 | WASM ▶ production | 54.12M/s | 1.85s | 1.84s | 110.0MB | ~0 | 42.7× | 1.28× |
| 4 | 🟢 | Node.js | 42.26M/s | 1.2ms | 0.0ms | 65.3MB | ~0 | 33.4× | 1.00× |
| 5 | 🔴 | Python | 1.27M/s | 39.5ms | 31.3ms | — | ~0 | 1.00× | 0.03× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 52.5K/s | 0.1ms | 0.0ms | 109.0MB | 17.7 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 48.7K/s | 1.03s | 1.03s | 108.5MB | 57 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 48.3K/s | 1.03s | 1.03s | 111.0MB | 53 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (17.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.98M/s | 53.3ms | 63.0ms | 67.4MB | ~0 | 126.4× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 28.90M/s | 1.13s | 1.13s | 111.7MB | ~0 | 29.7× | 0.23× |
| 🥉 | ⚫ | Python | 972.6K/s | 1.68s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 57.7K/s | 0.3ms | 0.0ms | 111.5MB | 15.7 KB/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 57.5K/s | 570.1ms | 625.0ms | 110.9MB | 18 B/op | 0.06× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 56.7K/s | 578.4ms | 609.0ms | 110.9MB | 56 B/op | 0.06× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (15.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.05M/s | — | — | — | — | 6.08× | 1.00× |
| 🥈 | 🟡 | Python | 502.0K/s | — | — | — | 1 B/op | 1.00× | 0.16× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 8.9K/s | 0.4ms | 0.0ms | 119.2MB | 107.3 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 4.9K/s | 102.6ms | 188.0ms | 115.1MB | 2.5 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 4.7K/s | 106.2ms | 156.0ms | 115.4MB | 6.8 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (107.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.43M/s | 139.9ms | — | — | ~0 (native) | 175.9× | 3.75× |
| 🥈 | 🟢 | Rust (generic) | 23.43M/s | 139.9ms | — | — | ~0 (native) | 175.9× | 3.75× |
| 🥉 | 🟢 | WASM ▶ production | 9.03M/s | 1.82s | 1.81s | 117.1MB | ~0 | 67.8× | 1.44× |
| 4 | 🟢 | Node.js | 6.25M/s | 524.3ms | 547.0ms | 67.1MB | ~0 | 46.9× | 1.00× |
| 5 | 🔴 | Python | 133.2K/s | 24.60s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 7.4K/s | 2.22s | 2.28s | 113.9MB | 193 B/op | 0.06× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 7.2K/s | 0.2ms | 0.0ms | 113.9MB | 132.2 KB/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 7.2K/s | 2.29s | 2.30s | 113.0MB | 74 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (132.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 373.36M/s | 26.8ms | — | — | ~0 (native) | 245.0× | 1.55× |
| 🥈 | 🟢 | Rust (generic) | 372.46M/s | 26.8ms | — | — | ~0 (native) | 244.5× | 1.54× |
| 🥉 | 🟢 | Node.js | 241.12M/s | 41.5ms | 31.0ms | 67.3MB | ~0 | 158.2× | 1.00× |
| 4 | ⚫ | Python | 1.52M/s | 6.56s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 584.53M/s | 1.16s | 1.16s | 116.0MB | ~0 | 202.8× | 7.42× |
| 🥈 | 🟢 | Node.js | 78.76M/s | 1.7ms | 0.0ms | 67.1MB | 3 B/op | 27.3× | 1.00× |
| 🥉 | 🟡 | Rust (generic) | 16.49M/s | 8.2ms | — | — | ~0 (native) | 5.72× | 0.21× |
| 4 | 🟡 | Rust AVX2 | 14.50M/s | 9.4ms | — | — | ~0 (native) | 5.03× | 0.18× |
| 5 | 🔴 | Python | 2.88M/s | 47.1ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 372.2K/s | 0.1ms | 0.0ms | 113.1MB | 2.4 KB/op | 0.13× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 336.2K/s | 404.1ms | 484.0ms | 113.1MB | 16 B/op | 0.12× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 317.1K/s | 428.4ms | 437.0ms | 112.9MB | 4 B/op | 0.11× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 158.5K/s | 1.89s | — | — | ~0 (native) | 2.54× | 3.75× |
| 🥈 | 🟢 | Rust AVX2 | 158.2K/s | 1.90s | — | — | ~0 (native) | 2.53× | 3.75× |
| 🥉 | 🟢 | Python | 62.4K/s | 1.60s | — | — | ~0 | 1.00× | 1.48× |
| 4 | 🟢 | Node.js | 42.2K/s | 7.11s | 8.30s | 82.9MB | 7 B/op | 0.68× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (7 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 127.6K/s | 1.57s | 2.41s | 93.8MB | 69 B/op | 1.19× | 1.00× |
| 🥈 | ⚪ | Python | 107.0K/s | 1.87s | — | — | ~0 | 1.00× | 0.84× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (69 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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
| 🥇 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.24s | 1.19× |
| 🥈 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.18B/s | 4.24s | 1.19× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 987.46M/s | 506.3ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 467.31M/s | 1.07s | 0.47× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 5.26M/s | 9.51s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.17M/s | 24.0ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 356.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 311.7K/s | 320.9ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 305.5K/s | 327.3ms | 0.00× |

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
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **186× slower** | **70× slower** | **78× slower** | **85× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **417× slower** | **43.8K× slower** | **301× slower** | **310× slower** | 3× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | 1.1× slower | **🏆 winner** | **28× slower** | **902× slower** | **3.2K× slower** | **1.7K× slower** | **1.7K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | **20× slower** | **328× slower** | **145× slower** | **523× slower** | **497× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **148× slower** | **149× slower** | **579× slower** | **18.9K× slower** | **🏆 winner** | **4.3K× slower** | **6.1K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust (generic) | **🏆 winner** | **🏆 winner** | 2× slower | **106× slower** | **3.0K× slower** | **3.0K× slower** | **3.1K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | **186× slower** | **1.4K× slower** | **1.6K× slower** | **6.4K× slower** | **6.0K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **31× slower** | **31× slower** | **40× slower** | not run | **425× slower** | **12.3K× slower** | **9.1K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | 8× slower | **2.3K× slower** | **39.3K× slower** | **53.6K× slower** | **48.2K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.2× slower | **224× slower** | **3.3K× slower** | **3.9K× slower** | **3.8K× slower** | 3× slower | **283× slower** |
| **matrix-multiply** | Python | **20× slower** | **19× slower** | **46× slower** | **🏆 winner** | **32.0K× slower** | **46.1K× slower** | **39.5K× slower** | **64× slower** | **17× slower** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | 4× slower | **29× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | no comparable metric | no comparable metric | **🏆 winner** | **26× slower** | **75× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 1.4× slower | **214× slower** | **4.5K× slower** | **4.6K× slower** | **4.5K× slower** | 3× slower | not run — no GPU path |
| **verified-native-operation** | Rust AVX2 | **🏆 winner** | 1.4× slower | 2× slower | **372× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **124× slower** | **1.5K× slower** | **1.9K× slower** | **1.9K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **122× slower** | **2.9K× slower** | **3.2K× slower** | **3.2K× slower** | 3× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | **126× slower** | **2.1K× slower** | **2.1K× slower** | **2.2K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | **🏆 winner** | 6× slower | **341× slower** | **649× slower** | **626× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 4× slower | **176× slower** | **3.2K× slower** | **3.2K× slower** | **3.3K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust AVX2 | **🏆 winner** | **🏆 winner** | 2× slower | **245× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **40× slower** | **35× slower** | 7× slower | **203× slower** | **1.6K× slower** | **1.7K× slower** | **1.8K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | 4× slower | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
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
| 🥇 | Node.js | 134.65M/s | 🏆 winner | 186× faster |
| 🥈 | Rust (generic) | 131.54M/s | 1.0× slower | 182× faster |
| 🥉 | Rust AVX2 | 129.35M/s | 1.0× slower | 179× faster |
| 4 | WASM ▶ production | 75.04M/s | 1.8× slower | 104× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 1.93M/s | 70× slower | 2.7× faster |
| 6 | Galerina manifest ⟨interp⟩ | 1.72M/s | 78× slower | 2.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 1.59M/s | 85× slower | 2.2× faster |
| 8 | Python | 722.3K/s | 186× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.57B/s | 🏆 winner | 43.8K× faster |
| 🥈 | Rust AVX2 | 1.57B/s | 1.0× slower | 43.7K× faster |
| 🥉 | Node.js | 929.24M/s | 1.7× slower | 26.0K× faster |
| 4 | WASM ▶ production | 489.53M/s | 3.2× slower | 13.7K× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.20M/s | 301× slower | 145× faster |
| 6 | Galerina governed ⟨interp⟩ | 5.05M/s | 310× slower | 141× faster |
| 7 | Python | 3.75M/s | 417× slower | 105× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 35.8K/s | 43.8K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.55M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust AVX2 | 70.84M/s | 1.1× slower | 2.9K× faster |
| 🥉 | WASM ▶ production | 36.43M/s | 2.1× slower | 1.5K× faster |
| 4 | Node.js | 2.76M/s | 28× slower | 114× faster |
| 5 | Python | 86.0K/s | 902× slower | 3.6× faster |
| 6 | Galerina manifest ⟨interp⟩ | 46.0K/s | 1.7K× slower | 1.9× faster |
| 7 | Galerina governed ⟨interp⟩ | 44.8K/s | 1.7K× slower | 1.9× faster |
| 8 | Galerina passive ⟨interp⟩ ⚠️cache | 24.1K/s | 3.2K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.17B/s | 🏆 winner | 523× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 521× faster |
| 🥉 | WASM ▶ production | 542.58M/s | 2.2× slower | 242× faster |
| 4 | Node.js | 57.24M/s | 20× slower | 26× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.06M/s | 145× slower | 3.6× faster |
| 6 | Python | 3.57M/s | 328× slower | 1.6× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.36M/s | 497× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.24M/s | 523× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.2K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 73.6K/s | 🏆 winner | 18.9K× faster |
| 🥈 | WASM ▶ production | 17.2K/s | 4.3× slower | 4.4K× faster |
| 🥉 | Rust AVX2 | 499.1/s | 148× slower | 128× faster |
| 4 | Rust (generic) | 495.3/s | 149× slower | 127× faster |
| 5 | Node.js | 127.1/s | 579× slower | 33× faster |
| 6 | Galerina manifest ⟨interp⟩ | 17.0/s | 4.3K× slower | 4.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 12.0/s | 6.1K× slower | 3.1× faster |
| 8 | Python | 3.9/s | 18.9K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 252.26M/s | 🏆 winner | 3.1K× faster |
| 🥈 | Rust AVX2 | 244.02M/s | 1.0× slower | 3.0K× faster |
| 🥉 | Node.js | 129.76M/s | 1.9× slower | 1.6K× faster |
| 4 | WASM ▶ production | 121.55M/s | 2.1× slower | 1.5K× faster |
| 5 | Python | 2.37M/s | 106× slower | 29× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 85.2K/s | 3.0K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 84.2K/s | 3.0K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 82.4K/s | 3.1K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.29B/s | 🏆 winner | 6.4K× faster |
| 🥈 | Rust (generic) | 4.32B/s | 3.1× slower | 2.1K× faster |
| 🥉 | WASM ▶ production | 416.74M/s | 32× slower | 200× faster |
| 4 | Node.js | 71.60M/s | 186× slower | 34× faster |
| 5 | Python | 9.49M/s | 1.4K× slower | 4.6× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 8.25M/s | 1.6K× slower | 4.0× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.22M/s | 6.0K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.08M/s | 6.4K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 36.32M/s | 🏆 winner | 12.3K× faster |
| 🥈 | Rust (generic) | 1.18M/s | 31× slower | 400× faster |
| 🥉 | Rust AVX2 | 1.17M/s | 31× slower | 399× faster |
| 4 | Node.js | 899.0K/s | 40× slower | 306× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 85.4K/s | 425× slower | 29× faster |
| 6 | Galerina governed ⟨interp⟩ | 4.0K/s | 9.1K× slower | 1.4× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.9K/s | 12.3K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.11B/s | 🏆 winner | 53.6K× faster |
| 🥈 | Rust (generic) | 1.35B/s | 4.5× slower | 11.9K× faster |
| 🥉 | Node.js | 724.06M/s | 8.4× slower | 6.3K× faster |
| 4 | WASM ▶ production | 469.03M/s | 13× slower | 4.1K× faster |
| 5 | Python | 2.63M/s | 2.3K× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 155.7K/s | 39.3K× slower | 1.4× faster |
| 7 | Galerina governed ⟨interp⟩ | 126.9K/s | 48.2K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 114.1K/s | 53.6K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 1.18B/s | 🏆 winner | 3.9K× faster |
| 🥈 | Rust AVX2 | 1.18B/s | 1.0× slower | 3.9K× faster |
| 🥉 | Node.js | 987.46M/s | 1.2× slower | 3.2K× faster |
| 4 | WASM ▶ production | 467.31M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 5.26M/s | 224× slower | 17× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.17M/s | 283× slower | 14× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 356.0K/s | 3.3K× slower | 1.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 311.7K/s | 3.8K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 305.5K/s | 3.9K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Python | 28.19B/s | 🏆 winner | 46.1K× faster |
| 🥈 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 17× slower | 2.7K× faster |
| 🥉 | Rust (generic) | 1.51B/s | 19× slower | 2.5K× faster |
| 4 | Rust AVX2 | 1.43B/s | 20× slower | 2.3K× faster |
| 5 | Node.js | 618.31M/s | 46× slower | 1.0K× faster |
| 6 | WASM ▶ production | 439.66M/s | 64× slower | 718× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 880.5K/s | 32.0K× slower | 1.4× faster |
| 8 | Galerina governed ⟨interp⟩ | 713.0K/s | 39.5K× slower | 1.2× faster |
| 9 | Galerina manifest ⟨interp⟩ | 611.9K/s | 46.1K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 1.5K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.5K/s | 🏆 winner | 29× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 1.5K/s | 3.5× slower | 8.1× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 190.0/s | 29× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 63.2K/s | 🏆 winner | 75× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.4K/s | 26× slower | 2.9× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 840.0/s | 75× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.38B/s | 🏆 winner | 4.6K× faster |
| 🥈 | Rust (generic) | 1.38B/s | 1.0× slower | 4.6K× faster |
| 🥉 | Node.js | 993.36M/s | 1.4× slower | 3.3K× faster |
| 4 | WASM ▶ production | 467.19M/s | 3.0× slower | 1.5K× faster |
| 5 | Python | 6.48M/s | 214× slower | 21× faster |
| 6 | Galerina governed ⟨interp⟩ | 306.3K/s | 4.5K× slower | 1.0× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 306.0K/s | 4.5K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 302.2K/s | 4.6K× slower | — (slowest) |

### verified-native-operation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 3.31B/s | 🏆 winner | 372× faster |
| 🥈 | Rust (generic) | 2.32B/s | 1.4× slower | 261× faster |
| 🥉 | Node.js | 1.98B/s | 1.7× slower | 223× faster |
| 4 | Python | 8.90M/s | 372× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 387.15M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Python | 3.11M/s | 124× slower | 15× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 256.7K/s | 1.5K× slower | 1.3× faster |
| 4 | Galerina manifest ⟨interp⟩ | 205.8K/s | 1.9K× slower | 1.0× faster |
| 5 | Galerina governed ⟨interp⟩ | 203.1K/s | 1.9K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 154.42M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust (generic) | 153.14M/s | 1.0× slower | 3.2K× faster |
| 🥉 | WASM ▶ production | 54.12M/s | 2.9× slower | 1.1K× faster |
| 4 | Node.js | 42.26M/s | 3.7× slower | 874× faster |
| 5 | Python | 1.27M/s | 122× slower | 26× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 52.5K/s | 2.9K× slower | 1.1× faster |
| 7 | Galerina governed ⟨interp⟩ | 48.7K/s | 3.2K× slower | 1.0× faster |
| 8 | Galerina manifest ⟨interp⟩ | 48.3K/s | 3.2K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.98M/s | 🏆 winner | 2.2K× faster |
| 🥈 | WASM ▶ production | 28.90M/s | 4.3× slower | 510× faster |
| 🥉 | Python | 972.6K/s | 126× slower | 17× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 57.7K/s | 2.1K× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 57.5K/s | 2.1K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 56.7K/s | 2.2K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.05M/s | 🏆 winner | 649× faster |
| 🥈 | Python | 502.0K/s | 6.1× slower | 107× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 8.9K/s | 341× slower | 1.9× faster |
| 4 | Galerina governed ⟨interp⟩ | 4.9K/s | 626× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 4.7K/s | 649× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.43M/s | 🏆 winner | 3.3K× faster |
| 🥈 | Rust (generic) | 23.43M/s | 1.0× slower | 3.3K× faster |
| 🥉 | WASM ▶ production | 9.03M/s | 2.6× slower | 1.3K× faster |
| 4 | Node.js | 6.25M/s | 3.7× slower | 872× faster |
| 5 | Python | 133.2K/s | 176× slower | 19× faster |
| 6 | Galerina manifest ⟨interp⟩ | 7.4K/s | 3.2K× slower | 1.0× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 7.2K/s | 3.2K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 7.2K/s | 3.3K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 373.36M/s | 🏆 winner | 245× faster |
| 🥈 | Rust (generic) | 372.46M/s | 1.0× slower | 244× faster |
| 🥉 | Node.js | 241.12M/s | 1.5× slower | 158× faster |
| 4 | Python | 1.52M/s | 245× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 584.53M/s | 🏆 winner | 1.8K× faster |
| 🥈 | Node.js | 78.76M/s | 7.4× slower | 248× faster |
| 🥉 | Rust (generic) | 16.49M/s | 35× slower | 52× faster |
| 4 | Rust AVX2 | 14.50M/s | 40× slower | 46× faster |
| 5 | Python | 2.88M/s | 203× slower | 9.1× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 372.2K/s | 1.6K× slower | 1.2× faster |
| 7 | Galerina manifest ⟨interp⟩ | 336.2K/s | 1.7K× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 317.1K/s | 1.8K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 158.5K/s | 🏆 winner | 3.8× faster |
| 🥈 | Rust AVX2 | 158.2K/s | 1.0× slower | 3.7× faster |
| 🥉 | Python | 62.4K/s | 2.5× slower | 1.5× faster |
| 4 | Node.js | 42.2K/s | 3.8× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 127.6K/s | 🏆 winner | 1.2× faster |
| 🥈 | Python | 107.0K/s | 1.2× slower | — (slowest) |


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

