# Governed memory, untrusted reads, and Wasmtime-oracle design

Date: 2026-07-30  
Status: accepted architecture; implementation split into beta-safe migration and post-SLIDE work  
Scope: Galerina, the optional Wasm compatibility lane, and the independent SLIDE runtime

## Outcome

Galerina owns memory for the developer. Ordinary `.fungi` code does not
receive raw pointers, unchecked address arithmetic, manual free authority, or
an ambient escape hatch. The compiler, SLIDE, and the admitted runtime jointly
enforce memory validity, authority, custody, and deterministic resource
ceilings.

This is intentionally broader than conventional memory-safety alone:

```text
memory validity
  + access authority
  + confidential custody
  + deterministic resource control
  = Galerina governed memory
```

The contract is measured as eight independent pillars. A product claim passes
only when every enabled pillar has its own executable evidence:

| Pillar | Required guarantee | Example terminal refusal |
|---|---|---|
| 1. Spatial safety | Bounds, alignment, extent arithmetic, object/layout identity | out-of-bounds, misaligned, or wrong-layout access |
| 2. Temporal safety | Generation, lifetime, move, destruction, stale-handle rejection | use-after-move/free/generation |
| 3. Initialization and type safety | No uninitialized observation, invalid representation, confused variant, or unchecked cast | uninitialized/type/representation mismatch |
| 4. Concurrency safety | Declared sharing, race freedom, deterministic atomics/queues, role and epoch binding | conflicting access or stale queue epoch |
| 5. Authority safety | K3, capability, lease, subject, operation, and resource scope all bind the access | `DENY`, `INDETERMINATE`, surplus, stale, or missing lease |
| 6. Confidential custody | Sealed backing, transient decrypt, wipe, key epoch, quarantine, no plaintext spill | custody unavailable, rollback, spill, or wipe failure |
| 7. Deterministic resource safety | Bounded bytes, objects, graph work, recursion, queue depth, allocation, and failure cost | admitted ceiling exhausted |
| 8. Provenance and index safety | Authenticated identity/generation/content/influence graph, injection separation, anti-rollback | unindexed, poisoned, stale, conflicting, or unauthenticated evidence |

No pillar borrows another pillar's pass. A bounds-safe read can still be
unauthorized; an authorized read can still expose plaintext; encrypted bytes
can still be stale or poisoned; and an authenticated index entry can still
describe an unsafe object. The final access gate composes all applicable
pillar verdicts through typed K3 and releases only exact `ALLOW`.

Galerina may accurately claim a broader governed-memory contract than
languages whose memory-safety guarantee does not also cover capabilities,
provenance, encrypted custody, or fail-closed resource policy. It must not
claim that Rust is memory-unsafe. Safe Rust provides strong spatial and
temporal safety; `unsafe` and FFI retain explicit proof obligations, while
authority and data-custody policy are separate concerns.

## Current facts

1. Galerina already has bounds checks, source escape checks, GIR memory
   planning, residency policy, Tower Citizen capabilities, K3 gates, sentinel
   memory, and zero-on-reset tests. These are useful components, not yet one
   complete portable memory contract.
2. The current `scripts/memory-graph.mjs` writes a plaintext
   `MEMORY-GRAPH.json` into an external personal/agent memory tree. That file
   includes source location and derived descriptions. It is a sidecar and is
   not an acceptable Galerina production or release dependency.
3. `graph-all.mjs` currently makes that external sidecar part of the repository
   graph close. A clean clone therefore cannot reproduce the release gate from
   repository-owned evidence alone.
4. `subprojects/dss-host` is a Rust/Wasmtime experiment that proves useful
   fuel, differential, attestation, and memory-reset properties. Its README
   still describes it as a future native sidecar TCB, which predates the
   independent SLIDE architecture.
5. Nothing in `dss-host` is on the production path. Wasmtime remains valuable
   as an optional compatibility target and independent differential engine,
   but it is not Galerina's future production memory authority.

## Decision 1: developer-owned ergonomics, runtime-owned mechanics

Galerina source uses managed, typed values. The implementation may select
arenas, regions, reference counting, stack placement, ownership transfer,
copying, or future hardware-specific storage, but those are compiler/runtime
mechanics rather than developer trust obligations.

