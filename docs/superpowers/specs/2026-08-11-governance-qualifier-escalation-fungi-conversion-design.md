# Governance Qualifier Escalation Fungi Conversion Design

## Objective

Translate the private, deterministic `qualifierEscalated` decision in
`galerina-core-compiler/src/governance-diff.ts` into one package-owned `.fungi`
flow and prove it through canonical compiler execution and physical SLIDE/VOK.
The TypeScript function and both critical callers remain active.

## Exact semantic boundary

The source table ranks qualifier Strings as `pure = 0`, `flow = 1`,
`guarded = 2`, `secure = 3`, and `privileged = 4`. Every other String receives
the source fallback rank `0`. `qualifierEscalated(before, after)` returns true
only when the rank of `after` is strictly greater than the rank of `before`.

The Fungi asset exposes a pure `qualifierRank(String) -> Int` helper followed
by the pure `qualifierEscalated(String, String) -> Bool` decision. This is the
same table-plus-comparison shape as the TypeScript source and keeps each
lowered function inside the existing bounded wide-control registry. It
contains no null, NaN, `else if`, exception syntax, `for` or `loop`. Arbitrary
admitted Strings remain valid inputs and cannot acquire a rank above `pure`.

## Proof shape

1. A focused compiler test requires the package asset and flow before the
   source exists, producing an exact missing-asset RED result.
2. The test anchors the private TypeScript table and decision source, covers
   the complete 7 x 7 canonical-plus-hostile String matrix, and derives caller
   behaviour through the public governance-diff surface.
3. Exact Fungi bytes pass strict checking, typed interpretation, canonical
   GIR/WAT construction, signed/admitted Wasm, and Bool parity.
4. Independent SLIDE build `71abe86` selects its already-adopted exact
   wide-control registry only when the lowered scalar function exceeds the
   parent eight-block ceiling. A physical integration test publishes one
   `.slide`, re-admits it through VOK, executes the matrix, and refuses
   malformed arguments, source mutation and artifact mutation.

## Authority boundary

This is a reference-only non-retiring slice. It does not export or switch the
private TypeScript helper, replace `classifyDelta` or `diffGovernance`, or grant
bootstrap, production, signing, release or retirement authority. A consumer
switch requires a separately reviewed admitted integration design.

## Acceptance evidence

- Focused RED fails only for the missing package asset.
- Strict, interpreter, signed-Wasm and physical SLIDE/VOK proofs pass with zero
  candidate skips.
- The complete compiler package remains green.
- Generated owners and indexes are refreshed without invoking the crash-linked
  full tooling or normal phase-close processes.
