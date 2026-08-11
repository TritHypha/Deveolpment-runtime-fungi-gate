# Governance Qualifier Escalation Fungi Conversion Implementation Plan

**Goal:** Prove the private governance qualifier escalation decision as an
exact package-owned Fungi flow through compiler and physical SLIDE/VOK
execution without retiring TypeScript.

**Architecture:** Add one isolated `governance-qualifier-escalation.fungi`
asset, one compiler parity test and one independent physical publication test.
Keep the executing governance-diff path unchanged.

## Constraints

- Exact ranks: `pure 0`, `flow 1`, `guarded 2`, `secure 3`, `privileged 4`,
  every other String `0`.
- Escalation is strict `afterRank > beforeRank`.
- No null, NaN, `else if`, exception syntax, `for` or `loop`.
- No consumer switch, release, production, bootstrap or retirement authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.
- Commit locally only; do not push.

### Task 1: Focused compiler RED

- [x] Register the intended package asset and add a focused test before the
  Fungi source exists.
- [x] Anchor the private TypeScript table/function and define a complete
  canonical-plus-hostile matrix.
- [x] Retain the intended missing-source RED result.

### Task 2: Exact Fungi implementation

- [x] Add the source-authoritative pure `qualifierRank` helper and the pure
  total `qualifierEscalated` comparison.
- [x] Prove strict checking, typed interpretation and signed/admitted Wasm.
- [x] Derive parity through the public governance-diff caller surface.
- [x] Run the complete compiler package and commit the bounded source wave.

### Task 3: Physical SLIDE/VOK proof

- [x] Publish the exact asset as one physical reference-only `.slide` export
  through SLIDE `71abe86` and its unchanged wide-control registry.
- [x] Re-admit and execute the complete matrix through independent VOK without
  weakening arbitrary-String fallback.
- [x] Refuse wrong counts/types, an unpaired surrogate, source mutation and
  one-byte artifact mutation.
- [x] Register the focused test in the governed tooling manifest.

### Task 4: Closure

- [x] Record exact hashes, build points, results and non-authority boundaries.
- [x] Refresh generated owners through bounded checks.
- [ ] Commit explicit outputs and re-index codebase-memory plus Myco at the
  final exact HEAD without pushing. Myco is fresh at the current checkpoint;
  codebase-memory returned `Transport closed` and remains fail-closed UNKNOWN.