The source contract is:

- values are initialized before observation;
- every access is bounds checked or is backed by a verified proof that
  dominates the access;
- lifetimes and generations are checked so stale handles refuse;
- aliases, mutation, sharing, and thread transfer are typed and admitted;
- destruction and secret erasure occur deterministically at declared
  boundaries;
- resource exhaustion is a typed terminal result, never silent corruption;
- FFI, device, driver, database, network, and shared-memory access require
  explicit capability leases;
- absent, stale, conflicting, surplus, or `INDETERMINATE` critical evidence
  terminates the trust path.

There is no general `unsafe` mode that transfers the burden to the application
developer. Privileged runtime adapters are separately packaged, narrowly
capability-scoped, independently verified, and remain outside ordinary
`.fungi` authority.

## Decision 2: eight pillars, grouped into four implementation layers

### A. Validity

The portable SLIDE memory contract requires:

- typed, generation-tagged handles rather than raw addresses;
- spatial bounds and checked extent arithmetic;
- temporal generation/lifetime checks;
- initialized-state tracking;
- ownership/borrow/share-state validation;
- data-race exclusion;
- deterministic destruction and wipe obligations;
- closed FFI and host-queue registries;
- a typed failure for every invalid transition.

Tri-Fuse/VPEG may discharge a dynamic check only when a backend-neutral proof
is independently verified against the final artifact. Failure to verify keeps
the check or refuses the artifact; it never removes the guard by assumption.

### B. Authority

A valid address is not permission to read it. Every protected read or write
binds:

- object/region identity and generation;
- operation (`read`, `write`, `move`, `erase`, `share`, or admitted extension);
- subject/caller identity;
- capability and lease identity;
- provenance and source-artifact digest;
- K3 result;
- resource and time ceilings.

Only exact `ALLOW` releases access. `DENY`, `INDETERMINATE`, missing evidence,
or surplus capability produces a typed terminal exit.

### C. Custody

Secret and protected backing storage is sealed when not actively consumed.
The portable contract uses:

- an AEAD data cipher such as AES-256-GCM for actual bytes;
- hybrid key establishment/wrapping using X25519 plus ML-KEM;
- hybrid evidence signatures using Ed25519 plus ML-DSA;
- epoch, previous-root, freshness, and anti-rollback bindings;
- transient, sink-bounded decryption;
- deterministic zeroization and quarantine;
- no plaintext spill, crash dump, log, graph, or cache entry.

Hardware TME, SEV-SNP, TDX, secure enclaves, `mlock`, `VirtualLock`, and future
photonic custody mechanisms are optional strengthening adapters. They cannot
define the portable semantics because the same admitted program must remain
meaningful when those facilities are absent.

“Quantum encryption” is not the publication term. ML-KEM establishes or wraps
keys; ML-DSA signs evidence; an AEAD encrypts the memory. The threat response
is **compromise-triggered cryptographic quarantine and key revocation**.

### D. Deterministic resources

Every memory plan binds maximum regions, objects, bytes, nesting, graph nodes,
edges, work steps, allocation operations, queue depth, and failure behavior.
Unbounded allocation or traversal is not admitted. Exhaustion is observable as
a registered terminal failure.

### The index as the strongest connective control

Indexing is not treated as an optional performance cache. The admitted index
is the connective evidence layer that makes the other seven pillars
inspectable without becoming their authority.

For every protected object, value, code shape, document, package, driver, and
derived graph node, it can bind:

- canonical identity, type/layout, generation, state, and content digest;
- owner, producer, signer, source artifact, and derivation recipe;
- region, lifetime, alias/share state, custody/key epoch, and resource budget;
- capabilities and operations that may be requested—not automatically
  granted;
- inbound/outbound dependency and influence edges;
- the exact compiler/SLIDE/final-artifact receipts that reverified it;
- quarantine, revocation, supersession, and anti-rollback history;
- which human, compiler, or AI decision consumed it and what claim it
  influenced.

This makes the index a tamper-evident security map and forensic ledger as well
as a topological/VPEG accelerator. It can prove that an object is missing,
stale, conflicting, unverified, unexpectedly influential, or outside its
admitted graph before the underlying bytes are opened.

