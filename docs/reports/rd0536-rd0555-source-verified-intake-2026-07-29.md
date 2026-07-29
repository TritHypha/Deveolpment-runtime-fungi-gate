# RD-0536 through RD-0555 source-verified intake

**Date:** 2026-07-29

**Scope:** Galerina, independent SLIDE, and the triLowLevel v2 planning lane

**Decision:** advisory intake complete; no R&D row grants implementation,
component-removal, performance, or admission authority.

## Evidence boundary

The requested directory
`ZTF-Knowledge-Bases/RD-transcripts-2026-07-29/` does not exist in the
workspace. The twenty records are present at the
`ZTF-Knowledge-Bases/` root. Every record identifies itself as
`[D] DIGEST-SCREENED`, provisional, and not a body read. The records also say
that performance figures, slides, primary sources, and equations were not
verified.

The records are therefore useful for finding questions and test ideas. They
are not sufficient evidence for:

- a security or performance claim;
- selecting an implementation dependency;
- changing a wire contract;
- cutting an existing Galerina component;
- allowing a cache, snapshot, model, manifest, or compiler to grant authority.

Current repository source and tests remain the operational authority.

## Source-verified decision matrix

| RD | Screened subject | Adjudication | Source-verified project consequence |
|---|---|---|---|
| 0536 | Shared-memory lock-free queues | `PLAN-DELTA` | Add a future bounded host-queue ABI profile. It must bind slot layout, element type, capacity, ownership, producer/consumer roles, lifetime epoch, memory ordering, and terminal corruption/overrun outcomes. Do not claim lock freedom or cross-process safety before target-specific memory-model tests. |
| 0537 | Deterministic state behind an LLM | `ALREADY-BOUND` | Galerina already requires learned components to propose only. A model output remains untrusted data and cannot authorize. No vendor claim is adopted. |
| 0538 | Deterministic simulation testing | `PLAN-DELTA` | Add a seeded whole-run fault-simulation harness after the isolated runner/broker exists. It must replay scheduler, broker, nonce-store, network, process, disk, cache, and audit faults from a recorded seed and include a known-good control so reject-everything cannot pass. |
| 0539 | Branch prediction hints | `ALREADY-BOUND` | Retain equivalent-work benchmark discipline. Do not introduce source branch hints into authority logic or make an optimization claim without target/toolchain measurements. |
| 0540 | Wasm/host boundary and interning | `ALREADY-BOUND` | The planned capability broker and host ABI already require narrow typed calls. Batching/interning is an optimization only and must preserve identical authorization, limits, failures, and receipts. |
| 0541 | Wasm startup snapshots | `ALREADY-BOUND` | Galerina already requires verified startup artefact bundles rather than raw memory dumps. A snapshot is an untrusted cache object bound to the complete action key and is safe to delete or bypass. |
| 0542 | Wasm/WASI mechanics | `ALREADY-BOUND` | SLIDE has no ambient native authority. Optional Wasm remains separately selected and admitted; failed SLIDE admission never falls through to Wasm/WASI. |
| 0543 | Wasmtime security/correctness | `CORRECTED` | `subprojects/dss-host/Cargo.toml` really pins `wasmtime = "47.0.2"`. That makes version/CVE/configuration tracking relevant to the optional Wasm TCB. A digest-screened talk does not itself verify the engine's current threat posture. |
| 0544 | Wasm internals | `CONTEXT-ONLY` | No new contract or implementation follows. Existing optional-Wasm and host/guest boundary plans cover the useful background. |
| 0545 | Terraform | `NO-ADOPTION` | Out of the current Galerina/SLIDE implementation scope. |
| 0546 | Algebra course | `NO-ADOPTION` | No transcribed equation is adopted. Maths used by the project must be independently derived and tested. |
| 0547 | LDAP wildcard injection | `PLAN-DELTA` | Add Galerina negative fixtures for wildcard/filter metacharacters, malformed escaping, unknown validation state, and untrusted database/directory results. This is a language/boundary validation task, not an LDAP client in SLIDE core. |
| 0548 | LLM application security | `ALREADY-BOUND` | Tool access is a capability surface. Model/tool results are data, least-authority leases are independently admitted, and a model cannot authorize its own proposal. |
| 0549 | General system design | `CONTEXT-ONLY` | Broad API/database material adds no exact project contract. Current typed capability, scope, TLS, database, and API plans remain authoritative. |
| 0550 | Solidity contracts | `NO-ADOPTION` | Different execution and trust model; no pattern is imported. |
| 0551 | Payment idempotency | `PLAN-DELTA` + `CORRECTED` | Galerina has draft idempotency design and a compiler check that blocks retrying mutations without an idempotent declaration. It does **not** implement or name `COMMIT_OUTCOME_UNKNOWN`. Add an explicit typed transaction outcome contract before database/payment retry integration. |
| 0552 | Rust internals | `CONTEXT-ONLY` | Useful host-implementation context only. Rust and `unsafe` do not replace SLIDE admission, memory profiles, isolation, or final-artifact verification. |
| 0553 | LLVM compiler split | `CORRECTED` | Direct GIR-to-LLVM/native lowering is **not started**. The canonical plan explicitly gates LLVM behind detached semantics, memory/Tri-Fuse evidence, a pinned toolchain, and pre/post/object/final-artifact verification. |
| 0554 | Electron to Tauri | `PLAN-BOUNDARY` | Do not bundle Chromium or a browser engine into the SLIDE core/TCB. A future developer shell may use an explicitly external platform runtime, but it cannot grant target or execution authority. |
| 0555 | Rust web development | `CONTEXT-ONLY` | Framework survey only. It does not select the Galerina web/database adapter or change the independent SLIDE core. |

