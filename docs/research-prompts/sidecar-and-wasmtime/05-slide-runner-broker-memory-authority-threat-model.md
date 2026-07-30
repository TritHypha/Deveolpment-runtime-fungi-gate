# Independent review prompt 5 — SLIDE runner, broker, and memory authority

You are an independent sandbox, capability, compiler-runtime, and zero-trust
threat modeller. Work read-only.

## Question

Can the future SLIDE runner replace the authority-bearing responsibilities
once imagined for a Wasmtime sidecar without becoming an ambient privileged
process or weakening Galerina's eight-pillar governed-memory contract?

## Evidence

- `../SLIDE/docs/GALERINA-INTEGRATION-MIGRATION-PLAN.md`
- `../SLIDE/docs/SLIDE-ARCHITECTURE.svg` and adjacent architecture documents
- `docs/architecture/slide-v2-integration-2026-07-29.md`
- `docs/superpowers/specs/2026-07-30-governed-memory-and-wasmtime-oracle-design.md`
- Tower Citizen, Tri-Pipe, sentinel memory/state/egress, target, driver, and
  capability packages

## Required model

Cover source admission, checked GIR, VPEG/Tri-Fuse proofs, final artifacts,
package graph, driver manifests, isolated execution, memory regions, database
and network brokers, leases, nonce/replay state, audit-before-success,
quarantine, crash recovery, and result receipts.

Assume the OS, memory, local IPC, cached graph, plugins, drivers, documents,
and co-resident processes are hostile. Also analyse the future closed-network
profile: it may pre-prove and fuse checks but cannot drop core validity,
concurrency, resource, or fail-closed safety.

## Required output

1. Assets, actors, trust boundaries, and data-flow diagram.
2. Attack trees for authority escalation, confused deputy, stale lease,
   poisoned index, broker replay, result substitution, memory scrape, and
   audit reordering.
3. Minimal runner privileges and process/IPC split.
4. Typed request/result/failure/receipt contracts.
5. K3 composition rule at every release point.
6. Which checks may be statically discharged and which must remain dynamic.
7. Platform-specific isolation gaps on Windows 10/11, Linux, and macOS.
8. Positive controls, mutation tests, and deterministic fault replay.
9. Implementation order and component replacement ledger.
10. Verdict, critical unknowns, and no-go conditions.

Do not infer authority from “local”, signed, first-party, cached, physically
present, or previously admitted.
