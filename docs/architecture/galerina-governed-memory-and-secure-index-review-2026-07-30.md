# Galerina governed-memory and secure-index review

Date: 2026-07-30
Status: source-verified architecture review; current facts separated from
post-SLIDE requirements
Design of record:
`../superpowers/specs/2026-07-30-governed-memory-and-wasmtime-oracle-design.md`

## Verdict

The idea is worth pursuing and fits Galerina's zero-trust purpose, but the
complete claim is not implemented today.

Galerina already has credible components for bounds checking, value-state and
escape analysis, K3/capability gates, zero-wipe, residency planning,
deterministic budgets, provenance graphs, and hostile negative tests. They are
not yet one portable, independently verified memory contract from `.fungi`
source through checked GIR, optimized SLIDE, final artifact, runtime access,
custody, index, and audit receipt.

The honest current statement is:

> Galerina beta v1 contains governed-memory building blocks and fail-closed
> source/runtime checks. The complete eight-pillar governed-memory guarantee is
> a SLIDE integration target, not a shipped end-to-end proof.

The intended future statement can be stronger than conventional
memory-validity claims because it combines validity, authority, custody,
resources, and provenance. It must not say that Rust is memory-unsafe.

## Why eight pillars

“Memory safe” is too overloaded to carry Galerina's full promise. A protected
system can be bounds-safe yet unauthorized, lifetime-safe yet plaintext,
encrypted yet stale, or correctly indexed yet poisoned. The architecture
therefore treats these as independent proof obligations:

| # | Pillar | Current source evidence | Current gap | Required SLIDE-era proof |
|---:|---|---|---|---|
| 1 | Spatial | `MemoryValidator` now refuses non-finite, fractional, negative, unsafe-integer, invalid-alignment, and overflow-prone requests; its `.fungi` twin exposes subtraction-based `isInBounds`, differentially checked over 8,993 bounded-grid cases plus the signed-i32 edge, with a dedicated fail-open mutant; WAT runtime-bounds tests, TPL bounds checks, and V2-D guard-before-observation also exist | the TypeScript/WASM checks are not a native final-artifact certificate | Checked extent arithmetic, alignment/layout identity, dominance proof, hostile final-artifact mutation |
| 2 | Temporal | escape analysis, source escape checker, value-state seal/consume checks, reset/zero tests | no universal generation-tagged runtime handle contract; hostile FFI and stale-handle corpus incomplete | generation/lifetime/move/destruction state in GIR and runtime receipt; use-after-move/free/generation refusal |
| 3 | Initialization/type | parser/type/value-state pipeline, typed aggregates/variants, V2-C/V2-D bounded plans | final optimized/native representation is not yet independently bound to source type/initialization facts | initialized-state, representation validity, variant identity, cast registry, final-layout verification |
| 4 | Concurrency | structured concurrency and bounded queue plans exist; sentinels avoid some shared-state paths | no complete data-race proof, admitted shared-memory model, epoch/role queue ABI, or cross-platform atomic contract | typed share/borrow states, race exclusion, exact memory ordering, role/epoch binding, deterministic concurrency tests |
| 5 | Authority | Tower Citizen grants/leases, capability verification, K3 tables, V2-B request/lease shapes | not every memory access is bound to subject/object/generation/operation/lease; V2-B releases no production authority | memory-access request plus exact `ALLOW`; absent/stale/surplus/`INDETERMINATE` terminal refusal |
| 6 | Confidential custody | `SealArena` copies into a controlled Buffer, wipes on replace/fault/remove/dispose, refuses faulted/disposed use; hardening residency models no-swap/no-disk/register-only | plaintext exists in process RAM while used; `mlock` is best-effort; sentinel native locking is documented as not implemented; no universal ciphertext-in-RAM contract | sealed backing, transient sink-bounded decrypt, key epochs, hybrid wrapping/signing, no-spill evidence, quarantine and wipe receipts |
| 7 | Deterministic resource | flow/runtime budgets, WAT loop fuel, fixed-block sentinel memory, TriRegex budgets, V2 step/copy/depth/byte ceilings | no single allocator/graph/queue/resource envelope covers every backend and host adapter | exact regions/objects/bytes/work/depth/queue/allocation ceilings with registered exhaustion failures |
| 8 | Provenance/index | package/project/provenance/capability/resource graphs; source digests; read-only bounded memory graph; generator drift checks | no admitted encrypted immutable persistent index, influence receipt, anti-rollback transition, or independent content re-open gate | authenticated generation graph, provenance/influence edges, injection separation, least-context query lease, anti-rollback and rebuild proof |

