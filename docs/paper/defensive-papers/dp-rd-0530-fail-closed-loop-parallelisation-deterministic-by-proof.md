# Loop parallelisation under a fail-closed default: deterministic-by-proof classification, a parallel≡serial differential, shared-nothing isolates, and a fuel/concurrency/capability token spine

**Disclosure ID:** DP-RD-0530 · **Date:** 2026-07-25 · **Type:** defensive publication (prior-art disclosure — NOT a patent claim) · **Provenance:** KB RD-0530 (the underlying algorithms are cited to their public sources below). Design-stage; mechanisms specified, not yet implemented; no performance number is claimed.

## Purpose

Loop parallelisation is normally presented as an optimisation whose *correctness* is the programmer's to guarantee: the compiler offers threads, and the soundness of the independence assumption is taken on trust rather than proven. In a governed, determinism-required system that division of responsibility is itself unsafe by default — the most dangerous transform is the one that is *usually* right. This publication records a construction that inverts the default: parallelisation is **off unless proven safe**, the parallel run must be **proven equal to the serial run** before it may ship, and the concurrency degree is made **provably unable to change the result**. The design parallelises only the class it can prove order-independent and runs everything else serially, so the fail-closed shape survives parallel execution.

## The construction

1. **Compile-time safety classification (the gate).** Each loop is classified into exactly one of: **(a) DOALL** — provably no cross-iteration dependence, no shared mutable state, no ungoverned effect; **(b) associative-commutative reduction** — the body is a fold over a fixed, blessed set of associative operators (e.g. the Kleene meet/join and balanced-ternary sum, whose associativity is machine-checked against the standard definitions); or **(c) serial** — everything else. General dependence analysis is undecidable (Allen–Kennedy), so the classifier is **conservative by construction**: anything it cannot prove independent or associative is serial. Serial is the default; parallelism is the earned exception, never a guess.

2. **The parallel≡serial differential (the determinism lock).** For every loop the classifier marks parallel, the build **asserts the parallel result equals the serial result, byte-for-byte**, over a test corpus; a divergence **rejects the transform** rather than shipping it. Order-independence is not *assumed* from the classification — it is *checked* against a serial oracle. This differential is the load-bearing safety component and is built and adversarially tested before any thread is spawned.

3. **Shared-nothing isolates (no races by construction).** A parallelisable loop is fractured into chunks, each executed in a **shared-nothing isolate** — no live pointers cross the boundary, no global mutable state, bounded linear memory — and the chunks are combined by the loop's own associative operator. With no shared memory there is **no data race and nothing to synchronise**. This is a deliberate rejection of shared-memory threading: shared memory plus atomics reintroduce exactly the scheduling-dependent nondeterminism the determinism requirement forbids, and deterministic replay of racy programs has no robust general solution.

4. **Cache-tiled working sets, capacity-bounded.** Each chunk's working set is **tiled to a cache-capacity bound** (classical loop tiling for locality) and kept resident under a **compiler-enforced residency ceiling** so a tile holding sensitive data does not spill to swap. A working set that exceeds the tile bound **falls back to streaming** memory/compute — the capacity bound is itself fail-closed, never a silent cache overflow.

5. **The three-token spine (bounded, explicit resource use).** Three orthogonal tokens bound the parallel form so that resource use is explicit and fail-closed:
   - a **fuel token per chunk** — an iteration counter that **traps past its budget**, bounding each chunk's *duration* and killing runaways (this generalises a per-loop fuel cap the system already emits for every loop);
   - a **concurrency-permit pool of N permits** — a chunk must **acquire** a permit before it spawns and **release** it on completion, bounding parallel *degree* (least privilege: N permits ⇒ at most N concurrent isolates ⇒ a bounded memory-and-core blast radius). An empty pool means the next chunk runs **serially**, never a spawn beyond N;
   - a **capability token** — the authority to parallelise at all (to set N>1) is gated on a read-only capability register; **absent ⇒ N=1 ⇒ serial** by default.
   - **The result-invariance property (the crux).** Because the parallelised class is order-independent, the degree **N governs scheduling and resource use but cannot change the computed result**: `result(N=1) = result(N=k)`, byte-for-byte. The parallel≡serial differential (2) *is* the proof that N is result-neutral, so the degree is a pure latency knob and never a correctness one. Merged diagnostics are ordered by source position, never by completion order, so the compilation stays reproducible regardless of scheduling.