The index still cannot mint authority. It proposes a bounded evidence set; the
independent memory, capability, custody, and execution verifiers reopen exact
bytes and decide. A corrupted or unavailable index therefore causes terminal
refusal or a slower full re-derivation from admitted source—not an unsafe
fallback and not trust in the index.

## Decision 3: profiles may remove overhead, never core safety

The same `.fungi` syntax, checked GIR, and SLIDE semantics serve both the
mobile-fortress profile and a future closed-network/data-mining/quantum
profile.

The closed-network profile may:

- pre-admit a measured host;
- statically discharge repeated governance checks;
- fuse stable VPEG fragments;
- reduce repeated signatures and network-hostility checks;
- use different custody adapters when its published threat model permits.

It may not remove bounds, lifetime, initialization, race, type, deterministic
resource, or fail-closed error safety. The earlier
`RD-0384-faster-mushroom-trusted-environment-threat-model-delta.md` suggestion
that OS and memory may simply be assumed trusted is superseded. Trusted-host
evidence can reduce repeated work; it cannot become ambient memory authority.

## Decision 4: memory and graph content is untrusted data

Every document, memory entry, graph label, package description, retrieved
snippet, model output, and plugin response is attacker-controlled data until
admitted. A read must never become an instruction channel.

### Injection boundary

The reader/graph builder must:

1. require an explicitly admitted corpus identity for any persistent use;
2. open only regular files beneath the admitted root; reject symlinks, path
   traversal, device files, alternate streams, and root escape;
3. apply byte, file-count, line, field, node, edge, depth, cycle, and work
   ceilings before parsing;
4. decode strict UTF-8 and reject NUL, forbidden control characters,
   bidirectional overrides, invalid normalization, duplicate fields, and
   unknown schema versions;
5. parse a closed data schema—never evaluate markup, templates, code, shell,
   URLs, embedded commands, or model/tool instructions;
6. canonicalize and hash the exact source snapshot before graph derivation;
7. preserve provenance per node and edge;
8. return typed, length-bounded data records marked `untrusted`, not prose
   injected into an instruction channel;
9. quote/encode display text and keep it separated from system, developer,
   policy, tool, and command channels;
10. require the consumer to reopen and hash the cited source before a
    security-relevant claim is accepted;
11. forbid retrieved content from granting capabilities, changing policy,
    selecting tools, choosing paths, releasing keys, or authorizing writes;
12. record whether a retrieved item influenced a change and bind that
    influence to provenance evidence.

Instruction-like text inside memory remains quoted evidence. “Ignore previous
instructions”, hidden Unicode, markdown links, code fences, tool-call JSON, or
claims of authority are never executed merely because retrieval ranked them.

### Required negative corpus

The gate includes direct and indirect prompt injection, fake system/developer
messages, tool-poisoning JSON, markdown/HTML/script payloads, URL instructions,
Unicode bidi and invisible controls, ANSI escapes, overlong fields, zip/graph
bombs, cycles, duplicate identities, rollback generations, stale signatures,
cross-project contamination, malicious symlinks, and path traversal. Each
negative case has a known-good control so “reject everything” cannot pass.

## Decision 5: no plaintext external sidecar

The current external `MEMORY-GRAPH.json` write model is rejected.

For beta v1:

- Galerina's reproducible `graph:all` gate covers repository-owned graphs and
  indexes only;
- personal/agent memory search is an explicit, read-only development aid;
- it builds an ephemeral in-process graph from an explicitly selected tree;
- it never writes beside the source tree and never grants build/runtime
  authority;
- a clean repository build does not require a private memory corpus.

For post-SLIDE persistent shape/knowledge graphs:

```text
explicit admitted corpus
  -> bounded canonical snapshot
  -> strict schema parser
  -> provenance-labelled graph
  -> immutable AEAD-encrypted generation
  -> hybrid signed generation receipt
  -> anti-rollback current-root transition
  -> read-only, least-context query lease
```

The writer may create a new immutable generation only. It cannot modify source
documents, overwrite a generation, delete evidence, follow arbitrary paths, or
change the current root without an independently admitted transition.

