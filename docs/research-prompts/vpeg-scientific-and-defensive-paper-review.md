# Independent review prompt — VPEG scientific and defensive-paper case

Date: 2026-07-30

You are an independent compiler, graph-systems, computer-architecture and
security researcher. Assess whether Galerina/SLIDE's Verified Parametric
Execution Graph (VPEG) and deterministic Shape Fabric justify a scientific
paper, a defensive publication, both, or neither. Do not write promotional
copy. Separate established techniques from the proposed composition and
require falsifiable evidence.

Repositories:

- `<WORKSPACE>/Galerina`
- `<WORKSPACE>/SLIDE`
- `<WORKSPACE>/ZTF-Knowledge-Bases`

Read at minimum:

- `Galerina/docs/research-prompts/slide-deterministic-shape-memory-independent-review.md`
- relevant VPEG/Shape Fabric decisions and R&D records found through the
  repository indexes;
- `Galerina/docs/architecture/slide-v2-integration-2026-07-29.md`
- `SLIDE/docs/NESTING-AND-XOR-DECISION.md`
- `SLIDE/docs/SLIDE-COMPONENT-ARCHITECTURE.svg` if present;
- `Galerina/docs/paper/README.md`;
- current executable evidence only—do not treat a plan or diagram as a result.

System constraints:

- K3/Tri −1 governance must work on ordinary binary silicon today;
- only exact ALLOW authorizes; INDETERMINATE and DENY exit fail-closed;
- a verified fixed graph and typed parameters are distinct from a neural
  predictor;
- learned components may propose schedules/shapes but cannot grant authority,
  alter semantics, or bypass deterministic verification;
- cached/remembered shape data is hostile input until its provenance,
  compatibility, bounds and current policy are re-verified;
- SLIDE is intended as an independent low-level platform, not a
  Galerina-only feature.

Investigate:

1. Define VPEG precisely: fixed topology, typed parameter apertures,
   obligations, provenance, invalidation, target binding and execution
   semantics.
2. Identify the nearest established work: AOT/PGO, trace compilation, partial
   evaluation, supercompilation, e-graphs, incremental computation, build DAGs,
   graph compilers, memoization, neural compilation/autotuning and hardware
   specialization.
3. State what—if anything—is distinct in the composition of deterministic
   shape memory, topological indexing, K3 proof obligations and an optional
   learned proposal plane.
4. Propose a two-plane architecture: deterministic authorizing plane and
   learned non-authorizing proposal plane. Identify every crossing and its
   fail-closed gate.
5. Determine whether a small learned engine could realistically fit useful
   weights/state in L1/L2 cache. Give byte budgets, inference costs, update
   rules and workloads; reject the idea if the arithmetic does not work.
6. Define attacks: poisoned shapes, stale policy, cross-target replay,
   adversarial parameters, graph collision, cache side channels, predictor
   steering, denial of service and rollback.
7. Define falsifiable benchmarks against ordinary optimized AOT, cached AOT,
   trace/JIT and graph compilation. Do not compare to non-executable SLIDE.
8. Specify ablations that show whether topology memory, parameter separation,
   K3 checking or the learned proposer contributes anything.
9. Classify every proposed claim as proven, measured, plausible, speculative
   or refuted.
10. Recommend scientific-paper and defensive-publication outlines that comply
    with Galerina's high evidence standard.

Output:

- technical verdict and novelty map;
- formal definitions/invariants;
- threat model;
- experiment and ablation plan;
- paper recommendation and outline;
- claims ledger with evidence status;
- reasons to abandon or narrow the idea if results do not justify it.