6. **Accelerate ≠ adjudicate.** A parallel (or otherwise accelerated) lane **computes**; it never makes the security decision. A reduction over *governance* values must use the **fail-closed meet** (Kleene `min`) and never a wrapping arithmetic sum — a balanced-ternary sum can raise an ALLOW out of two DENYs, so it is disqualified as a governance combine. Acceleration and thread placement are choices under the correctness axis; **placement is never authority**.

7. **Honest speedup (span, not work).** Parallelism reduces critical-path latency (**span**), never total operations (**work**); a free parallel core still yields roughly 1× when the parallel fraction is small (Amdahl). The transform is therefore **gated on a measured parallel-fraction threshold** — the parallel form is emitted only where it demonstrably pays, and serial is kept otherwise. No speculative parallelism.

## Prior art (novelty disclaimed)

Every algorithm composed here is established: deterministic-by-default parallelism with a compile-time type-and-effect proof (Bocchino et al., DPJ); associative parallel scan/reduce (Blelloch); loop dependence analysis and DOALL detection, with dependence undecidable ⇒ conservative (Allen–Kennedy); confluent graph reduction as a lock-free basis for parallelism (Lafont, interaction combinators); cache tiling/blocking for locality (Wolf–Lam); and the Amdahl speedup ceiling. **No novelty is claimed over any of them.** The disclosed contribution — recorded as prior art — is the **zero-trust composition**: a *serial-by-default* classifier that parallelises only a provably order-independent class; a **parallel≡serial byte differential** as the determinism lock that rejects any transform it cannot confirm; **order-independence doubling as the proof that concurrency degree is result-neutral** (so a scheduling knob provably cannot corrupt a result); and a **fuel / concurrency / capability token spine** that bounds duration, degree, and authority independently, defaulting to serial whenever any budget or capability is absent.

## Honest bound

Parallelism here is neither free nor always a win, and the note claims otherwise nowhere. It reduces span, not work, so a small parallel fraction buys little — which is why the transform is measurement-gated. The classifier is deliberately conservative, so many loops remain serial; that is a correctness choice, not an omission. The shared-nothing isolate boundary costs a bounded copy, and the residency-bounded tile costs what it holds. Every actual speedup figure is **deferred to measured benchmarks on named hardware**. The single claim is that the **fail-closed shape survives at parallel speed**: the provably-safe class runs in parallel deterministically and byte-identically to serial, and everything else runs serially by default.

## Declarations

- **Type / tier:** Defensive publication (prior-art disclosure), **design-stage**. Not a patent claim and not a novelty claim; filed to establish prior art for an engineering composition of established primitives.
- **Authorship & AI assistance:** Drafted with AI assistance under human direction, grounded in the cited primary sources and the project's internal design record.
- **Funding:** None.
- **Competing interests:** None.
- **Data / artifact availability:** No datasets. The composition is design-stage; no runnable artifact or benchmark accompanies this disclosure, and every performance figure is deferred to measured benchmarks on named hardware.
- **Licence:** Apache-2.0.

## Citations (primary)

- Lafont, Y. (1997). *Interaction Combinators.* Information and Computation **137**(1):69–101. DOI 10.1006/inco.1997.2643. — confluence as a lock-free basis for parallel reduction. **Foundational.**
- Blelloch, G. E. (1990). *Prefix Sums and Their Applications.* Technical Report CMU-CS-90-190, Carnegie Mellon University. — associative parallel scan/reduce (O(n) work, O(log n) span). **Foundational.**
- Allen, R. & Kennedy, K. (1987). *Automatic Translation of Fortran Programs to Vector Form.* ACM TOPLAS **9**(4):491–542. — loop dependence analysis and DOALL; dependence undecidable ⇒ conservative parallelisation. **Foundational.**
- Bocchino, R. L. et al. (2009). *A Type and Effect System for Deterministic Parallel Java.* OOPSLA '09. DOI 10.1145/1640089.1640097. — deterministic-by-default parallelism proven at compile time; does not compile unless provably deterministic (fail-closed). **Foundational for the zero-trust model.**
- Wolf, M. E. & Lam, M. S. (1991). *A Data Locality Optimizing Algorithm.* PLDI '91. — loop tiling/blocking for cache locality. **Foundational.**
- Amdahl, G. M. (1967). *Validity of the Single Processor Approach to Achieving Large Scale Computing Capabilities.* AFIPS '67. — the speedup ceiling; parallelism is span, not work. **Foundational caution.**

*Contact hello@trithypha.dev.*
