# Slice 71 governance-mode type-guard adjudication

## Objective

Determine whether `galerina-core-config/src/governance.ts#isGovernanceMode`
can be translated to an exact package-owned Fungi/SLIDE predicate without
narrowing its JavaScript `unknown` input to String.

## Bound source

- Package: `galerina-core-config`, tranche `T2-runtime-core`.
- Retirement ledger: no declared bootstrap floor and no existing replacement.
- Production caller: `resolveProjectGovernance`, with downstream project
  configuration loading; the package test module also calls it directly.
- TypeScript behavior: return true only for the literal values `"full"`,
  `"auto"` and `"lean"`; accept every JavaScript value as input and return
  false for all other values.

## Adjudication

`BLOCKED_BY_UNKNOWN_TYPE_GUARD_ABI`.

The three String labels fit the current flat-match ceiling, but that is not the
complete source contract. The function is a JavaScript type guard over
`unknown`, so numbers, Booleans, objects, arrays, symbols, bigints, functions,
`undefined` and foreign values must all reach the same boundary and return
false. The pinned checked-Fungi physical profile admits typed scalar parameters
and cannot carry or inspect this heterogeneous `unknown` domain.

A host-side `typeof value === "string"` gate followed by a String-only Fungi
flow would leave the type-guard decision in TypeScript. A tag ABI would require
an unbounded complete mapping for every JavaScript category and identity, not a
three-label String table.

## Alternatives rejected

1. **Change the parameter to String.** This narrows the public type-guard API.
2. **Pre-filter non-Strings in TypeScript.** This retains the replaced decision
   at the host border.
3. **Tag String versus other.** The host would still own JavaScript type
   classification and the tag bridge is not part of the source contract.
4. **Reuse the environment-mode asset.** That existing predicate accepts a
   String and governs a different four-label domain.

## Threadability and authority

`PARALLEL_PURE`: JavaScript strict equality with String literals performs no
coercion or property access and has no ambient effect. The missing physical
input domain still blocks admission. No Fungi asset, queue candidate, consumer
switch or retirement is authorized.
