# Flat package root-lock implementation plan

**Goal:** implement a deterministic reference lock and exact peer resolver
without moving or converting package source.

### Task 1: Pure graph contract

- [x] Add RED tests for deterministic ordering and exact dependency resolution.
- [x] Refuse duplicate, missing, conflicting, escaping and cyclic graphs.
- [x] Bind content and manifest identities into one root digest.

### Task 2: Repository intake

- [x] Enumerate only direct package peers and Git-tracked package files.
- [x] Use bounded stable regular-file reads and decoded duplicate-key refusal.
- [x] Separate internal runtime/optional/peer edges from external bootstrap
      and development edges.

### Task 3: Lock publication and verification

- [x] Emit one canonical `governance/flat-package-root-lock.json`.
- [x] Re-derive the complete lock and compare exact bytes in check mode.
- [x] Add an opaque process-local verified-lock identity for exact resolver use.

### Task 4: Evidence

- [x] Run focused and governed generator-contract tests.
- [ ] Run topology, graph and complete repository aggregate tests at chapter close.
- [x] Update roadmap/TODO with implementation green and physical debt blue.
- [x] Add a numbered KB R&D adjudication; local commit follows verification.
