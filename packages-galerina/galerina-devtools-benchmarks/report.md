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

> Categories: 14 certified · 3 shape-only(→Memory) · 1 internal-ratio(Governance) · 11 uncertified — a cross-runtime ratio is shown only for work-equivalence-certified lanes.

### CPU Throughput — inner-ops/s (cross-runtime; certified lanes only)

> 🚦 **vs Rust / vs Node** compare the **WASM ▶ production** lane to native. A traffic-light ratio
> appears ONLY for work-equivalence-certified benchmarks; `UNCERTIFIED` lanes show raw throughput and
> NO ratio (their N/work is not yet proven equivalent across runtimes).

| Benchmark | WASM ▶ production | vs Rust | vs Node | Galerina governed ⟨interp⟩ | Implication |
|---|---|---|---|---|---|
| compute-mix | 78.31M/s | ⚪ 1.7× slower | ⚪ 1.7× slower | 1.69M/s | WASM near native |
| arithmetic-threshold | 493.79M/s | UNCERTIFIED | UNCERTIFIED | 5.17M/s | not yet work-equivalence-certified (N/work mismatch) |
| six-digit-guess | 36.20M/s | UNCERTIFIED | UNCERTIFIED | 44.3K/s | not yet work-equivalence-certified (N/work mismatch) |
| fibonacci-recursive | 17.1K/s | UNCERTIFIED | UNCERTIFIED | 12.0/s | not yet work-equivalence-certified (N/work mismatch) |
| tower-of-hanoi | 121.73M/s | 🟡 2.1× slower | 🟢 1.1× slower | 83.9K/s | WASM usable |
| hardware-targets | 38.42M/s | UNCERTIFIED | UNCERTIFIED | 3.6K/s | not yet work-equivalence-certified (N/work mismatch) |
| matrix-multiply | 441.90M/s | 🟡 3.4× slower | ⚪ 1.4× slower | 714.7K/s | WASM usable |
| tri-logic | 463.59M/s | 🟡 3.0× slower | 🟡 2.2× slower | 299.4K/s | WASM usable |
| data-query | no WASM build | — | — | 204.5K/s | WASM not built for this lane yet |
| call-chain | 55.19M/s | — | 🟡 5.0× slower | 48.5K/s | WASM 2–10× under Node |
| nbody | 29.30M/s | — | 🟡 4.2× slower | 56.6K/s | WASM 2–10× under Node |
| mandelbrot | 9.06M/s | 🟡 2.6× slower | 🟢 1.3× | 7.2K/s | WASM usable |
| spectral-norm | no WASM build | — | — | not run | WASM not built for this lane yet |

> 🚦 🟢 ≥0.9 (≈native) · ⚪ ≥0.5 (within 2×) · 🟡 ≥0.1 (2–10× slower) · 🔴 ≥0.01 (10–100×) · ⚫ <0.01 (100×+).
> **Ceiling (fastest certified lane):** Deno WebGPU (NVIDIA GeForce RTX 2060) — 1.63B/s on matrix-multiply.

### Memory — heap bytes per operation (the honest metric; lower is better)

> Ranked by **bytes/op**, NOT throughput — these benchmarks measure allocation, so no cross-runtime
> throughput ratio (and no ⚫) is shown. Native Rust/C++ allocate off the GC heap (~0 native — see §2b/§4).

| Benchmark | 🏆 Best (lowest heap B/op) | Node.js | Python | WASM ▶ production | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ |
|---|---|---|---|---|---|---|
| record-allocation | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 6 B/op | 9 B/op |
| collection-pipeline | **WASM ▶ production** (~0) | ~0 | ~0 | ~0 | 17 B/op | 14 B/op |
| low-memory | **Node.js** (~0) | ~0 | ~0 | ~0 | 35 B/op | 48 B/op |
| binary-trees | **Python** (~0) | 3 B/op | ~0 | ~0 | 8 B/op | 13 B/op |

> **No throughput ratio, no ⚫ here** — a memory benchmark ranked by throughput is exactly the
> cross-metric bug this section removes. record-allocation / binary-trees / collection-pipeline live
> here by bytes/op, so they no longer carry the ◇ shape-only marker; their shape rate is in §4.

### GPU — kernel-evals/s (GPU-shaped workload; matrix-multiply dual-homes here)

> Cross-runtime. Deno WebGPU is the only real-dispatch path; where it produced no number on this
> machine it shows **⏳ GPU pending** — the honest status, never a fabricated GPU rate.

| Benchmark | 🏆 Winner | Speed | WASM ▶ production | GPU (Deno WebGPU) | vs Node (WASM) | Implication |
|---|---|---|---|---|---|---|
| gpu-compute | Rust AVX2 | 1.19B/s | 472.78M/s | 4.01M/s | 🟡 2.1× slower | CPU/WASM lanes lead — real GPU dispatch pending (see §4b) |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 441.90M/s | 1.63B/s | ⚪ 1.4× slower | real GPU dispatch wins |

> **vs Node (WASM)** compares the WASM ▶ production lane to Node.js on the kernel. matrix-multiply also
> appears in the CPU Throughput table (dual-home) — it has both a compute lane and a WebGPU lane.

### I/O & DevTools — native units per benchmark (raw rate; NOT inner-op normalised)

> Each benchmark has its OWN unit, so there is **no cross-runtime ratio** — the winner is the fastest
> lane by raw rate WITHIN that benchmark's native unit. Comparing rates ACROSS benchmarks is meaningless.

| Benchmark | Unit (native) | 🏆 Fastest lane | Node.js | Python | Rust (generic) | WASM ▶ production | Galerina governed ⟨interp⟩ |
|---|---|---|---|---|---|---|---|
| crypto-ops | ops/s | **Galerina governed ⟨interp⟩** (208.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 208.0/s |
| text-html | ops/s | **Galerina governed ⟨interp⟩** (952.0/s) | no comparable metric | no comparable metric | no comparable metric | no WASM — strings/records | 952.0/s |
| json-parse | records/s | **Node.js** (3.16M/s) | 3.16M/s | 504.5K/s | not run — no native impl | no WASM — strings/records | 5.5K/s |
| spore-container | containers/s | **Rust (generic)** (163.6K/s) | 43.8K/s | 66.8K/s | 163.6K/s | no WASM — strings/records | not run |
| framework-pipeline | requests/s | **Node.js** (392.9K/s) | 392.9K/s | 114.4K/s | not run — no native impl | no WASM — strings/records | not run |
| http-throughput | requests/s | **Node.js** (3.5K/s) | 3.5K/s | not run | not run — no native impl | no WASM build | not run |
| naming-check | files/s | **Node.js** (6.6K/s) | 6.6K/s | not run | not run — no native impl | no WASM build | not run |
| context-receipt | receipts/s | **Node.js** (17.2K/s) | 17.2K/s | not run | not run — no native impl | no WASM build | not run |
| intelligence-search | queries/s | **Node.js** (115.2K/s) | 115.2K/s | not run | not run — no native impl | no WASM build | not run |
| provenance-trace | files/s | **Node.js** (760.0/s) | 760.0/s | not run | not run — no native impl | no WASM build | not run |

> Values are native rates (records/s, containers/s, requests/s, files/s, …), shown for transparency —
> NOT a cross-runtime ranking. The inner-op-normalised throughput lives in the CPU table above.

### Governance — Galerina-internal tier ratio ONLY (NO native column)

> This table's columns are Galerina tiers ONLY — there is **no rust/node/python/cpp column**, so a
> cross-runtime `N× slower` is structurally impossible here. The old six-figure governance-cost artifact
> came from dividing the governed tier by a native rate — a division this table cannot express.

| Benchmark | Galerina governed ⟨interp⟩ | Galerina manifest ⟨interp⟩ | WASM ▶ production | governed/manifest (gov overhead) |
|---|---|---|---|---|
| governance-cost | 769.0/s | 813.0/s | 2.90M/s | 0.95× governed/manifest (gov overhead ≈ 1.06×) |

> **governed/manifest** is governance-cost's honest headline: the same-N cost of always-on governance
> (capabilities + audit + proof) vs the pre-verified manifest. `gov overhead` = manifest ÷ governed.


### Full Throughput Table (all runtimes)

| Benchmark | Rust AVX-512 | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) | Node/Galerina† (🖥️ CPU) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| compute-mix | not run — no AVX-512 | **130.34M/s** | **132.85M/s** | **133.51M/s** | **136.21M/s** | 797.8K/s | 2.20M/s | 1.78M/s | 1.69M/s | 78.31M/s | not run — no GPU path | 80.6× |
| arithmetic-threshold | not run — no AVX-512 | 1.59B/s | 1.55B/s | **1.88B/s** | 972.22M/s | 3.90M/s | 37.8K/s | 5.35M/s | 5.17M/s | 493.79M/s | not run — no GPU path | 188.0× |
| six-digit-guess | not run — no AVX-512 | **76.05M/s** | **77.81M/s** | 69.22M/s | 2.30M/s | 86.5K/s | 24.7K/s | 46.0K/s | 44.3K/s | 36.20M/s | not run — no GPU path | 52.0× |
| record-allocation | not run — no AVX-512 | **1.18B/s** | **1.17B/s** | not run — no C++ impl | 52.06M/s | 3.14M/s | 8.04M/s | 2.59M/s | 2.42M/s | 536.48M/s | not run — no GPU path | 21.6× |
| fibonacci-recursive | not run — no AVX-512 | 494.3/s | 489.6/s | not run — no C++ impl | 124.9/s | 4.6/s | **66.1K/s** | 16.0/s | 12.0/s | 17.1K/s | not run — no GPU path | 10.4× |
| tower-of-hanoi | not run — no AVX-512 | **254.65M/s** | **248.17M/s** | not run — no C++ impl | 131.14M/s | 3.05M/s | 89.1K/s | 87.2K/s | 83.9K/s | 121.73M/s | not run — no GPU path | 1.6K× |
| collection-pipeline | not run — no AVX-512 | **13.35B/s** | 4.31B/s | not run — no C++ impl | 70.64M/s | 10.80M/s | 7.87M/s | 2.12M/s | 2.45M/s | 420.97M/s | not run — no GPU path | 28.8× |
| governance-cost ⚠️ | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | N/A — excluded | ⚠️ excluded — not unit-aligned |
| hardware-targets | not run — no AVX-512 | 1.19M/s | 1.18M/s | not run — no C++ impl | 909.8K/s | not run | 95.0K/s | 4.2K/s | 3.6K/s | **38.42M/s** | not run — no GPU path | 254.8× |
| low-memory | not run — no AVX-512 | **6.18B/s** | 1.35B/s | not run — no C++ impl | 712.35M/s | 3.70M/s | 157.4K/s | 130.7K/s | 149.6K/s | 459.06M/s | not run — no GPU path | 4.8K× |
| gpu-compute | not run — no AVX-512 | **1.19B/s** | **1.19B/s** | not run — no C++ impl | 989.29M/s | 8.00M/s | 356.0K/s | 309.3K/s | 313.4K/s | 472.78M/s | 4.01M/s | 3.2K× |
| matrix-multiply | not run — no AVX-512 | 1.43B/s | 1.51B/s | not run — no C++ impl | 611.40M/s | 7.20M/s | 839.5K/s | 720.0K/s | 714.7K/s | 441.90M/s | **1.63B/s** | 855.5× |
| crypto-ops | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **5.7K/s** | 2.0K/s | 208.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| text-html | not run — no AVX-512 | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **63.1K/s** | 2.4K/s | 952.0/s | no WASM — strings/records | not run — no GPU path | N/A — no Node.js |
| tri-logic | not run — no AVX-512 | **1.40B/s** | **1.40B/s** | not run — no C++ impl | 1.00B/s | 6.84M/s | 315.0K/s | 304.3K/s | 299.4K/s | 463.59M/s | not run — no GPU path | 3.3K× |
| data-query | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **387.91M/s** | 4.12M/s | 267.7K/s | 227.2K/s | 204.5K/s | no WASM build | not run — no GPU path | 1.9K× |
| call-chain | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **277.60M/s** | 1.43M/s | 55.0K/s | 50.3K/s | 48.5K/s | 55.19M/s | not run — no GPU path | 5.7K× |
| nbody | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **122.52M/s** | 1.08M/s | 59.6K/s | 57.8K/s | 56.6K/s | 29.30M/s | not run — no GPU path | 2.2K× |
| json-parse | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **3.16M/s** | 504.5K/s | 9.4K/s | 5.3K/s | 5.5K/s | no WASM — strings/records | not run — no GPU path | 575.9× |
| mandelbrot | not run — no AVX-512 | **23.43M/s** | **23.34M/s** | not run — no C++ impl | 6.87M/s | 147.8K/s | 7.4K/s | 7.3K/s | 7.2K/s | 9.06M/s | not run — no GPU path | 948.7× |
| spectral-norm | not run — no AVX-512 | **374.47M/s** | **379.25M/s** | not run — no C++ impl | 241.13M/s | 1.73M/s | not run | not run | not run | no WASM build | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| binary-trees | not run — no AVX-512 | 16.64M/s | 15.34M/s | not run — no C++ impl | 78.01M/s | 2.88M/s | 383.1K/s | 351.3K/s | 338.0K/s | **591.10M/s** | not run — no GPU path | 230.8× |
| spore-container | not run — no AVX-512 | **163.4K/s** | **163.6K/s** | not run — no C++ impl | 43.8K/s | 66.8K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
| framework-pipeline | not run — no AVX-512 | not run — no native impl | not run — no native impl | not run — no C++ impl | **392.9K/s** | 114.4K/s | not run | not run | not run | no WASM — strings/records | not run — no GPU path | N/A — no governed ⟨interp⟩ |
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
| 🥇 | ⚫ | Galerina passive ⟨interp⟩ | -38.01 bytes/op ⚡ ~0 — no boxing | 157.4K/s | — | -380KB |
| 🥈 | 🟢 | Rust AVX2 | 0.00 bytes/op ⚡ ~0 — no boxing | 6.18B/s | — | — |
| 🥉 | 🟢 | Rust (generic) | 0.00 bytes/op ⚡ ~0 — no boxing | 1.35B/s | — | — |
| 4 | 🟢 | Node.js | 0.00 bytes/op ⚡ ~0 — no boxing | 712.35M/s | — | 17KB |
| 5 | ⚪ | WASM ▶ production | 0.00 bytes/op ⚡ ~0 — no boxing | 459.06M/s | — | 44KB |
| 6 | ⚫ | Python | 0.03 bytes/op ⚡ ~0 — no boxing | 3.70M/s | — | 272B |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 35 bytes/op ⚠ moderate | 149.6K/s | — | 352KB |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 48 bytes/op ⚠ moderate | 130.7K/s | — | 478KB |

