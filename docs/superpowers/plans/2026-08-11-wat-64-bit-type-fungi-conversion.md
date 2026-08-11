# WAT 64-Bit Type Fungi Conversion Implementation Plan

**Goal:** Prove the private WAT 64-bit type decision as an exact package-owned
Fungi flow through compiler and physical SLIDE/VOK execution without retiring
TypeScript.

**Architecture:** Add one isolated `wat-64-bit-type.fungi` asset, one compiler
parity test and one independent physical publication test. Keep the executing
WAT-emitter path unchanged.

## Constraints

- True only for exact `Int64` or `UInt64`; every other String is false.
- No null, NaN, `else if`, exception syntax, `for` or `loop`.
- No consumer switch, release, production, bootstrap or retirement authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.
- Commit locally only; do not push.

### Task 1: Focused compiler RED

- [x] Register the intended package asset and add a focused test before the
  Fungi source exists.
- [x] Anchor the TypeScript sets/helper and define canonical-plus-hostile
  vectors.
- [x] Retain the intended missing-source RED result.

### Task 2: Exact Fungi implementation

- [x] Add `is64BitWatType` as one pure total flow with two comparisons.
- [x] Prove strict checking, typed interpretation and signed/admitted Wasm.
- [x] Derive parity through a public WAT-emission caller.
- [x] Run the complete compiler package and commit the bounded source wave.

### Task 3: Physical SLIDE/VOK proof

- [x] Publish the exact asset as one physical reference-only `.slide` export.
- [x] Re-admit and execute all vectors through independent VOK.
- [x] Refuse wrong counts/types, an unpaired surrogate, source mutation and
  one-byte artifact mutation.
- [x] Register the focused test in the governed tooling manifest.

### Task 4: Closure

- [x] Record exact hashes, build points, results and non-authority boundaries.
- [x] Record the qualifier branch-profile R&D blocker in TODO/roadmap evidence.
- [ ] Refresh generated owners through bounded checks.
- [ ] Commit explicit outputs and re-index codebase-memory plus Myco at the
  final exact HEAD without pushing.