## Corrections that must not be lost

### Wasmtime is pinned, but the transcript is not the proof

`subprojects/dss-host/Cargo.toml:8` pins Wasmtime 47.0.2. The optional Wasm path
therefore needs exact dependency, configuration, vulnerability-response, and
differential evidence. The R&D row's word `VERIFIED` is too broad: the local
pin is verified; the transcript's security claims are still third-party,
digest-screened input.

### `COMMIT_OUTCOME_UNKNOWN` is not implemented

No source or documentation symbol named `COMMIT_OUTCOME_UNKNOWN` exists.
Current evidence is narrower:

- `packages-galerina/galerina-core/docs/api-duplicate-detection-and-idempotency.md`
  is explicitly `Status: Draft`;
- `resilience-inference.ts` defaults mutation effects to no retry;
- `FUNGI-RES-001` rejects retry on mutation without an idempotent declaration.

The required future result contract is at least:

```text
NotCommitted
Committed(result_identity)
OutcomeUnknown(operation_identity, reconciliation_requirement)
Rejected(typed_failure)
```

`OutcomeUnknown` must not auto-retry, collapse to success/failure, or release a
new lease. Reconciliation and any later retry require the same operation
identity, idempotency contract, durable state evidence, and an audit receipt.
The final registry spelling remains an implementation decision; the semantic
distinction is now mandatory in the plan.

### LLVM is a later verified backend, not the current architecture

The canonical Galerina status ledger marks LLVM/native lowering
`NOT-STARTED`. It also says not to wrap incomplete GIR in an LLVM emitter.
The ordered gate remains:

```text
complete detached semantics
  -> independent semantic and memory validation
  -> Tri-Fuse equivalence
  -> deterministic complete-key action graph
  -> pinned LLVM/LLD lowering
  -> pre-optimization, post-optimization, object, and final-artifact checks
```

No R&D summary changes that order.

## Accepted plan deltas

### 1. Deterministic fault-simulation receipt

Build this as a test/evidence surface, not a production authority source:

- canonical seed and scheduler-policy identity;
- ordered injected-fault script;
- exact semantic, artifact, runtime, broker, and fixture identities;
- terminal result plus audit digest;
- replay command that reproduces the same trace;
- positive control and fault-coverage report;
- mutation tests for seed, event order, omitted fault, duplicated fault, and
  fabricated success.

The first bounded slice should exercise the future capability broker and
transaction `OutcomeUnknown` path. It follows isolated-runner/broker work and
does not block G4-C checked-source semantics.

### 2. Bounded host-queue ABI

The initial queue profile may support only fixed-layout, bounded SPSC. SPMC or
other concurrency profiles require their own versioned admission and tests.
The contract must reject:

- unknown or non-trivial element layout;
- unbound producer/consumer identity;
- stale epoch or mapped-region identity;
- capacity/stride/alignment mismatch;
- counter wrap, overwrite, torn state, or unsupported memory ordering;
- lifetime ending while a borrow is live;
- target/ABI mismatch.

Borrowed buffers must not escape the admitted call/lifetime. Batching changes
transport shape only; it cannot combine authority or hide per-operation
failure/audit identities.

### 3. Injection-negative corpus

Galerina's boundary-validation corpus should include LDAP-style wildcard and
filter metacharacters as generic untrusted-value cases. The test must prove
typed validation or parameterization before a directory/database capability
request is formed. Missing validator, unknown result, invalid escaping, or an
attacker-controlled filter exits the trust path.

### 4. Browser/runtime supply-chain boundary

Independent SLIDE must not own a bundled browser engine. Development on
Windows/macOS may use Node.js or an installed platform webview as an explicit
bootstrap/developer dependency, but that runtime is outside the admitted
payload and cannot silently become the production runner.

## Explicit non-actions

- No code or dependency was changed from a digest-screened transcript.
- No performance number was adopted.
- No Wasm component was removed.
- No LLVM version was selected.
- No queue was described as lock-free, safe, or faster.
- No AI/vendor claim became project fact.
- No browser, Terraform, Solidity, Rust web framework, or LDAP client was
added to SLIDE core.
- No current component cut gate was widened.

## Canonical follow-through

The accepted deltas are mirrored in:

- `SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`;
- `Galerina/docs/TODO.md`;
- `SLIDE/TODO.md`;
- `triLowLevel-v2/TODO.md`.

The next implementation chapter remains G4-C: immutable checked snapshot and
instruction-level total trace. The R&D intake does not unblock LLVM/native
work and introduces no new owner-only blocker.