> **Why this matters:** Every byte allocated is a byte the GC must later collect.
> WASM and the bytecode VM run with zero allocation — ideal for high-throughput governed services.
> The tree-walker's per-node allocation is the primary target of Phases 31-33.


## 2b. General Memory Usage

| Benchmark | Runtime | RSS | Peak RSS | Heap Used | Heap Δ (execution) |
|---|---|---|---|---|---|
| compute-mix | Rust AVX2 | — | — | — | — |
| compute-mix | Rust (generic) | — | — | — | — |
| compute-mix | C++ | — | — | — | — |
| compute-mix | Node.js | 56.8MB | 57.1MB | 5.0MB | 952KB |
| compute-mix | Python | — | — | 3KB | 3KB |
| compute-mix | Galerina passive ⟨interp⟩ | 89.9MB | 89.9MB | 18.2MB | 105KB |
| compute-mix | Galerina manifest ⟨interp⟩ | 85.6MB | 85.6MB | 21.8MB | 4.5MB |
| compute-mix | Galerina governed ⟨interp⟩ | 84.4MB | 84.4MB | 21.6MB | 4.5MB |
| compute-mix | WASM ▶ production | 85.0MB | 85.0MB | 17.4MB | 22KB |
| arithmetic-threshold | Rust AVX2 | — | — | — | — |
| arithmetic-threshold | Rust (generic) | — | — | — | — |
| arithmetic-threshold | C++ | — | — | — | — |
| arithmetic-threshold | Node.js | 56.4MB | 56.6MB | 4.3MB | 210KB |
| arithmetic-threshold | Python | — | — | 4KB | 4KB |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 91.0MB | 91.0MB | 18.5MB | 57KB |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 90.7MB | 90.7MB | 18.4MB | 845KB |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 90.5MB | 90.5MB | 18.4MB | 844KB |
| arithmetic-threshold | WASM ▶ production | 93.0MB | 93.0MB | 17.9MB | 6KB |
| six-digit-guess | Rust AVX2 | — | — | — | — |
| six-digit-guess | Rust (generic) | — | — | — | — |
| six-digit-guess | C++ | — | — | — | — |
| six-digit-guess | Node.js | 61.2MB | 61.2MB | 5.9MB | 1.2MB |
| six-digit-guess | Python | — | — | 583B | 583B |
| six-digit-guess | Galerina passive ⟨interp⟩ | 92.1MB | 92.1MB | 19.1MB | 100KB |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 91.9MB | 91.9MB | 20.3MB | 2.1MB |
| six-digit-guess | Galerina governed ⟨interp⟩ | 91.7MB | 91.7MB | 19.3MB | 1.4MB |
| six-digit-guess | WASM ▶ production | 93.5MB | 93.5MB | 18.2MB | 1KB |
| record-allocation | Rust AVX2 | — | — | — | — |
| record-allocation | Rust (generic) | — | — | — | — |
| record-allocation | Node.js | 56.8MB | 56.8MB | 4.2MB | 43KB |
| record-allocation | Python | — | — | 492B | 492B |
| record-allocation | Galerina passive ⟨interp⟩ | 92.1MB | 92.1MB | 19.0MB | 258KB |
| record-allocation | Galerina manifest ⟨interp⟩ | 92.0MB | 92.0MB | 18.5MB | 89KB |
| record-allocation | Galerina governed ⟨interp⟩ | 92.7MB | 92.7MB | 18.5MB | 60KB |
| record-allocation | WASM ▶ production | 94.4MB | 94.4MB | 18.7MB | 50KB |
| fibonacci-recursive | Rust AVX2 | — | — | — | — |
| fibonacci-recursive | Rust (generic) | — | — | — | — |
| fibonacci-recursive | Node.js | 55.1MB | 55.1MB | 4.1MB | 5KB |
| fibonacci-recursive | Python | — | — | 464B | 464B |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 92.8MB | 92.8MB | 19.7MB | 61KB |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 92.8MB | 92.8MB | 19.4MB | 734KB |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 92.7MB | 92.7MB | 19.3MB | 752KB |
| fibonacci-recursive | WASM ▶ production | 94.4MB | 94.4MB | 18.8MB | 3KB |
| tower-of-hanoi | Rust AVX2 | — | — | — | — |
| tower-of-hanoi | Rust (generic) | — | — | — | — |
| tower-of-hanoi | Node.js | 55.2MB | 55.2MB | 4.1MB | 17KB |
| tower-of-hanoi | Python | — | — | 1KB | 1KB |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 95.4MB | 95.4MB | 24.1MB | 49KB |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 94.4MB | 94.4MB | 19.4MB | 1.7MB |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 94.4MB | 94.4MB | 20.5MB | 2.9MB |
| tower-of-hanoi | WASM ▶ production | 95.2MB | 95.2MB | 18.0MB | 1KB |
| collection-pipeline | Rust AVX2 | — | — | — | — |
| collection-pipeline | Rust (generic) | — | — | — | — |
| collection-pipeline | Node.js | 72.4MB | 72.4MB | 12.3MB | 8.1MB |
| collection-pipeline | Python | — | — | 224B | 224B |
| collection-pipeline | Galerina passive ⟨interp⟩ | 95.3MB | 95.3MB | 18.5MB | 379KB |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 95.3MB | 95.3MB | 17.8MB | 144KB |
| collection-pipeline | Galerina governed ⟨interp⟩ | 96.3MB | 96.3MB | 17.8MB | 168KB |
| collection-pipeline | WASM ▶ production | 98.3MB | 98.3MB | 18.0MB | 24KB |
| governance-cost | Rust AVX2 | — | — | — | — |
| governance-cost | Rust (generic) | — | — | — | — |
| governance-cost | Node.js | 55.3MB | 55.3MB | 4.1MB | 26KB |
| governance-cost | Python | — | — | 272B | 272B |
| governance-cost | Galerina passive ⟨interp⟩ | 97.5MB | 97.5MB | 18.7MB | 528KB |
| governance-cost | Galerina manifest ⟨interp⟩ | 98.7MB | 98.7MB | 18.3MB | 485KB |
| governance-cost | Galerina governed ⟨interp⟩ | 96.6MB | 96.6MB | 18.3MB | 516KB |
| governance-cost | WASM ▶ production | 97.7MB | 97.7MB | 18.1MB | 52KB |
| hardware-targets | Rust AVX2 | — | — | — | — |
| hardware-targets | Rust (generic) | — | — | — | — |
| hardware-targets | Node.js | 57.0MB | 57.0MB | 4.5MB | 376KB |
| hardware-targets | Galerina passive ⟨interp⟩ | 97.6MB | 97.6MB | 19.3MB | 615KB |
| hardware-targets | Galerina manifest ⟨interp⟩ | 95.9MB | 95.9MB | 18.0MB | 82KB |
| hardware-targets | Galerina governed ⟨interp⟩ | 95.7MB | 95.7MB | 18.0MB | 83KB |
| hardware-targets | WASM ▶ production | 98.0MB | 98.0MB | 18.3MB | 84KB |
| low-memory | Rust AVX2 | — | — | — | — |
| low-memory | Rust (generic) | — | — | — | — |
| low-memory | Node.js | 55.2MB | 55.2MB | 4.1MB | 17KB |
| low-memory | Python | — | — | 272B | 272B |
| low-memory | Galerina passive ⟨interp⟩ | 95.7MB | 95.7MB | 18.5MB | -380KB |
| low-memory | Galerina manifest ⟨interp⟩ | 96.1MB | 96.1MB | 18.5MB | 478KB |
| low-memory | Galerina governed ⟨interp⟩ | 95.7MB | 95.7MB | 18.3MB | 352KB |
| low-memory | WASM ▶ production | 98.0MB | 98.0MB | 18.3MB | 44KB |
| gpu-compute | Rust AVX2 | — | — | — | — |
| gpu-compute | Rust (generic) | — | — | — | — |
| gpu-compute | Node.js | 55.4MB | 55.4MB | 4.1MB | 17KB |
| gpu-compute | Python | — | — | 304B | 304B |
| gpu-compute | Galerina passive ⟨interp⟩ | 96.2MB | 96.2MB | 19.6MB | 195KB |
| gpu-compute | Galerina manifest ⟨interp⟩ | 96.1MB | 96.1MB | 18.3MB | 168KB |
| gpu-compute | Galerina governed ⟨interp⟩ | 95.8MB | 95.8MB | 18.4MB | 288KB |
| gpu-compute | WASM ▶ production | 98.7MB | 98.7MB | 18.4MB | 2KB |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| matrix-multiply | Rust AVX2 | — | — | — | — |
| matrix-multiply | Rust (generic) | — | — | — | — |
| matrix-multiply | Node.js | 57.2MB | 57.2MB | 4.8MB | 697KB |
| matrix-multiply | Python | — | — | 392B | 392B |
| matrix-multiply | Galerina passive ⟨interp⟩ | 97.5MB | 97.5MB | 18.8MB | 165KB |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 97.5MB | 97.5MB | 19.4MB | 1.2MB |
| matrix-multiply | Galerina governed ⟨interp⟩ | 97.6MB | 97.6MB | 19.2MB | 1.0MB |
| matrix-multiply | WASM ▶ production | 99.0MB | 99.0MB | 18.4MB | 3KB |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | — | — | — | — |
| crypto-ops | Rust AVX2 | — | — | — | — |
| crypto-ops | Rust (generic) | — | — | — | — |
| crypto-ops | Node.js | 70.4MB | 70.4MB | 7.9MB | 2.4MB |
| crypto-ops | Python | — | — | 208B | 208B |
| crypto-ops | Galerina passive ⟨interp⟩ | 97.8MB | 97.8MB | 18.8MB | -142KB |
| crypto-ops | Galerina manifest ⟨interp⟩ | 97.6MB | 97.6MB | 18.5MB | 314KB |
| crypto-ops | Galerina governed ⟨interp⟩ | 97.6MB | 97.6MB | 18.5MB | 334KB |
| text-html | Rust AVX2 | — | — | — | — |
| text-html | Rust (generic) | — | — | — | — |
| text-html | Node.js | — | — | — | 472KB |
| text-html | Python | — | — | 208B | 208B |
| text-html | Galerina passive ⟨interp⟩ | 98.0MB | 98.0MB | 19.4MB | -280KB |
| text-html | Galerina manifest ⟨interp⟩ | 96.0MB | 96.0MB | 18.8MB | 156KB |
| text-html | Galerina governed ⟨interp⟩ | 97.8MB | 97.8MB | 18.8MB | 175KB |
| tri-logic | Rust AVX2 | — | — | — | — |
| tri-logic | Rust (generic) | — | — | — | — |
| tri-logic | Node.js | — | — | — | 331KB |
| tri-logic | Python | — | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 97.0MB | 97.0MB | 20.1MB | 268KB |
| tri-logic | Galerina manifest ⟨interp⟩ | 96.9MB | 96.9MB | 19.9MB | 1.1MB |
| tri-logic | Galerina governed ⟨interp⟩ | 96.8MB | 96.8MB | 20.1MB | 1.4MB |
| tri-logic | WASM ▶ production | 100.2MB | 100.2MB | 19.1MB | 1KB |
| data-query | Node.js | — | — | — | 22KB |
| data-query | Python | — | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 99.3MB | 99.3MB | 22.0MB | 1.2MB |
| data-query | Galerina manifest ⟨interp⟩ | 97.8MB | 97.8MB | 19.5MB | 694KB |
| data-query | Galerina governed ⟨interp⟩ | 99.4MB | 99.4MB | 20.9MB | 2.0MB |
| call-chain | Node.js | 56.3MB | 56.3MB | 4.4MB | 275KB |
| call-chain | Python | — | — | 368B | 368B |
| call-chain | Galerina passive ⟨interp⟩ | 98.4MB | 98.4MB | 23.0MB | 96KB |
| call-chain | Galerina manifest ⟨interp⟩ | 98.4MB | 98.4MB | 20.1MB | 1.2MB |
| call-chain | Galerina governed ⟨interp⟩ | 98.3MB | 98.3MB | 19.1MB | 295KB |
| call-chain | WASM ▶ production | 101.6MB | 101.6MB | 19.1MB | 1KB |
| nbody | Node.js | 57.6MB | 57.6MB | 4.2MB | 30KB |
| nbody | Python | — | — | 624B | 624B |
| nbody | Galerina passive ⟨interp⟩ | 97.2MB | 97.2MB | 19.7MB | 237KB |
| nbody | Galerina manifest ⟨interp⟩ | 97.0MB | 97.0MB | 19.3MB | 407KB |
| nbody | Galerina governed ⟨interp⟩ | 97.5MB | 97.5MB | 19.7MB | 755KB |
| nbody | WASM ▶ production | 99.7MB | 99.7MB | 19.2MB | 1KB |
| json-parse | Node.js | — | — | — | 254KB |
| json-parse | Python | — | — | 520B | 520B |
| json-parse | Galerina passive ⟨interp⟩ | 101.1MB | 101.1MB | 21.5MB | 432KB |
| json-parse | Galerina manifest ⟨interp⟩ | 100.1MB | 100.1MB | 20.4MB | 971KB |
| json-parse | Galerina governed ⟨interp⟩ | 106.1MB | 106.1MB | 21.6MB | 2.7MB |
| mandelbrot | Rust AVX2 | — | — | — | — |
| mandelbrot | Rust (generic) | — | — | — | — |
| mandelbrot | Node.js | 57.2MB | 57.2MB | 5.0MB | 846KB |
| mandelbrot | Python | — | — | 3KB | 3KB |
| mandelbrot | Galerina passive ⟨interp⟩ | 99.7MB | 99.7MB | 20.8MB | 168KB |
| mandelbrot | Galerina manifest ⟨interp⟩ | 99.4MB | 99.4MB | 20.4MB | 1.1MB |
| mandelbrot | Galerina governed ⟨interp⟩ | 101.1MB | 101.1MB | 19.7MB | 148KB |
| mandelbrot | WASM ▶ production | 101.4MB | 101.4MB | 19.8MB | 1KB |
| spectral-norm | Rust AVX2 | — | — | — | — |
| spectral-norm | Rust (generic) | — | — | — | — |
| spectral-norm | Node.js | 56.9MB | 56.9MB | 4.4MB | 293KB |
| spectral-norm | Python | — | — | 4KB | 4KB |
| binary-trees | Rust AVX2 | — | — | — | — |
| binary-trees | Rust (generic) | — | — | — | — |
| binary-trees | Node.js | 57.2MB | 57.2MB | 4.6MB | 428KB |
| binary-trees | Python | — | — | 368B | 368B |
| binary-trees | Galerina passive ⟨interp⟩ | 101.3MB | 101.3MB | 19.7MB | 70KB |
| binary-trees | Galerina manifest ⟨interp⟩ | 101.3MB | 101.3MB | 21.1MB | 1.8MB |
| binary-trees | Galerina governed ⟨interp⟩ | 101.4MB | 101.4MB | 20.5MB | 1.1MB |
| binary-trees | WASM ▶ production | 102.6MB | 102.6MB | 19.6MB | 2KB |
| spore-container | Rust AVX2 | — | — | — | — |
| spore-container | Rust (generic) | — | — | — | — |
| spore-container | Node.js | 72.6MB | 72.6MB | 8.9MB | 1.7MB |
| spore-container | Python | — | — | 5KB | 5KB |
| framework-pipeline | Node.js | 83.6MB | 83.6MB | 17.0MB | 6.0MB |
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
| compute-mix | C++ | 30.00s | — | — | — |
| compute-mix | Node.js | 5.00s | 4.99s | 100% | 136.6K ops/CPU-ms |
| compute-mix | Python | 5.01s | 5.02s | 100% | 797.51 ops/CPU-ms |
| compute-mix | Galerina passive ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| compute-mix | Galerina manifest ⟨interp⟩ | 28.0ms | 16.0ms | 57% | 3.1K ops/CPU-ms |
| compute-mix | Galerina governed ⟨interp⟩ | 29.6ms | 47.0ms | 159% | 1.1K ops/CPU-ms |
| compute-mix | WASM ▶ production | 1.28s | 1.28s | 100% | 78.1K ops/CPU-ms |
| arithmetic-threshold | Rust AVX2 | 12.6ms | — | — | — |
| arithmetic-threshold | Rust (generic) | 12.9ms | — | — | — |
| arithmetic-threshold | C++ | 10.6ms | — | — | — |
| arithmetic-threshold | Node.js | 20.6ms | 47.0ms | 228% | 425.5K ops/CPU-ms |
| arithmetic-threshold | Python | 5.12s | 5.13s | 100% | 3.9K ops/CPU-ms |
| arithmetic-threshold | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina manifest ⟨interp⟩ | 11.8ms | 0.0ms | 0% | — |
| arithmetic-threshold | Galerina governed ⟨interp⟩ | 12.2ms | 0.0ms | 0% | — |
| arithmetic-threshold | WASM ▶ production | 1.02s | 1.02s | 99% | 498.0K ops/CPU-ms |
| six-digit-guess | Rust AVX2 | 0.6ms | — | — | — |
| six-digit-guess | Rust (generic) | 0.5ms | — | — | — |
| six-digit-guess | C++ | 0.6ms | — | — | — |
| six-digit-guess | Node.js | 18.3ms | 32.0ms | 175% | 1.3K ops/CPU-ms |
| six-digit-guess | Python | 486.6ms | 484.4ms | 100% | 86.85 ops/CPU-ms |
| six-digit-guess | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| six-digit-guess | Galerina manifest ⟨interp⟩ | 914.6ms | 985.0ms | 108% | 42.71 ops/CPU-ms |
| six-digit-guess | Galerina governed ⟨interp⟩ | 950.6ms | 1.03s | 108% | 40.80 ops/CPU-ms |
| six-digit-guess | WASM ▶ production | 1.16s | 1.16s | 99% | 36.4K ops/CPU-ms |
| record-allocation | Rust AVX2 | 8.5ms | — | — | — |
| record-allocation | Rust (generic) | 8.5ms | — | — | — |
| record-allocation | Node.js | 3.8ms | 31.0ms | 807% | 6.5K ops/CPU-ms |
| record-allocation | Python | 63.6ms | 62.5ms | 98% | 3.2K ops/CPU-ms |
| record-allocation | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| record-allocation | Galerina manifest ⟨interp⟩ | 3.9ms | 0.0ms | 0% | — |
| record-allocation | Galerina governed ⟨interp⟩ | 4.1ms | 0.0ms | 0% | — |
| record-allocation | WASM ▶ production | 1.01s | 1.02s | 101% | 531.5K ops/CPU-ms |
| fibonacci-recursive | Rust AVX2 | 404.6ms | — | — | — |
| fibonacci-recursive | Rust (generic) | 408.5ms | — | — | — |
| fibonacci-recursive | Node.js | 800.8ms | 797.0ms | 100% | 0.13 ops/CPU-ms |
| fibonacci-recursive | Python | 4.38s | 4.39s | 100% | 0.00 ops/CPU-ms |
| fibonacci-recursive | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| fibonacci-recursive | Galerina manifest ⟨interp⟩ | 62.0ms | 63.0ms | 102% | 0.02 ops/CPU-ms |
| fibonacci-recursive | Galerina governed ⟨interp⟩ | 81.3ms | 125.0ms | 154% | 0.01 ops/CPU-ms |
| fibonacci-recursive | WASM ▶ production | 1.05s | 1.06s | 101% | 16.95 ops/CPU-ms |
| tower-of-hanoi | Rust AVX2 | 514.7ms | — | — | — |
| tower-of-hanoi | Rust (generic) | 528.1ms | — | — | — |
| tower-of-hanoi | Node.js | 99.9ms | 94.0ms | 94% | 139.4K ops/CPU-ms |
| tower-of-hanoi | Python | 429.4ms | 437.5ms | 102% | 3.0K ops/CPU-ms |
| tower-of-hanoi | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| tower-of-hanoi | Galerina manifest ⟨interp⟩ | 751.4ms | 750.0ms | 100% | 87.38 ops/CPU-ms |
| tower-of-hanoi | Galerina governed ⟨interp⟩ | 780.7ms | 782.0ms | 100% | 83.80 ops/CPU-ms |
| tower-of-hanoi | WASM ▶ production | 1.08s | 1.08s | 100% | 121.6K ops/CPU-ms |
| collection-pipeline | Rust AVX2 | 74.9ms | — | — | — |
| collection-pipeline | Rust (generic) | 231.8ms | — | — | — |
| collection-pipeline | Node.js | 707.9ms | 718.0ms | 101% | 69.6K ops/CPU-ms |
| collection-pipeline | Python | 4.63s | 4.63s | 100% | 10.8K ops/CPU-ms |
| collection-pipeline | Galerina passive ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina manifest ⟨interp⟩ | 4.7ms | 0.0ms | 0% | — |
| collection-pipeline | Galerina governed ⟨interp⟩ | 4.1ms | 0.0ms | 0% | — |
| collection-pipeline | WASM ▶ production | 1.02s | 1.02s | 99% | 423.2K ops/CPU-ms |
| governance-cost | Rust AVX2 | 11.2ms | — | — | — |
| governance-cost | Rust (generic) | 12.8ms | — | — | — |
| governance-cost | Node.js | 47.0ms | 47.0ms | 100% | — |
| governance-cost | Python | 4.02s | 4.02s | 100% | — |
| governance-cost | Galerina passive ⟨interp⟩ | 1.6ms | 31.0ms | 1922% | — |
| governance-cost | Galerina manifest ⟨interp⟩ | 1.2ms | 0.0ms | 0% | — |
| governance-cost | Galerina governed ⟨interp⟩ | 1.3ms | 48.0ms | 3692% | — |
| governance-cost | WASM ▶ production | 1.00s | 1.01s | 101% | — |
| hardware-targets | Rust AVX2 | 840.9ms | — | — | — |
| hardware-targets | Rust (generic) | 845.4ms | — | — | — |
| hardware-targets | Node.js | 1.10s | 1.09s | 100% | 914.08 ops/CPU-ms |
| hardware-targets | Galerina passive ⟨interp⟩ | 10.5ms | 0.0ms | 0% | — |
| hardware-targets | Galerina manifest ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| hardware-targets | Galerina governed ⟨interp⟩ | 0.3ms | 0.0ms | 0% | — |
| hardware-targets | WASM ▶ production | 1.00s | 1.01s | 101% | 37.9K ops/CPU-ms |
| low-memory | Rust AVX2 | 161.9ms | — | — | — |
| low-memory | Rust (generic) | 738.5ms | — | — | — |
| low-memory | Node.js | 70.2ms | 78.0ms | 111% | 641.0K ops/CPU-ms |
| low-memory | Python | 2.71s | 2.70s | 100% | 3.7K ops/CPU-ms |
| low-memory | Galerina passive ⟨interp⟩ | 0.6ms | 0.0ms | 0% | — |
| low-memory | Galerina manifest ⟨interp⟩ | 76.5ms | 94.0ms | 123% | 106.38 ops/CPU-ms |
| low-memory | Galerina governed ⟨interp⟩ | 66.8ms | 156.0ms | 233% | 64.10 ops/CPU-ms |
| low-memory | WASM ▶ production | 1.00s | 1.00s | 100% | 460.0K ops/CPU-ms |
| gpu-compute | Rust AVX2 | 4.19s | — | — | — |
| gpu-compute | Rust (generic) | 4.19s | — | — | — |
| gpu-compute | Node.js | 505.4ms | 500.0ms | 99% | 1000.0K ops/CPU-ms |
| gpu-compute | Python | 6.25s | 6.25s | 100% | 8.0K ops/CPU-ms |
| gpu-compute | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| gpu-compute | Galerina manifest ⟨interp⟩ | 323.3ms | 359.0ms | 111% | 278.55 ops/CPU-ms |
| gpu-compute | Galerina governed ⟨interp⟩ | 319.0ms | 391.0ms | 123% | 255.75 ops/CPU-ms |
| gpu-compute | WASM ▶ production | 1.06s | 1.05s | 99% | 477.6K ops/CPU-ms |
| gpu-compute | Deno WebGPU (NVIDIA GeForce RTX 2060) | 24.9ms | — | — | — |
| matrix-multiply | Rust AVX2 | 92.0ms | — | — | — |
| matrix-multiply | Rust (generic) | 86.5ms | — | — | — |
| matrix-multiply | Node.js | 214.4ms | 203.0ms | 95% | 645.7K ops/CPU-ms |
| matrix-multiply | Python | 1.82s | — | — | — |
| matrix-multiply | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| matrix-multiply | Galerina manifest ⟨interp⟩ | 45.5ms | 48.0ms | 105% | 682.67 ops/CPU-ms |
| matrix-multiply | Galerina governed ⟨interp⟩ | 45.9ms | 47.0ms | 103% | 697.19 ops/CPU-ms |
| matrix-multiply | WASM ▶ production | 1.04s | 1.03s | 99% | 445.0K ops/CPU-ms |
| matrix-multiply | Deno WebGPU (NVIDIA GeForce RTX 2060) | 12.8ms | — | — | — |
| crypto-ops | Galerina passive ⟨interp⟩ | 17.6ms | 47.0ms | 267% | — |
| crypto-ops | Galerina manifest ⟨interp⟩ | 0.5ms | 0.0ms | 0% | — |
| crypto-ops | Galerina governed ⟨interp⟩ | 4.8ms | 0.0ms | 0% | — |
| text-html | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| text-html | Galerina manifest ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| text-html | Galerina governed ⟨interp⟩ | 1.1ms | 0.0ms | 0% | — |
| tri-logic | Rust AVX2 | 428.8ms | — | — | — |
| tri-logic | Rust (generic) | 429.7ms | — | — | — |
| tri-logic | Node.js | 299.8ms | — | — | — |
| tri-logic | Python | 1.75s | — | — | — |
| tri-logic | Galerina passive ⟨interp⟩ | 1.6ms | 0.0ms | 0% | — |
| tri-logic | Galerina manifest ⟨interp⟩ | 986.0ms | 1.00s | 101% | 300.00 ops/CPU-ms |
| tri-logic | Galerina governed ⟨interp⟩ | 1.00s | 1.05s | 105% | 286.53 ops/CPU-ms |
| tri-logic | WASM ▶ production | 1.29s | 1.30s | 100% | 462.6K ops/CPU-ms |
| data-query | Node.js | 128.9ms | — | — | — |
| data-query | Python | 728.7ms | — | — | — |
| data-query | Galerina passive ⟨interp⟩ | 0.8ms | 0.0ms | 0% | — |
| data-query | Galerina manifest ⟨interp⟩ | 44.0ms | 47.0ms | 107% | 212.77 ops/CPU-ms |
| data-query | Galerina governed ⟨interp⟩ | 48.9ms | 109.0ms | 223% | 91.74 ops/CPU-ms |
| call-chain | Node.js | 7.2ms | 0.0ms | 0% | — |
| call-chain | Python | 700.5ms | 703.1ms | 100% | 1.4K ops/CPU-ms |
| call-chain | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| call-chain | Galerina manifest ⟨interp⟩ | 994.9ms | 1.01s | 102% | 49.26 ops/CPU-ms |
| call-chain | Galerina governed ⟨interp⟩ | 1.03s | 1.05s | 102% | 47.76 ops/CPU-ms |
| call-chain | WASM ▶ production | 1.81s | 1.81s | 100% | 55.2K ops/CPU-ms |
| nbody | Node.js | 53.5ms | 47.0ms | 88% | 139.4K ops/CPU-ms |
| nbody | Python | 1.51s | — | — | — |
| nbody | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| nbody | Galerina manifest ⟨interp⟩ | 566.5ms | 593.0ms | 105% | 55.26 ops/CPU-ms |
| nbody | Galerina governed ⟨interp⟩ | 579.4ms | 594.0ms | 103% | 55.17 ops/CPU-ms |
| nbody | WASM ▶ production | 1.12s | 1.11s | 99% | 29.5K ops/CPU-ms |
| json-parse | Galerina passive ⟨interp⟩ | 0.4ms | 0.0ms | 0% | — |
| json-parse | Galerina manifest ⟨interp⟩ | 94.6ms | 140.0ms | 148% | 3.57 ops/CPU-ms |
| json-parse | Galerina governed ⟨interp⟩ | 91.1ms | 109.0ms | 120% | 4.59 ops/CPU-ms |
| mandelbrot | Rust AVX2 | 139.8ms | — | — | — |
| mandelbrot | Rust (generic) | 140.4ms | — | — | — |
| mandelbrot | Node.js | 477.0ms | 484.0ms | 101% | 6.8K ops/CPU-ms |
| mandelbrot | Python | 22.17s | — | — | — |
| mandelbrot | Galerina passive ⟨interp⟩ | 0.2ms | 0.0ms | 0% | — |
| mandelbrot | Galerina manifest ⟨interp⟩ | 2.24s | 2.25s | 101% | 7.28 ops/CPU-ms |
| mandelbrot | Galerina governed ⟨interp⟩ | 2.26s | 2.27s | 100% | 7.23 ops/CPU-ms |
| mandelbrot | WASM ▶ production | 1.81s | 1.81s | 100% | 9.0K ops/CPU-ms |
| spectral-norm | Rust AVX2 | 26.7ms | — | — | — |
| spectral-norm | Rust (generic) | 26.4ms | — | — | — |
| spectral-norm | Node.js | 41.5ms | 47.0ms | 113% | 212.8K ops/CPU-ms |
| spectral-norm | Python | 5.79s | — | — | — |
| binary-trees | Rust AVX2 | 8.2ms | — | — | — |
| binary-trees | Rust (generic) | 8.9ms | — | — | — |
| binary-trees | Node.js | 1.7ms | 0.0ms | 0% | — |
| binary-trees | Python | 47.2ms | 46.9ms | 99% | 2.9K ops/CPU-ms |
| binary-trees | Galerina passive ⟨interp⟩ | 0.1ms | 0.0ms | 0% | — |
| binary-trees | Galerina manifest ⟨interp⟩ | 386.8ms | 453.0ms | 117% | 299.90 ops/CPU-ms |
| binary-trees | Galerina governed ⟨interp⟩ | 401.9ms | 469.0ms | 117% | 289.67 ops/CPU-ms |
| binary-trees | WASM ▶ production | 1.15s | 1.14s | 99% | 595.9K ops/CPU-ms |
| spore-container | Rust AVX2 | 1.84s | — | — | — |
| spore-container | Rust (generic) | 1.83s | — | — | — |
| spore-container | Node.js | 6.85s | 8.20s | 120% | 36.57 ops/CPU-ms |
| spore-container | Python | 1.50s | — | — | — |
| framework-pipeline | Node.js | 509.0ms | 1.11s | 218% | 180.18 ops/CPU-ms |
| framework-pipeline | Python | 1.75s | — | — | — |
| http-throughput | Node.js | 87.0ms | — | — | — |
| naming-check | Node.js | 470.0ms | — | — | — |
| context-receipt | Node.js | 337.0ms | — | — | — |
| intelligence-search | Node.js | 43.0ms | — | — | — |
| provenance-trace | Node.js | 2.04s | — | — | — |