No pillar may borrow another pillar's result. The final memory-access decision
is a typed K3 composition over every applicable pillar and releases only exact
`ALLOW`.

## Existing mechanisms that should be kept

### Compiler and source boundary

- lexer/parser/type/effect/value-state/governance checking;
- `escape-analysis.ts` and `source-escape-checker.ts`;
- hardening residency as a requested/derived evidence plan;
- checked extents, safe-value plans, source maps, and explicit failures in
  complete executable GIR;
- `check` for authority-bearing K3 exits and exhaustive `match` for
  alternatives.

### Runtime and package boundary

- sentinel fixed-block/bounded memory;
- deterministic zero/reset behavior;
- Tower Citizen capability and lease receipts;
- Tri-Pipe proposal-only routes;
- Tri-Fuse/VPEG proof discharge only after independent verification;
- audit-before-success and quarantine semantics;
- flat one-package-one-identity topology.

### Development evidence

- V8/Wasmtime/Stage-A differential tests;
- negative and mutation tests;
- package, project, capability, resource, and provenance graphs;
- exact generated-output drift checks;
- the read-only ephemeral memory query tool as a development aid.

## Mechanisms that must be rebuilt

1. **Memory plan:** turn scattered source checks into one versioned,
   frontend-neutral GIR memory plan.
2. **Handles:** replace ambient offsets/pointers at ordinary language seams
   with typed generation-tagged handles.
3. **Access gate:** bind object, generation, subject, operation, capability,
   lease, K3, custody epoch, and budgets to each protected access.
4. **Custody:** replace “controlled plaintext Buffer plus wipe” as the maximum
   claim with sealed backing and transient sink-bounded plaintext.
5. **Concurrency:** define typed share/borrow/queue states and exact
   cross-platform ordering.
6. **Resource envelope:** unify allocation, bytes, objects, graph work,
   recursion, queue depth, and failure cost.
7. **Index:** replace plaintext sidecars and advisory caches with admitted,
   immutable encrypted generations and non-authorizing receipts.
8. **Final-artifact proof:** independently bind optimized/native behavior back
   to checked source/GIR facts.

## What must be built independently in SLIDE

- canonical memory-plan parser and closed registries;
- validity verifier for bounds, layout, initialization, lifetime, aliasing,
  concurrency, and resources;
- backend-neutral Tri-Fuse proof/residual checker;
- generation-tagged region/object/handle runtime;
- target-neutral admitted executor and least-authority broker;
- custody/key-epoch/quarantine adapters;
- final-artifact memory and control-flow verifier;
- immutable encrypted index store and anti-rollback root transition;
- influence/provenance receipt verifier;
- seeded deterministic fault and hostile mutation harness;
- a second non-Galerina frontend to prove the semantics are independent.

## The index as a strength

The index should become the most useful connective security component, not a
problem to be hidden.

For each object, value, code shape, document, package, driver, model, and graph
node it can bind:

```text
identity + type/layout + generation + content digest
+ producer/source/signer + derivation recipe
+ region/lifetime/share state + custody/key epoch
+ dependency and influence edges
+ requested capabilities and budgets
+ verification/audit/quarantine/supersession receipts
```

This enables four security advantages:

1. **Pre-open refusal:** detect stale, missing, conflicting, revoked, poisoned,
   or unexpected data before opening protected bytes.
2. **Least-context retrieval:** select the minimum admitted facts instead of
   flooding an AI/compiler/runtime with a broad corpus.
3. **Influence accountability:** record exactly which retrieved item affected
   a human, compiler, optimizer, or AI decision.
4. **Topological acceleration:** reuse verified stable subgraphs/VPEG shapes
   without recomputing fixed structure, while revalidating changing data and
   authority.

The index remains non-authoritative. It proposes evidence; independent
verifiers reopen exact bytes and decide. If the index is missing or
quarantined, the permitted fallback is a bounded slower re-derivation from
admitted source. It is never execution from an unchecked cache.

## Injection protection

Memory/index reads must:

- accept only an explicit admitted corpus/generation;
- use regular files/objects under a closed root; reject symlink and path
  escape;
- enforce byte/file/node/edge/depth/cycle/work ceilings before parsing;
- require strict UTF-8, normalization policy, closed schemas, and duplicate
  refusal;
- reject NUL, forbidden controls, bidi overrides, invisible characters, and
  terminal escapes;
- keep content in a typed `untrusted-data` channel;
- JSON-quote or otherwise encode displays;
- never evaluate markup, code, templates, URLs, tool-call JSON, or embedded
  commands;
- prevent retrieved content from granting capabilities, selecting tools or
  paths, writing memory, or releasing keys;
- re-open and hash exact cited source before a security claim is admitted;
- bind decision influence to a provenance receipt;
- quarantine poisoned generations and revoke their key epoch.

The beta read-only tool now implements a useful floor: no external sidecar
write, explicit untrusted envelope, strict UTF-8 and control/bidi refusal,
regular-file and filename checks, resource ceilings, source digest, quoted
query records, cross-index identity-collision refusal, and health refusal. It
is not the persistent production index.

## Developer experience

Ordinary `.fungi` should feel closer to Python than Zig/C in memory mechanics:

- create typed values;
- pass or return them;
- declare intent/effects/security constraints;
- let compiler/runtime choose placement and reclamation;
- receive typed terminal failures rather than memory corruption.

The developer does not manually free values or use raw pointers. Galerina may
offer explicit performance intentions—bounded arena, immutable, unique,
shared-read, device region—but the compiler and runtime verify them. There is
no general “trust me” mode.

Privileged adapters are isolated packages with closed capabilities and
independent tests. They do not make ordinary application code unsafe.

## Closed-network profile

The older “trust OS and memory” profile is too weak for the shared substrate.
The safer performance model is:

- retain all validity, concurrency, deterministic-resource, and fail-closed
  safety;
- retain K3 semantics;
- admit a measured host/profile;
- use Tri-Fuse/VPEG to statically discharge repeated checks;
- precompute authenticated topology and fixed shapes;
- use lighter custody/evidence frequency only where the published threat
  profile and receipts permit it.

This removes repeated governance cost without creating ambient trust or a
second unsafe language.

## Implementation order

1. Freeze the eight pillar schemas and diagnostic/failure registries.
2. Repair integer/extent checks and add hostile numeric/property tests.
3. Export complete memory/concurrency/resource facts in executable GIR.
4. Build the independent SLIDE verifier before native lowering.
5. Add generation handles and the access-authority composition gate.
6. Build custody epochs, sealed backing, transient sinks, wipe, and quarantine.
7. Build the encrypted immutable index and influence receipts.
8. Bind optimized/final artifacts back to the verified plan.
9. Add the isolated runner/broker and deterministic fault replay.
10. Run second-frontend, cross-platform, differential, mutation, and benchmark
    gates before changing the public claim.

## Claim gate

Do not publish “Galerina is more memory-safe than Rust” until the complete
eight-pillar conformance suite is executable across supported targets.

A defensible future form is:

> Galerina combines memory validity with capability-bound access,
> confidential custody, deterministic resource limits, and authenticated
> provenance/index evidence. These are additional governed security
> properties, not a claim that Safe Rust lacks memory safety.

## Primary references

- Rust ownership:
  <https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html>
- Rust safe/unsafe boundary:
  <https://doc.rust-lang.org/nomicon/safe-unsafe-meaning.html>
- Rust undefined behavior reference:
  <https://doc.rust-lang.org/reference/behavior-considered-undefined.html>
- NIST SP 800-207, Zero Trust Architecture:
  <https://csrc.nist.gov/pubs/sp/800/207/final>
- NIST FIPS 203, ML-KEM:
  <https://csrc.nist.gov/pubs/fips/203/final>
- NIST FIPS 204, ML-DSA:
  <https://csrc.nist.gov/pubs/fips/204/final>
- Intel Total Memory Encryption:
  <https://www.intel.com/content/www/us/en/developer/articles/news/runtime-encryption-of-memory-with-intel-tme-mk.html>
- AMD Secure Encrypted Virtualization:
  <https://www.amd.com/en/developer/sev.html>

Hardware memory encryption strengthens custody but does not replace portable
language/runtime validity, authority, resource, or provenance semantics.