On threat, the system denies reads and writes, wipes transient plaintext and
keys, preserves only encrypted evidence, revokes the epoch, and requires clean
reattestation. Cache or graph availability never justifies a fallback.

## Decision 6: Wasmtime is a development oracle, not a production sidecar

`subprojects/dss-host` is migrated to the single flat package:

```text
packages-galerina/galerina-devtools-wasmtime-oracle/
```

Its role is:

- execute admitted Wasm fixtures in a second engine;
- compare Stage-A/V8/Wasmtime values and terminal traps;
- test fuel exhaustion;
- test reset/zeroization behavior;
- test attestation rejection;
- provide evidence for the optional Wasm compatibility target.

It has no production capability, secret, database, network, memory-release,
package-admission, or SLIDE authority. It does not supervise Galerina tasks.
The words “sidecar TCB” and “production host” are removed from its active
contract. Historical reports remain historical but must point to this
superseding decision.

The package remains Rust because engine independence is the purpose of the
oracle. That does not violate the `.fungi` product direction: it is a
development-only external comparator, not an authoritative Galerina
implementation. When SLIDE has an executable backend, its evidence is used in
the same differential matrix. Wasmtime can be retired only if its independent
compatibility value reaches zero and the recorded removal gate passes.

## Flat-package and dependency rules

- The oracle is one direct child of `packages-galerina`.
- It has one canonical package identity and one Rust crate identity.
- Its `Cargo.lock` is exact and committed.
- It does not create a nested Galerina package or plugin.
- Cargo's build cache is ignored and is not a Galerina dependency registry.
- Crates are a development-tool supply chain, not packages/plugins made
  available to `.fungi` applications.
- `cargo deny`, an SBOM, advisory review, license review, and pinned Wasmtime
  configuration are required before the oracle can count as release evidence.

## Integration and replacement map

| Existing item | Decision | Replacement or retained role |
|---|---|---|
| `subprojects/dss-host` location | Remove | Flat `galerina-devtools-wasmtime-oracle` package |
| DSS/production-sidecar wording | Remove | Independent development oracle only |
| Fuel, differential, reset, attestation tests | Keep and relabel | Oracle evidence |
| Wasm as mandatory production bridge | Keep temporarily, later make optional | SLIDE admitted executor becomes primary after its gates |
| External plaintext `MEMORY-GRAPH.json` | Remove from active design | Ephemeral read-only beta tool; encrypted immutable SLIDE graph later |
| Private memory corpus in `graph:all` | Remove | Repository-owned graphs only |
| Manual/raw developer memory | Never introduce | Compiler/runtime-managed governed values |
| Current memory validators/residency/sentinels | Rebuild behind one contract | Galerina frontend evidence plus independent SLIDE verification |
| Hardware memory encryption | Optional strengthening | Adapter evidence, never universal semantics |

## Acceptance

The beta-safe migration is complete when:

1. no tracked active path names `subprojects/dss-host`;
2. the flat oracle package is registered and topology/audit tools accept it;
3. its useful Rust tests still pass;
4. Wasmtime presence tooling detects only the new oracle path;
5. `graph:all` is reproducible without a private memory tree;
6. the development memory tool performs no external writes and labels query
   material as untrusted data;
7. injection and no-write negative tests pass;
8. the eight independent-review prompts exist;
9. Galerina and SLIDE TODO/question/roadmap documents state the new boundary;
10. generated indexes and graphs are refreshed and all applicable gates are
    rerun.

This acceptance does not claim that the post-SLIDE encrypted graph or complete
governed-memory runtime is implemented.

## Primary standards and implementation references

- NIST SP 800-207, Zero Trust Architecture:
  <https://csrc.nist.gov/pubs/sp/800/207/final>
- NIST FIPS 203, ML-KEM:
  <https://csrc.nist.gov/pubs/fips/203/final>
- NIST FIPS 204, ML-DSA:
  <https://csrc.nist.gov/pubs/fips/204/final>
- Rust ownership:
  <https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html>
- Rust safe/unsafe boundary:
  <https://doc.rust-lang.org/nomicon/safe-unsafe-meaning.html>
- Current Galerina integration map:
  `../../../../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- Flat package contract:
  `../../architecture/flat-package-topology-and-post-slide-migration.md`