> **CPU utilisation** = CPU ms ÷ wall ms × 100. Node.js approaches 100% (single-thread JIT). Python may show <100% on Windows where process_time measures differently.

## 4. Per-Benchmark Detail

> **Heap/op** = heap bytes allocated per operation (the fair, workload-attributable memory metric).
> Managed runtimes (Node/Python/Galerina/WASM) report it via a GC'd before/after delta; native Rust/C++
> show **~0 (native)** — no GC-managed heap. `~0` = no measurable per-op allocation (e.g. V8 tagged ints);
> a large positive value (e.g. the Galerina tree-walker boxing a value per AST node) is allocation pressure.

### compute-mix

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 136.21M/s | 5.00s | 4.99s | 56.8MB | ~0 | 170.7× | 1.00× |
| 🥈 | 🟢 | C++ | 133.51M/s | 30.00s | — | — | ~0 (native) | 167.3× | 0.98× |
| 🥉 | 🟢 | Rust (generic) | 132.85M/s | 5.00s | — | — | ~0 (native) | 166.5× | 0.98× |
| 4 | 🟢 | Rust AVX2 | 130.34M/s | 5.00s | — | — | ~0 (native) | 163.4× | 0.96× |
| 5 | ⚪ | WASM ▶ production | 78.31M/s | 1.28s | 1.28s | 85.0MB | ~0 | 98.2× | 0.57× |
| 6 | 🔴 | Galerina passive ⟨interp⟩ | 2.20M/s | 0.5ms | 0.0ms | 89.9MB | 103 B/op | 2.76× | 0.02× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 1.78M/s | 28.0ms | 16.0ms | 85.6MB | 89 B/op | 2.24× | 0.01× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 1.69M/s | 29.6ms | 47.0ms | 84.4MB | 90 B/op | 2.12× | 0.01× |
| 9 | ⚫ | Python | 797.8K/s | 5.01s | 5.02s | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (103 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### arithmetic-threshold

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | C++ | 1.88B/s | 10.6ms | — | — | ~0 (native) | 482.6× | 1.94× |
| 🥈 | 🟢 | Rust AVX2 | 1.59B/s | 12.6ms | — | — | ~0 (native) | 406.2× | 1.63× |
| 🥉 | 🟢 | Rust (generic) | 1.55B/s | 12.9ms | — | — | ~0 (native) | 397.4× | 1.60× |
| 4 | 🟢 | Node.js | 972.22M/s | 20.6ms | 47.0ms | 56.4MB | ~0 | 249.1× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 493.79M/s | 1.02s | 1.02s | 93.0MB | ~0 | 126.5× | 0.51× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 5.35M/s | 11.8ms | 0.0ms | 90.7MB | 13 B/op | 1.37× | 0.01× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 5.17M/s | 12.2ms | 0.0ms | 90.5MB | 13 B/op | 1.32× | 0.01× |
| 8 | ⚫ | Python | 3.90M/s | 5.12s | 5.13s | — | ~0 | 1.00× | 0.00× |
| 9 | ⚫ | Galerina passive ⟨interp⟩ | 37.8K/s | 0.1ms | 0.0ms | 91.0MB | 18.7 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### six-digit-guess

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 77.81M/s | 0.5ms | — | — | ~0 (native) | 900.0× | 33.8× |
| 🥈 | 🟢 | Rust AVX2 | 76.05M/s | 0.6ms | — | — | ~0 (native) | 879.7× | 33.1× |
| 🥉 | 🟢 | C++ | 69.22M/s | 0.6ms | — | — | ~0 (native) | 800.6× | 30.1× |
| 4 | 🟢 | WASM ▶ production | 36.20M/s | 1.16s | 1.16s | 93.5MB | ~0 | 418.8× | 15.7× |
| 5 | 🟢 | Node.js | 2.30M/s | 18.3ms | 32.0ms | 61.2MB | 29 B/op | 26.6× | 1.00× |
| 6 | 🔴 | Python | 86.5K/s | 486.6ms | 484.4ms | — | ~0 | 1.00× | 0.04× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 46.0K/s | 914.6ms | 985.0ms | 91.9MB | 50 B/op | 0.53× | 0.02× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 44.3K/s | 950.6ms | 1.03s | 91.7MB | 34 B/op | 0.51× | 0.02× |
| 9 | 🔴 | Galerina passive ⟨interp⟩ | 24.7K/s | 0.1ms | 0.0ms | 92.1MB | 32.6 KB/op | 0.29× | 0.01× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (32.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### record-allocation

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.18B/s | 8.5ms | — | — | ~0 (native) | 374.4× | 22.6× |
| 🥈 | 🟢 | Rust (generic) | 1.17B/s | 8.5ms | — | — | ~0 (native) | 373.5× | 22.6× |
| 🥉 | 🟢 | WASM ▶ production | 536.48M/s | 1.01s | 1.02s | 94.4MB | ~0 | 170.7× | 10.3× |
| 4 | 🟢 | Node.js | 52.06M/s | 3.8ms | 31.0ms | 56.8MB | ~0 | 16.6× | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 8.04M/s | 0.2ms | 0.0ms | 92.1MB | 140 B/op | 2.56× | 0.15× |
| 6 | 🔴 | Python | 3.14M/s | 63.6ms | 62.5ms | — | ~0 | 1.00× | 0.06× |
| 7 | 🔴 | Galerina manifest ⟨interp⟩ | 2.59M/s | 3.9ms | 0.0ms | 92.0MB | 9 B/op | 0.82× | 0.05× |
| 8 | 🔴 | Galerina governed ⟨interp⟩ | 2.42M/s | 4.1ms | 0.0ms | 92.7MB | 6 B/op | 0.77× | 0.05× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (140 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### fibonacci-recursive

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 66.1K/s | 0.1ms | 0.0ms | 92.8MB | 11.8 KB/op | 14.5K× | 529.7× |
| 🥈 | 🟢 | WASM ▶ production | 17.1K/s | 1.05s | 1.06s | 94.4MB | ~0 | 3.7K× | 136.8× |
| 🥉 | 🟢 | Rust AVX2 | 494.3/s | 404.6ms | — | — | ~0 (native) | 108.4× | 3.96× |
| 4 | 🟢 | Rust (generic) | 489.6/s | 408.5ms | — | — | ~0 (native) | 107.4× | 3.92× |
| 5 | 🟢 | Node.js | 124.9/s | 800.8ms | 797.0ms | 55.1MB | 53 B/op | 27.4× | 1.00× |
| 6 | 🟡 | Galerina manifest ⟨interp⟩ | 16.0/s | 62.0ms | 63.0ms | 92.8MB | 721.7 KB/op | 3.51× | 0.13× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 12.0/s | 81.3ms | 125.0ms | 92.7MB | 752.7 KB/op | 2.63× | 0.10× |
| 8 | 🔴 | Python | 4.6/s | 4.38s | 4.39s | — | 23 B/op | 1.00× | 0.04× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (752.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tower-of-hanoi

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 254.65M/s | 514.7ms | — | — | ~0 (native) | 83.4× | 1.94× |
| 🥈 | 🟢 | Rust (generic) | 248.17M/s | 528.1ms | — | — | ~0 (native) | 81.3× | 1.89× |
| 🥉 | 🟢 | Node.js | 131.14M/s | 99.9ms | 94.0ms | 55.2MB | ~0 | 43.0× | 1.00× |
| 4 | 🟢 | WASM ▶ production | 121.73M/s | 1.08s | 1.08s | 95.2MB | ~0 | 39.9× | 0.93× |
| 5 | 🔴 | Python | 3.05M/s | 429.4ms | 437.5ms | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 89.1K/s | 0.1ms | 0.0ms | 95.4MB | 9.7 KB/op | 0.03× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 87.2K/s | 751.4ms | 750.0ms | 94.4MB | 26 B/op | 0.03× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 83.9K/s | 780.7ms | 782.0ms | 94.4MB | 44 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (9.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### collection-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 13.35B/s | 74.9ms | — | — | ~0 (native) | 1.2K× | 189.0× |
| 🥈 | 🟢 | Rust (generic) | 4.31B/s | 231.8ms | — | — | ~0 (native) | 399.6× | 61.1× |
| 🥉 | 🟢 | WASM ▶ production | 420.97M/s | 1.02s | 1.02s | 98.3MB | ~0 | 39.0× | 5.96× |
| 4 | 🟢 | Node.js | 70.64M/s | 707.9ms | 718.0ms | 72.4MB | ~0 | 6.54× | 1.00× |
| 5 | 🟡 | Python | 10.80M/s | 4.63s | 4.63s | — | ~0 | 1.00× | 0.15× |
| 6 | 🟡 | Galerina passive ⟨interp⟩ | 7.87M/s | 0.3ms | 0.0ms | 95.3MB | 177 B/op | 0.73× | 0.11× |
| 7 | 🔴 | Galerina governed ⟨interp⟩ | 2.45M/s | 4.1ms | 0.0ms | 96.3MB | 17 B/op | 0.23× | 0.03× |
| 8 | 🔴 | Galerina manifest ⟨interp⟩ | 2.12M/s | 4.7ms | 0.0ms | 95.3MB | 14 B/op | 0.20× | 0.03× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (177 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### governance-cost ⚠️ (excluded — not unit-aligned)

> internal governed/manifest ratio — native baseline does no governance; not cross-runtime by design

| Runtime | Raw reported throughput (native unit — **NOT comparable**) | Wall |
|---|---|---|
| Rust AVX2 | 892.77M/s | 11.2ms |
| Rust (generic) | 782.93M/s | 12.8ms |
| Node.js | 2.13M/s | 47.0ms |
| Python | 24.9K/s | 4.02s |
| Galerina passive ⟨interp⟩ | 2.0K/s | 1.6ms |
| Galerina manifest ⟨interp⟩ | 813.0/s | 1.2ms |
| Galerina governed ⟨interp⟩ | 769.0/s | 1.3ms |
| WASM ▶ production | 2.90M/s | 1.00s |

### hardware-targets

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 38.42M/s | 1.00s | 1.01s | 98.0MB | ~0 | — | 42.2× |
| 🥈 | 🟢 | Rust AVX2 | 1.19M/s | 840.9ms | — | — | ~0 (native) | — | 1.31× |
| 🥉 | 🟢 | Rust (generic) | 1.18M/s | 845.4ms | — | — | ~0 (native) | — | 1.30× |
| 4 | 🟢 | Node.js | 909.8K/s | 1.10s | 1.09s | 57.0MB | ~0 | — | 1.00× |
| 5 | 🟡 | Galerina passive ⟨interp⟩ | 95.0K/s | 10.5ms | 0.0ms | 97.6MB | 615 B/op | — | 0.10× |
| 6 | ⚫ | Galerina manifest ⟨interp⟩ | 4.2K/s | 0.2ms | 0.0ms | 95.9MB | 79.6 KB/op | — | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 3.6K/s | 0.3ms | 0.0ms | 95.7MB | 81.5 KB/op | — | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina governed ⟨interp⟩ (81.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### low-memory

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 6.18B/s | 161.9ms | — | — | ~0 | 1.7K× | 8.67× |
| 🥈 | 🟢 | Rust (generic) | 1.35B/s | 738.5ms | — | — | ~0 | 366.4× | 1.90× |
| 🥉 | 🟢 | Node.js | 712.35M/s | 70.2ms | 78.0ms | 55.2MB | ~0 | 192.8× | 1.00× |
| 4 | ⚪ | WASM ▶ production | 459.06M/s | 1.00s | 1.00s | 98.0MB | ~0 | 124.2× | 0.64× |
| 5 | ⚫ | Python | 3.70M/s | 2.71s | 2.70s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 157.4K/s | 0.6ms | 0.0ms | 95.7MB | -4.1 KB/op | 0.04× | 0.00× |
| 7 | ⚫ | Galerina governed ⟨interp⟩ | 149.6K/s | 66.8ms | 156.0ms | 95.7MB | 35 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 130.7K/s | 76.5ms | 94.0ms | 96.1MB | 48 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-4.1 KB/op) · **highest:** Galerina manifest ⟨interp⟩ (48 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### gpu-compute

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.19B/s | 4.19s | — | — | ~0 (native) | 149.2× | 1.21× |
| 🥈 | 🟢 | Rust (generic) | 1.19B/s | 4.19s | — | — | ~0 (native) | 149.1× | 1.21× |
| 🥉 | 🟢 | Node.js | 989.29M/s | 505.4ms | 500.0ms | 55.4MB | ~0 | 123.7× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 472.78M/s | 1.06s | 1.05s | 98.7MB | ~0 | 59.1× | 0.48× |
| 5 | ⚫ | Python | 8.00M/s | 6.25s | 6.25s | — | ~0 | 1.00× | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.01M/s | 24.9ms | — | — | — | 0.50× | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 356.0K/s | 0.2ms | 0.0ms | 96.2MB | 3.2 KB/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 313.4K/s | 319.0ms | 391.0ms | 95.8MB | 3 B/op | 0.04× | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 309.3K/s | 323.3ms | 359.0ms | 96.1MB | 2 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (3.2 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### matrix-multiply

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 12.8ms | — | — | — | 227.0× | 2.67× |
| 🥈 | 🟢 | Rust (generic) | 1.51B/s | 86.5ms | — | — | ~0 (native) | 210.4× | 2.48× |
| 🥉 | 🟢 | Rust AVX2 | 1.43B/s | 92.0ms | — | — | ~0 (native) | 198.0× | 2.33× |
| 4 | 🟢 | Node.js | 611.40M/s | 214.4ms | 203.0ms | 57.2MB | ~0 | 84.9× | 1.00× |
| 5 | ⚪ | WASM ▶ production | 441.90M/s | 1.04s | 1.03s | 99.0MB | ~0 | 61.4× | 0.72× |
| 6 | 🔴 | Python | 7.20M/s | 1.82s | — | — | 8 B/op | 1.00× | 0.01× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 839.5K/s | 0.1ms | 0.0ms | 97.5MB | 1.4 KB/op | 0.12× | 0.00× |
| 8 | ⚫ | Galerina manifest ⟨interp⟩ | 720.0K/s | 45.5ms | 48.0ms | 97.5MB | 36 B/op | 0.10× | 0.00× |
| 9 | ⚫ | Galerina governed ⟨interp⟩ | 714.7K/s | 45.9ms | 47.0ms | 97.6MB | 32 B/op | 0.10× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (1.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### crypto-ops

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 5.7K/s | 17.6ms | 47.0ms | 97.8MB | -1.4 KB/op | — | — |
| 🥈 | 🟡 | Galerina manifest ⟨interp⟩ | 2.0K/s | 0.5ms | 0.0ms | 97.6MB | 307.1 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 208.0/s | 4.8ms | 0.0ms | 97.6MB | 325.6 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-1.4 KB/op) · **highest:** Galerina governed ⟨interp⟩ (325.6 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### text-html

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Galerina passive ⟨interp⟩ | 63.1K/s | 1.6ms | 0.0ms | 98.0MB | -2.7 KB/op | — | — |
| 🥈 | 🔴 | Galerina manifest ⟨interp⟩ | 2.4K/s | 0.4ms | 0.0ms | 96.0MB | 152.2 KB/op | — | — |
| 🥉 | 🔴 | Galerina governed ⟨interp⟩ | 952.0/s | 1.1ms | 0.0ms | 97.8MB | 171.3 KB/op | — | — |

> 🧠 **Lowest heap/op:** Galerina passive ⟨interp⟩ (-2.7 KB/op) · **highest:** Galerina governed ⟨interp⟩ (171.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### tri-logic

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 1.40B/s | 428.8ms | — | — | ~0 (native) | 204.6× | 1.40× |
| 🥈 | 🟢 | Rust (generic) | 1.40B/s | 429.7ms | — | — | ~0 (native) | 204.2× | 1.40× |
| 🥉 | 🟢 | Node.js | 1.00B/s | 299.8ms | — | — | ~0 | 146.3× | 1.00× |
| 4 | 🟡 | WASM ▶ production | 463.59M/s | 1.29s | 1.30s | 100.2MB | ~0 | 67.8× | 0.46× |
| 5 | ⚫ | Python | 6.84M/s | 1.75s | — | — | — | 1.00× | 0.01× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 315.0K/s | 1.6ms | 0.0ms | 97.0MB | 533 B/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 304.3K/s | 986.0ms | 1.00s | 96.9MB | 4 B/op | 0.04× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 299.4K/s | 1.00s | 1.05s | 96.8MB | 5 B/op | 0.04× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (533 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### data-query

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 387.91M/s | 128.9ms | — | — | ~0 | 94.2× | 1.00× |
| 🥈 | 🔴 | Python | 4.12M/s | 728.7ms | — | — | — | 1.00× | 0.01× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 267.7K/s | 0.8ms | 0.0ms | 99.3MB | 5.4 KB/op | 0.07× | 0.00× |
| 4 | ⚫ | Galerina manifest ⟨interp⟩ | 227.2K/s | 44.0ms | 47.0ms | 97.8MB | 69 B/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina governed ⟨interp⟩ | 204.5K/s | 48.9ms | 109.0ms | 99.4MB | 203 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** Node.js (~0) · **highest:** Galerina passive ⟨interp⟩ (5.4 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### call-chain

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 277.60M/s | 7.2ms | 0.0ms | 56.3MB | ~0 | 194.5× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 55.19M/s | 1.81s | 1.81s | 101.6MB | ~0 | 38.7× | 0.20× |
| 🥉 | ⚫ | Python | 1.43M/s | 700.5ms | 703.1ms | — | ~0 | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 55.0K/s | 0.1ms | 0.0ms | 98.4MB | 18.7 KB/op | 0.04× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 50.3K/s | 994.9ms | 1.01s | 98.4MB | 25 B/op | 0.04× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 48.5K/s | 1.03s | 1.05s | 98.3MB | 6 B/op | 0.03× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (18.7 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### nbody

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 122.52M/s | 53.5ms | 47.0ms | 57.6MB | ~0 | 113.1× | 1.00× |
| 🥈 | 🟡 | WASM ▶ production | 29.30M/s | 1.12s | 1.11s | 99.7MB | ~0 | 27.0× | 0.24× |
| 🥉 | ⚫ | Python | 1.08M/s | 1.51s | — | — | 12 B/op | 1.00× | 0.01× |
| 4 | ⚫ | Galerina passive ⟨interp⟩ | 59.6K/s | 0.2ms | 0.0ms | 97.2MB | 16.0 KB/op | 0.06× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 57.8K/s | 566.5ms | 593.0ms | 97.0MB | 12 B/op | 0.05× | 0.00× |
| 6 | ⚫ | Galerina governed ⟨interp⟩ | 56.6K/s | 579.4ms | 594.0ms | 97.5MB | 23 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (16.0 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### json-parse

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 3.16M/s | — | — | — | — | 6.26× | 1.00× |
| 🥈 | 🟡 | Python | 504.5K/s | — | — | — | 1 B/op | 1.00× | 0.16× |
| 🥉 | ⚫ | Galerina passive ⟨interp⟩ | 9.4K/s | 0.4ms | 0.0ms | 101.1MB | 111.5 KB/op | 0.02× | 0.00× |
| 4 | ⚫ | Galerina governed ⟨interp⟩ | 5.5K/s | 91.1ms | 109.0ms | 106.1MB | 5.2 KB/op | 0.01× | 0.00× |
| 5 | ⚫ | Galerina manifest ⟨interp⟩ | 5.3K/s | 94.6ms | 140.0ms | 100.1MB | 1.9 KB/op | 0.01× | 0.00× |

> 🧠 **Lowest heap/op:** Python (1 B/op) · **highest:** Galerina passive ⟨interp⟩ (111.5 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### mandelbrot

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 23.43M/s | 139.8ms | — | — | ~0 (native) | 158.5× | 3.41× |
| 🥈 | 🟢 | Rust (generic) | 23.34M/s | 140.4ms | — | — | ~0 (native) | 157.9× | 3.40× |
| 🥉 | 🟢 | WASM ▶ production | 9.06M/s | 1.81s | 1.81s | 101.4MB | ~0 | 61.3× | 1.32× |
| 4 | 🟢 | Node.js | 6.87M/s | 477.0ms | 484.0ms | 57.2MB | ~0 | 46.5× | 1.00× |
| 5 | 🔴 | Python | 147.8K/s | 22.17s | — | — | ~0 | 1.00× | 0.02× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 7.4K/s | 0.2ms | 0.0ms | 99.7MB | 137.3 KB/op | 0.05× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 7.3K/s | 2.24s | 2.25s | 99.4MB | 66 B/op | 0.05× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 7.2K/s | 2.26s | 2.27s | 101.1MB | 9 B/op | 0.05× | 0.00× |

> 🧠 **Lowest heap/op:** WASM ▶ production (~0) · **highest:** Galerina passive ⟨interp⟩ (137.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spectral-norm

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 379.25M/s | 26.4ms | — | — | ~0 (native) | 219.4× | 1.57× |
| 🥈 | 🟢 | Rust AVX2 | 374.47M/s | 26.7ms | — | — | ~0 (native) | 216.6× | 1.55× |
| 🥉 | 🟢 | Node.js | 241.13M/s | 41.5ms | 47.0ms | 56.9MB | ~0 | 139.5× | 1.00× |
| 4 | ⚫ | Python | 1.73M/s | 5.79s | — | — | ~0 | 1.00× | 0.01× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (~0). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### binary-trees

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | WASM ▶ production | 591.10M/s | 1.15s | 1.14s | 102.6MB | ~0 | 205.5× | 7.58× |
| 🥈 | 🟢 | Node.js | 78.01M/s | 1.7ms | 0.0ms | 57.2MB | 3 B/op | 27.1× | 1.00× |
| 🥉 | 🟡 | Rust AVX2 | 16.64M/s | 8.2ms | — | — | ~0 (native) | 5.78× | 0.21× |
| 4 | 🟡 | Rust (generic) | 15.34M/s | 8.9ms | — | — | ~0 (native) | 5.33× | 0.20× |
| 5 | 🔴 | Python | 2.88M/s | 47.2ms | 46.9ms | — | ~0 | 1.00× | 0.04× |
| 6 | ⚫ | Galerina passive ⟨interp⟩ | 383.1K/s | 0.1ms | 0.0ms | 101.3MB | 2.3 KB/op | 0.13× | 0.00× |
| 7 | ⚫ | Galerina manifest ⟨interp⟩ | 351.3K/s | 386.8ms | 453.0ms | 101.3MB | 13 B/op | 0.12× | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 338.0K/s | 401.9ms | 469.0ms | 101.4MB | 8 B/op | 0.12× | 0.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Galerina passive ⟨interp⟩ (2.3 KB/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### spore-container

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust (generic) | 163.6K/s | 1.83s | — | — | ~0 (native) | 2.45× | 3.74× |
| 🥈 | 🟢 | Rust AVX2 | 163.4K/s | 1.84s | — | — | ~0 (native) | 2.44× | 3.73× |
| 🥉 | 🟢 | Python | 66.8K/s | 1.50s | — | — | ~0 | 1.00× | 1.53× |
| 4 | 🟢 | Node.js | 43.8K/s | 6.85s | 8.20s | 72.6MB | 6 B/op | 0.66× | 1.00× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (6 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

### framework-pipeline

| # | 🚦 | Runtime | Throughput | Wall | CPU | RSS | Heap/op | vs Python | vs Node |
|---|---|---|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Node.js | 392.9K/s | 509.0ms | 1.11s | 83.6MB | 30 B/op | 3.43× | 1.00× |
| 🥈 | 🟡 | Python | 114.4K/s | 1.75s | — | — | ~0 | 1.00× | 0.29× |

> 🧠 **Lowest heap/op:** Python (~0) · **highest:** Node.js (30 B/op). Native Rust/C++ allocate ~0 (no GC heap); a positive figure is GC-managed allocation pressure.

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

**GPU detected:** NVIDIA GeForce RTX 2060 (driver 610.74, 6144 MiB)
**Compute toolchain:** NVIDIA GeForce RTX 2060 — GPU compute available.
**Deno WebGPU:** ✅ available — real GPU dispatch enabled (NVIDIA GeForce RTX 2060)
**Galerina GPU backend:** `not-implemented` — gpu-plan.ts emits a WGSL skeleton only; no dispatch path (pending Phase 38).

| # | 🚦 | Runtime | Device (🖥️ CPU / 🎮 GPU) | Throughput (kernel ops/s) | Wall | vs Node |
|---|---|---|---|---|---|---|
| 🥇 | 🟢 | Rust AVX2 | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.19s | 1.21× |
| 🥈 | 🟢 | Rust (generic) | 🖥️ CPU (cpu (serial)) | 1.19B/s | 4.19s | 1.21× |
| 🥉 | 🟢 | Node.js | 🖥️ CPU (cpu (serial)) | 989.29M/s | 505.4ms | 1.00× |
| 4 | 🟡 | WASM ▶ production | 🖥️ CPU (cpu (wasm)) | 472.78M/s | 1.06s | 0.48× |
| 5 | ⚫ | Python | 🖥️ CPU (cpu (serial)) | 8.00M/s | 6.25s | 0.01× |
| 6 | ⚫ | Deno WebGPU (NVIDIA GeForce RTX 2060) | 🎮 GPU (gpu (WebGPU — NVIDIA GeForce RTX 2060)) | 4.01M/s | 24.9ms | 0.00× |
| 7 | ⚫ | Galerina passive ⟨interp⟩ | 🖥️ CPU (cpu) | 356.0K/s | 0.2ms | 0.00× |
| 8 | ⚫ | Galerina governed ⟨interp⟩ | 🖥️ CPU (cpu) | 313.4K/s | 319.0ms | 0.00× |
| 9 | ⚫ | Galerina manifest ⟨interp⟩ | 🖥️ CPU (cpu) | 309.3K/s | 323.3ms | 0.00× |

**GPU execution status (this machine):**

| Runtime | GPU path | Device | Status |
|---|---|---|---|
| Rust | wgpu (Vulkan/D3D12) | 🖥️ CPU (GPU pending) | 🔧 buildable (cargo present, harness pending) |
| Python | torch CUDA / cupy | 🖥️ CPU (GPU pending) | ⏳ toolchain required (CPU-only torch) |
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

| Benchmark | 🏆 Winner | Rust AVX2 | Rust (generic) | C++ | Node.js | Python | Galerina passive ⟨interp⟩ | Galerina manifest ⟨interp⟩ | Galerina governed ⟨interp⟩ | WASM ▶ production | Deno WebGPU (NVIDIA GeForce RTX 2060) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **compute-mix** | Node.js | **🏆 winner** | **🏆 winner** | **🏆 winner** | **🏆 winner** | **171× slower** | **62× slower** | **76× slower** | **81× slower** | 2× slower | not run — no GPU path |
| **arithmetic-threshold** | C++ | 1.2× slower | 1.2× slower | **🏆 winner** | 2× slower | **483× slower** | **49.9K× slower** | **352× slower** | **364× slower** | 4× slower | not run — no GPU path |
| **six-digit-guess** | Rust (generic) | **🏆 winner** | **🏆 winner** | 1.1× slower | **34× slower** | **900× slower** | **3.1K× slower** | **1.7K× slower** | **1.8K× slower** | 2× slower | not run — no GPU path |
| **record-allocation** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | **23× slower** | **374× slower** | **146× slower** | **454× slower** | **487× slower** | 2× slower | not run — no GPU path |
| **fibonacci-recursive** | Galerina passive ⟨interp⟩ | **134× slower** | **135× slower** | not run — no C++ impl | **530× slower** | **14.5K× slower** | **🏆 winner** | **4.1K× slower** | **5.5K× slower** | 4× slower | not run — no GPU path |
| **tower-of-hanoi** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 2× slower | **83× slower** | **2.9K× slower** | **2.9K× slower** | **3.0K× slower** | 2× slower | not run — no GPU path |
| **collection-pipeline** | Rust AVX2 | **🏆 winner** | 3× slower | not run — no C++ impl | **189× slower** | **1.2K× slower** | **1.7K× slower** | **6.3K× slower** | **5.4K× slower** | **32× slower** | not run — no GPU path |
| **hardware-targets** | WASM ▶ production | **32× slower** | **32× slower** | not run — no C++ impl | **42× slower** | not run | **405× slower** | **9.2K× slower** | **10.8K× slower** | **🏆 winner** | not run — no GPU path |
| **low-memory** | Rust AVX2 | **🏆 winner** | 5× slower | not run — no C++ impl | 9× slower | **1.7K× slower** | **39.2K× slower** | **47.3K× slower** | **41.3K× slower** | **13× slower** | not run — no GPU path |
| **gpu-compute** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 1.2× slower | **149× slower** | **3.4K× slower** | **3.9K× slower** | **3.8K× slower** | 3× slower | **297× slower** |
| **matrix-multiply** | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.1× slower | 1.1× slower | not run — no C++ impl | 3× slower | **227× slower** | **1.9K× slower** | **2.3K× slower** | **2.3K× slower** | 4× slower | **🏆 winner** |
| **crypto-ops** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **🏆 winner** | 3× slower | **27× slower** | no WASM — strings/records | not run — no GPU path |
| **text-html** | Galerina passive ⟨interp⟩ | no comparable metric | no comparable metric | not run — no C++ impl | no comparable metric | no comparable metric | **🏆 winner** | **26× slower** | **66× slower** | no WASM — strings/records | not run — no GPU path |
| **tri-logic** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 1.4× slower | **205× slower** | **4.4K× slower** | **4.6K× slower** | **4.7K× slower** | 3× slower | not run — no GPU path |
| **data-query** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **94× slower** | **1.4K× slower** | **1.7K× slower** | **1.9K× slower** | no WASM build | not run — no GPU path |
| **call-chain** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **194× slower** | **5.0K× slower** | **5.5K× slower** | **5.7K× slower** | 5× slower | not run — no GPU path |
| **nbody** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | **113× slower** | **2.1K× slower** | **2.1K× slower** | **2.2K× slower** | 4× slower | not run — no GPU path |
| **json-parse** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | 6× slower | **337× slower** | **598× slower** | **576× slower** | no WASM — strings/records | not run — no GPU path |
| **mandelbrot** | Rust AVX2 | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 3× slower | **159× slower** | **3.2K× slower** | **3.2K× slower** | **3.2K× slower** | 3× slower | not run — no GPU path |
| **spectral-norm** | Rust (generic) | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 2× slower | **219× slower** | not run | not run | not run | no WASM build | not run — no GPU path |
| **binary-trees** | WASM ▶ production | **36× slower** | **39× slower** | not run — no C++ impl | 8× slower | **205× slower** | **1.5K× slower** | **1.7K× slower** | **1.7K× slower** | **🏆 winner** | not run — no GPU path |
| **spore-container** | Rust (generic) | **🏆 winner** | **🏆 winner** | not run — no C++ impl | 4× slower | 2× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |
| **framework-pipeline** | Node.js | not run — no native impl | not run — no native impl | not run — no C++ impl | **🏆 winner** | 3× slower | not run | not run | not run | no WASM — strings/records | not run — no GPU path |

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
| 🥇 | Node.js | 136.21M/s | 🏆 winner | 171× faster |
| 🥈 | C++ | 133.51M/s | 1.0× slower | 167× faster |
| 🥉 | Rust (generic) | 132.85M/s | 1.0× slower | 167× faster |
| 4 | Rust AVX2 | 130.34M/s | 1.0× slower | 163× faster |
| 5 | WASM ▶ production | 78.31M/s | 1.7× slower | 98× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 2.20M/s | 62× slower | 2.8× faster |
| 7 | Galerina manifest ⟨interp⟩ | 1.78M/s | 76× slower | 2.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 1.69M/s | 81× slower | 2.1× faster |
| 9 | Python | 797.8K/s | 171× slower | — (slowest) |

### arithmetic-threshold
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | C++ | 1.88B/s | 🏆 winner | 49.9K× faster |
| 🥈 | Rust AVX2 | 1.59B/s | 1.2× slower | 42.0K× faster |
| 🥉 | Rust (generic) | 1.55B/s | 1.2× slower | 41.1K× faster |
| 4 | Node.js | 972.22M/s | 1.9× slower | 25.7K× faster |
| 5 | WASM ▶ production | 493.79M/s | 3.8× slower | 13.1K× faster |
| 6 | Galerina manifest ⟨interp⟩ | 5.35M/s | 352× slower | 142× faster |
| 7 | Galerina governed ⟨interp⟩ | 5.17M/s | 364× slower | 137× faster |
| 8 | Python | 3.90M/s | 483× slower | 103× faster |
| 9 | Galerina passive ⟨interp⟩ ⚠️cache | 37.8K/s | 49.9K× slower | — (slowest) |

### six-digit-guess
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 77.81M/s | 🏆 winner | 3.1K× faster |
| 🥈 | Rust AVX2 | 76.05M/s | 1.0× slower | 3.1K× faster |
| 🥉 | C++ | 69.22M/s | 1.1× slower | 2.8K× faster |
| 4 | WASM ▶ production | 36.20M/s | 2.1× slower | 1.5K× faster |
| 5 | Node.js | 2.30M/s | 34× slower | 93× faster |
| 6 | Python | 86.5K/s | 900× slower | 3.5× faster |
| 7 | Galerina manifest ⟨interp⟩ | 46.0K/s | 1.7K× slower | 1.9× faster |
| 8 | Galerina governed ⟨interp⟩ | 44.3K/s | 1.8K× slower | 1.8× faster |
| 9 | Galerina passive ⟨interp⟩ ⚠️cache | 24.7K/s | 3.1K× slower | — (slowest) |

### record-allocation
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.18B/s | 🏆 winner | 487× faster |
| 🥈 | Rust (generic) | 1.17B/s | 1.0× slower | 486× faster |
| 🥉 | WASM ▶ production | 536.48M/s | 2.2× slower | 222× faster |
| 4 | Node.js | 52.06M/s | 23× slower | 22× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 8.04M/s | 146× slower | 3.3× faster |
| 6 | Python | 3.14M/s | 374× slower | 1.3× faster |
| 7 | Galerina manifest ⟨interp⟩ | 2.59M/s | 454× slower | 1.1× faster |
| 8 | Galerina governed ⟨interp⟩ | 2.42M/s | 487× slower | — (slowest) |

### fibonacci-recursive
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: WASM ▶ production at 17.1K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 66.1K/s | 🏆 winner | 14.5K× faster |
| 🥈 | WASM ▶ production | 17.1K/s | 3.9× slower | 3.7K× faster |
| 🥉 | Rust AVX2 | 494.3/s | 134× slower | 108× faster |
| 4 | Rust (generic) | 489.6/s | 135× slower | 107× faster |
| 5 | Node.js | 124.9/s | 530× slower | 27× faster |
| 6 | Galerina manifest ⟨interp⟩ | 16.0/s | 4.1K× slower | 3.5× faster |
| 7 | Galerina governed ⟨interp⟩ | 12.0/s | 5.5K× slower | 2.6× faster |
| 8 | Python | 4.6/s | 14.5K× slower | — (slowest) |

### tower-of-hanoi
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 254.65M/s | 🏆 winner | 3.0K× faster |
| 🥈 | Rust (generic) | 248.17M/s | 1.0× slower | 3.0K× faster |
| 🥉 | Node.js | 131.14M/s | 1.9× slower | 1.6K× faster |
| 4 | WASM ▶ production | 121.73M/s | 2.1× slower | 1.5K× faster |
| 5 | Python | 3.05M/s | 83× slower | 36× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 89.1K/s | 2.9K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 87.2K/s | 2.9K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 83.9K/s | 3.0K× slower | — (slowest) |

### collection-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 13.35B/s | 🏆 winner | 6.3K× faster |
| 🥈 | Rust (generic) | 4.31B/s | 3.1× slower | 2.0K× faster |
| 🥉 | WASM ▶ production | 420.97M/s | 32× slower | 198× faster |
| 4 | Node.js | 70.64M/s | 189× slower | 33× faster |
| 5 | Python | 10.80M/s | 1.2K× slower | 5.1× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 7.87M/s | 1.7K× slower | 3.7× faster |
| 7 | Galerina governed ⟨interp⟩ | 2.45M/s | 5.4K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 2.12M/s | 6.3K× slower | — (slowest) |

### hardware-targets
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 38.42M/s | 🏆 winner | 10.8K× faster |
| 🥈 | Rust AVX2 | 1.19M/s | 32× slower | 333× faster |
| 🥉 | Rust (generic) | 1.18M/s | 32× slower | 331× faster |
| 4 | Node.js | 909.8K/s | 42× slower | 255× faster |
| 5 | Galerina passive ⟨interp⟩ ⚠️cache | 95.0K/s | 405× slower | 27× faster |
| 6 | Galerina manifest ⟨interp⟩ | 4.2K/s | 9.2K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 3.6K/s | 10.8K× slower | — (slowest) |

### low-memory
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 6.18B/s | 🏆 winner | 47.3K× faster |
| 🥈 | Rust (generic) | 1.35B/s | 4.6× slower | 10.4K× faster |
| 🥉 | Node.js | 712.35M/s | 8.7× slower | 5.5K× faster |
| 4 | WASM ▶ production | 459.06M/s | 13× slower | 3.5K× faster |
| 5 | Python | 3.70M/s | 1.7K× slower | 28× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 157.4K/s | 39.2K× slower | 1.2× faster |
| 7 | Galerina governed ⟨interp⟩ | 149.6K/s | 41.3K× slower | 1.1× faster |
| 8 | Galerina manifest ⟨interp⟩ | 130.7K/s | 47.3K× slower | — (slowest) |

### gpu-compute
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.19B/s | 🏆 winner | 3.9K× faster |
| 🥈 | Rust (generic) | 1.19B/s | 1.0× slower | 3.9K× faster |
| 🥉 | Node.js | 989.29M/s | 1.2× slower | 3.2K× faster |
| 4 | WASM ▶ production | 472.78M/s | 2.5× slower | 1.5K× faster |
| 5 | Python | 8.00M/s | 149× slower | 26× faster |
| 6 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 4.01M/s | 297× slower | 13× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 356.0K/s | 3.4K× slower | 1.2× faster |
| 8 | Galerina governed ⟨interp⟩ | 313.4K/s | 3.8K× slower | 1.0× faster |
| 9 | Galerina manifest ⟨interp⟩ | 309.3K/s | 3.9K× slower | — (slowest) |

### matrix-multiply
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Deno WebGPU (NVIDIA GeForce RTX 2060) | 1.63B/s | 🏆 winner | 2.3K× faster |
| 🥈 | Rust (generic) | 1.51B/s | 1.1× slower | 2.1K× faster |
| 🥉 | Rust AVX2 | 1.43B/s | 1.1× slower | 2.0K× faster |
| 4 | Node.js | 611.40M/s | 2.7× slower | 855× faster |
| 5 | WASM ▶ production | 441.90M/s | 3.7× slower | 618× faster |
| 6 | Python | 7.20M/s | 227× slower | 10× faster |
| 7 | Galerina passive ⟨interp⟩ ⚠️cache | 839.5K/s | 1.9K× slower | 1.2× faster |
| 8 | Galerina manifest ⟨interp⟩ | 720.0K/s | 2.3K× slower | 1.0× faster |
| 9 | Galerina governed ⟨interp⟩ | 714.7K/s | 2.3K× slower | — (slowest) |

### crypto-ops
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.0K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 5.7K/s | 🏆 winner | 27× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.0K/s | 2.8× slower | 9.6× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 208.0/s | 27× slower | — (slowest) |

### text-html
> 🏆 cache-hit "winner" is Galerina passive (memoised); **real compute winner: Galerina manifest ⟨interp⟩ at 2.4K/s**.
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Galerina passive ⟨interp⟩ ⚠️cache | 63.1K/s | 🏆 winner | 66× faster |
| 🥈 | Galerina manifest ⟨interp⟩ | 2.4K/s | 26× slower | 2.6× faster |
| 🥉 | Galerina governed ⟨interp⟩ | 952.0/s | 66× slower | — (slowest) |

### tri-logic
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 1.40B/s | 🏆 winner | 4.7K× faster |
| 🥈 | Rust (generic) | 1.40B/s | 1.0× slower | 4.7K× faster |
| 🥉 | Node.js | 1.00B/s | 1.4× slower | 3.3K× faster |
| 4 | WASM ▶ production | 463.59M/s | 3.0× slower | 1.5K× faster |
| 5 | Python | 6.84M/s | 205× slower | 23× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 315.0K/s | 4.4K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 304.3K/s | 4.6K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 299.4K/s | 4.7K× slower | — (slowest) |

### data-query
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 387.91M/s | 🏆 winner | 1.9K× faster |
| 🥈 | Python | 4.12M/s | 94× slower | 20× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 267.7K/s | 1.4K× slower | 1.3× faster |
| 4 | Galerina manifest ⟨interp⟩ | 227.2K/s | 1.7K× slower | 1.1× faster |
| 5 | Galerina governed ⟨interp⟩ | 204.5K/s | 1.9K× slower | — (slowest) |

### call-chain
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 277.60M/s | 🏆 winner | 5.7K× faster |
| 🥈 | WASM ▶ production | 55.19M/s | 5.0× slower | 1.1K× faster |
| 🥉 | Python | 1.43M/s | 194× slower | 29× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 55.0K/s | 5.0K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 50.3K/s | 5.5K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 48.5K/s | 5.7K× slower | — (slowest) |

### nbody
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 122.52M/s | 🏆 winner | 2.2K× faster |
| 🥈 | WASM ▶ production | 29.30M/s | 4.2× slower | 518× faster |
| 🥉 | Python | 1.08M/s | 113× slower | 19× faster |
| 4 | Galerina passive ⟨interp⟩ ⚠️cache | 59.6K/s | 2.1K× slower | 1.1× faster |
| 5 | Galerina manifest ⟨interp⟩ | 57.8K/s | 2.1K× slower | 1.0× faster |
| 6 | Galerina governed ⟨interp⟩ | 56.6K/s | 2.2K× slower | — (slowest) |

### json-parse
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 3.16M/s | 🏆 winner | 598× faster |
| 🥈 | Python | 504.5K/s | 6.3× slower | 95× faster |
| 🥉 | Galerina passive ⟨interp⟩ ⚠️cache | 9.4K/s | 337× slower | 1.8× faster |
| 4 | Galerina governed ⟨interp⟩ | 5.5K/s | 576× slower | 1.0× faster |
| 5 | Galerina manifest ⟨interp⟩ | 5.3K/s | 598× slower | — (slowest) |

### mandelbrot
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust AVX2 | 23.43M/s | 🏆 winner | 3.2K× faster |
| 🥈 | Rust (generic) | 23.34M/s | 1.0× slower | 3.2K× faster |
| 🥉 | WASM ▶ production | 9.06M/s | 2.6× slower | 1.3K× faster |
| 4 | Node.js | 6.87M/s | 3.4× slower | 949× faster |
| 5 | Python | 147.8K/s | 159× slower | 20× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 7.4K/s | 3.2K× slower | 1.0× faster |
| 7 | Galerina manifest ⟨interp⟩ | 7.3K/s | 3.2K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 7.2K/s | 3.2K× slower | — (slowest) |

### spectral-norm
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 379.25M/s | 🏆 winner | 219× faster |
| 🥈 | Rust AVX2 | 374.47M/s | 1.0× slower | 217× faster |
| 🥉 | Node.js | 241.13M/s | 1.6× slower | 140× faster |
| 4 | Python | 1.73M/s | 219× slower | — (slowest) |

### binary-trees
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | WASM ▶ production | 591.10M/s | 🏆 winner | 1.7K× faster |
| 🥈 | Node.js | 78.01M/s | 7.6× slower | 231× faster |
| 🥉 | Rust AVX2 | 16.64M/s | 36× slower | 49× faster |
| 4 | Rust (generic) | 15.34M/s | 39× slower | 45× faster |
| 5 | Python | 2.88M/s | 205× slower | 8.5× faster |
| 6 | Galerina passive ⟨interp⟩ ⚠️cache | 383.1K/s | 1.5K× slower | 1.1× faster |
| 7 | Galerina manifest ⟨interp⟩ | 351.3K/s | 1.7K× slower | 1.0× faster |
| 8 | Galerina governed ⟨interp⟩ | 338.0K/s | 1.7K× slower | — (slowest) |

### spore-container
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Rust (generic) | 163.6K/s | 🏆 winner | 3.7× faster |
| 🥈 | Rust AVX2 | 163.4K/s | 1.0× slower | 3.7× faster |
| 🥉 | Python | 66.8K/s | 2.4× slower | 1.5× faster |
| 4 | Node.js | 43.8K/s | 3.7× slower | — (slowest) |

### framework-pipeline
| # | Runtime | Throughput | ×vs winner | ×vs slowest |
|---|---|---|---|---|
| 🥇 | Node.js | 392.9K/s | 🏆 winner | 3.4× faster |
| 🥈 | Python | 114.4K/s | 3.4× slower | — (slowest) |


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

