# Plugin Type Compatibility Fungi Conversion Design

## Objective

Translate the private, deterministic `isCompatibleType` decision in
`galerina-core-compiler/src/plugin-schema.ts` into one package-owned `.fungi`
flow and prove it through canonical compiler execution and physical SLIDE/VOK.
The TypeScript caller remains active.

## Exact semantic boundary

The admitted source contract is:

- input: two bounded `String` values, `actual` and `expected`;
- result: `true` only when `actual == "Int"` and `expected == "Float"`;
- every other canonical or hostile String pair returns `false`;
- no effects, mutation, allocation visible to the caller, exception, async
  scheduling, missing-value semantics, or numeric coercion.

The Fungi flow uses nested `if` statements plus one terminal `return false`.
It contains no `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for`, or
`loop`. Arbitrary admitted Strings are valid inputs; they do not become a
closed enum and cannot gain compatibility authority.

## Proof shape

1. A focused compiler test requires the new package asset and flow before the
   source exists, producing an exact missing-asset RED result.
2. The test anchors the private TypeScript decision source, derives external
   behaviour through `validatePluginInput`, and checks the complete 7 x 7
   canonical type-name matrix plus hostile and empty String pairs.
3. The exact Fungi source must pass strict type/governance checking, typed
   interpretation, canonical GIR/WAT construction, Wasm assembly, and Bool
   result parity.
4. A physical integration test compiles the same bytes with independent SLIDE,
   publishes one `.slide` export, re-admits it, executes the positive and
   negative String vectors, and refuses malformed arguments, source mutation,
   and physical artifact mutation.

## Authority boundary

This is a reference-only non-retiring slice. It does not export the private
TypeScript helper, switch `validatePluginInput`, remove the TypeScript source,
or grant bootstrap, production, plugin-execution, signing, release, or
retirement authority. A consumer switch requires an admitted source-to-SLIDE
bootstrap and an independently reviewed integration design.

## Acceptance evidence

- Focused RED fails for the missing package asset/flow.
- Focused compiler and physical SLIDE/VOK tests pass with zero skips.
- The complete compiler package remains green.
- Generated owners, canonical counts, tooling, roadmap, and phase-close are
  refreshed only after the new slice is proven.
