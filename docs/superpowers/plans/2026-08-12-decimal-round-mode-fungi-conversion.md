# Decimal round-mode Fungi conversion implementation plan

**Goal:** Add and physically execute an exact package-owned Fungi twin for the
exported TypeScript `isRoundMode` predicate without switching or retiring its
TypeScript consumers.

## Constraints

- Accept only the seven exact TypeScript `ROUND_MODES` spellings.
- Add no trimming, normalization, alias or default rounding policy.
- Add no null, NaN, `else if`, `else`, `throw`, `try`, `catch`, `for`, `while`
  or `loop`.
- Keep TypeScript and every consumer active; grant no production or release
  authority.
- Do not run full tooling, normal phase-close or whole-memory evaluation.

## Task 1: RED differential contract

- Create
  `packages-galerina/galerina-core-compiler/tests/decimal-round-mode-fungi-conversion.test.mjs`.
- Require the package asset and exact source path, assert the prohibited-shape
  rules, and compare literals, TypeScript and interpreted Fungi over all seven
  canonical modes plus hostile non-members.
- Run the new test and confirm it fails only because the source/asset is absent.

## Task 2: Minimal Fungi flow

- Create
  `packages-galerina/galerina-core-compiler/src/self-hosted/decimal-round-mode.fungi`.
- Implement two bounded exact-match helper flows (four and three modes) with
  terminal `_ => return false`, then implement
  `isRoundModeFungi(mode: String) -> Bool` as their dependency-ordered public
  composition. This stays inside SLIDE's five-branch registry ceiling.
- Register the source once in the compiler package's `loadedAssets`.
- Strict-check the exact source and rerun the differential test.

## Task 3: Physical SLIDE/VOK proof

- Create `scripts/tests/decimal-round-mode-fungi-slide.integration.test.mjs`.
- Compile and publish the exact source, pin the derived String-to-Bool registry,
  independently prepare a fresh execution handle, verify typed Bool receipts,
  and assert `authorityReleased === false`.
- Refuse wrong arity/type, invalid Unicode, inadequate work, source mutation and
  publication mutation. Require one executed test with zero skips.

## Task 4: Bounded closure

- Run the focused Decimal neighborhood, compiler package suite, canonical
  package owner, Golden Pack and retirement owner.
- Record exact byte/digest/commit/registry custody in a focused report.
- Update `docs/TODO.md`, the active roadmap and registered generated owners.
- Run graph-all at most once before final roadmap publication; do not run the
  excluded crash lanes.
- Attempt primary codebase-memory refresh once. If its transport remains
  closed, report it `UNKNOWN`; refresh Myco, verify the flow is queryable and
  finish with a clean tracked tree and local commits only.
