# Independent review prompt: SLIDE deterministic shape memory

Use this prompt with independent compiler, systems, security and performance
reviewers. Do not ask reviewers to implement the design yet.

---

You are independently reviewing a proposed SLIDE feature. SLIDE means
Substrate Layout Interconnect Deterministic Engine. It is intended to be an
independent low-level execution platform with Galerina as its first frontend.
The design is zero trust, fail closed, K3 tri-logic aware, deterministic,
portable across current silicon and future targets, and intended to retain
compatible contracts for 20+ years.

The proposal is called **deterministic shape memory**.

At installation, first boot, admitted package/plugin installation, driver
admission, or verified update, SLIDE would:

1. canonicalize admitted source/component, package, plugin, contract, policy,
   target, hardware and driver manifests;
2. construct a dependency/lowering graph and topologically order it;
3. separate fixed graph fragments from explicitly typed dynamic holes;
4. hash fixed fragments together with every input capable of changing
   semantics, authority, layout, target selection or proof;
5. pre-verify and precompute reusable lowering/optimization/proof fragments;
6. reuse exact verified fragments while recomputing only dynamic holes; and
7. invalidate and fully rebuild whenever identity, policy, environment or
   proof does not match exactly.

This is not permission for a neural network to invent compiler semantics. A
learned model may at most rank already admitted candidates. It must not grant
authority, select stale output as safe, create unproved rewrites, change K3
outcomes, or bypass deterministic verification.

The Galerina package topology is also constrained: every package/plugin exists
once as a direct child of `packages-galerina/`; dependencies reference that
canonical peer through manifests. There is no npm-style nested child dependency
forest or duplicated package instance.

Produce an adversarial, source-backed review with these sections:

1. **Verdict**
   - Is the composition technically workable?
   - Classify it as poor, marginal, promising, or high-value research.
   - State the strongest reason for and against pursuing it.

2. **Prior-art boundary**
   - Separate established techniques from the genuinely new composition.
   - Compare at least incremental compilation, content-addressable stores,
     build/action caches, partial evaluation, memoization, Merkle DAGs,
     topological scheduling, ThinLTO-style caching, e-graphs/equality
     saturation, and proof-carrying or reproducible builds.
   - Use primary sources and link every material technical claim.

3. **Minimal deterministic architecture**
   - Define the canonical shape IR, fragment identity and dynamic-hole type.
   - Specify a cache/shape key field by field.
   - Include compiler/optimizer version, source and dependency hashes, ABI,
     memory/layout model, target triple, admitted hardware/driver manifest,
     effects, K3 authority, governance policy, security rules, optimization
     recipe and proof schema.
   - Define the manifest and provenance receipt.
   - Explain whether an e-graph belongs in the persistent representation,
     build-time optimizer only, or nowhere.

4. **Zero-trust invalidation protocol**
   - Give the exact install/boot/update/read/rebuild state machine.
   - Fail closed on missing, unknown, stale, rolled-back, conflicting,
     ambiguous or unverifiable state.
   - Address crash consistency and power loss.
   - Address multi-process races and time-of-check/time-of-use risks.
   - Explain how rollback protection works offline.

5. **Security attack analysis**
   - Cache poisoning and substitution.
   - Hash collision and algorithm migration.
   - Malicious plugins and dependency confusion.
   - Driver/hardware manifest lies.
   - Stale authority or policy reuse.
   - Cross-user and cross-project leakage.
   - Secret-dependent optimization or timing leakage.
   - Nondeterministic compiler inputs.
   - Graph bombs, cycles, e-graph explosion and resource exhaustion.
   - Learned-ranking manipulation.

6. **Flat package topology**
   - Test the “one canonical package instance” rule.
   - Explain version-conflict consequences and how an admitted build resolves
     them without duplication.
   - Specify duplicate, shadow, cycle and ambiguity detection.
   - State whether this rule improves assurance enough to justify reduced
     dependency flexibility.

7. **Portability**
   - Windows 10/11 development.
   - macOS development.
   - Debian/Ubuntu, Fedora and Mint.
   - x86-64, ARM64, GPU/NPU and future photonic targets.
   - Identify which shape fields are portable and which must be target-local.

8. **Benchmark and falsification plan**
   - Do not invent performance numbers.
   - Compare cold build, warm exact hit, partial invalidation, policy-only
     change, driver update and package update.
   - Compare against a no-memory SLIDE pipeline and mature cached AOT
     baselines.
   - Measure wall time, CPU, peak memory, storage, hit rate, verification cost,
     invalidation breadth and reproducibility.
   - Define thresholds that would make us simplify or abandon the design.
   - Cross-runtime Wasm/Rust/Python claims must wait until SLIDE has an
     executable backend.

9. **Prototype plan**
   - Propose the smallest prototype that can prove or falsify value.
   - Keep it after Galerina beta v1 and after a minimal executable SLIDE
     backend.
   - Require deterministic replay and negative security tests before any speed
     claim.

10. **Decision record**
    - List adopt, modify, defer and reject recommendations.
    - List unresolved owner decisions separately from engineering questions.

Be sceptical. Prefer a smaller auditable mechanism over a clever opaque one.
Treat remembered shapes only as untrusted performance hints until their full
identity and proof are verified.

---

Initial primary-source starting points:

- LLVM ThinLTO cache control:
  <https://llvm.org/docs/doxygen/group__LLVMCTLTO__CACHING.html>
- Bazel remote caching and content-addressable action outputs:
  <https://bazel.build/remote/caching>
- Nix store-path identity:
  <https://nix.dev/manual/nix/latest/store/store-path>
- `egglog`, incremental fixpoint reasoning and equality saturation:
  <https://arxiv.org/abs/2304.04332>

