# Independent review prompt 3 — sidecar-free encrypted immutable index

You are an independent storage, cryptography, graph-database, secure-systems,
and crash-consistency architect. Review read-only; make no repository or
external-corpus writes.

## Question

Design and challenge a persistent Galerina/SLIDE provenance and shape index
that is stronger than a plaintext sidecar. It must accelerate topological/VPEG
work and improve security while remaining non-authoritative and recoverable
from admitted source.

The candidate chain is:

```text
admitted corpus -> bounded canonical snapshot -> strict graph derivation
-> immutable AEAD-encrypted generation -> hybrid signed receipt
-> anti-rollback root transition -> least-context read lease
```

ML-KEM establishes/wraps keys, ML-DSA and Ed25519 sign evidence, and an AEAD
such as AES-256-GCM encrypts actual graph bytes. Do not call this “quantum
encryption”.

## Evidence

- `docs/superpowers/specs/2026-07-30-governed-memory-and-wasmtime-oracle-design.md`
- `scripts/memory-graph.mjs`
- `packages-ts/galerina-core-sentinel-state/`
- `packages-ts/galerina-core-sentinel-memory/`
- `packages-ts/galerina-devtools-provenance/`
- `../SLIDE/docs/NEURAL-SHAPE-ENGINE-RESEARCH-ARCHITECTURE.md` if present
- NIST FIPS 203, FIPS 204, SP 800-207, and primary storage/AEAD guidance

## Required output

1. Verdict on whether the design improves security or only relocates risk.
2. Exact immutable-generation, Merkle/root, receipt, and transition schemas.
3. Key hierarchy, epoch rotation, revocation, recovery, and offline-root role.
4. Atomic publish and crash/restart algorithm for Windows, Linux, and macOS.
5. Narrow writer and reader capabilities; prove neither can alter source or
   mint runtime authority.
6. Rollback, fork, substitution, deletion, partial-write, and replay attacks.
7. How to rebuild slowly from admitted source if the index is absent or
   quarantined without using an unsafe fallback.
8. Confidentiality leakage from graph topology, sizes, access patterns,
   metadata, logs, and filenames.
9. Performance budgets and what can realistically live in L1/L2 versus larger
   encrypted generations.
10. A phased implementation and falsification suite.

Clearly separate portable semantics from optional enclave/TME/SEV/TDX
strengthening. State every assumption and reject ambient local trust.
