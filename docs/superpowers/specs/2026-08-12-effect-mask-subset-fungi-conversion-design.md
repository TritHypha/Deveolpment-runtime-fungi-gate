# Effect-mask Subset Fungi Conversion Design

## Purpose

Convert exported TypeScript `effectsSubset` into package-owned Fungi without
changing effect-name derivation, the authoritative string-name checks, or any
consumer.

The selected TypeScript source is
`packages-galerina/galerina-core-compiler/src/type-registry.ts` at blob
`b31e455feb5724dc5ce26ac6091028ae106c82ff`. The live function is:

```typescript
export function effectsSubset(required: EffectFlagsMask, declared: EffectFlagsMask): boolean {
  return (required & declared) === required;
}
```

Its current direct graph callers are three compiler test families. The
exported API remains active and TypeScript remains the executing bootstrap and
differential layer.

## Approaches considered

### Exact `Int.bitAnd` mask algebra - selected

Accept `required: Int` and `declared: Int`, compute
`Int.bitAnd(required, declared)`, and compare the result with `required`.
This matches JavaScript signed 32-bit bitwise AND throughout the Fungi/SLIDE
Int domain and preserves the `1 << 30` `UnmappedEffect` fail-closed sentinel.

### Expand every effect into Boolean fields - rejected

This would duplicate the live registry, grow whenever an effect changes, and
risk treating an unrepresented effect as authority-free. It is less exact and
less maintainable than the mask operation.

### Move the decision to a separate engine extension - rejected

Bitwise infix syntax is deliberately absent from Fungi, but the live checked
stdlib and WAT emitter provide the governed static `Int.bitAnd` operation. A
new extension boundary would add authority and deployment surface without
improving semantics.

## Exact interface and data flow

```fungi
pure flow effectsSubsetFungi(required: Int, declared: Int) -> Bool {
  return Int.bitAnd(required, declared) == required
}
```

The caller continues to derive masks from effect names. The flow receives only
two signed 32-bit integer facts, applies one deterministic static operation,
and returns one Boolean. It performs no effect-name normalization, registry
lookup, coercion, authority release, I/O, allocation, or ambient-state access.

The valid production domain is the current non-negative `EffectFlagsMask`
range from `0` through the `1 << 30` sentinel. Differential tests also exercise
signed 32-bit hostile values because the JavaScript export can be invoked at
runtime without TypeScript enforcement. Fungi/SLIDE must match those values
exactly. NaN, infinity, fractions, and values outside signed 32-bit Int refuse
at the physical typed boundary; they are not admitted as Fungi values.

## Decision and effect ledger

| Source expression | Proven type | Fungi construct | Direct effects | Failure exit | Evidence |
|---|---|---|---|---|---|
| `required & declared` | signed 32-bit bitwise mask result | `Int.bitAnd(required, declared)` | none | physical typed boundary refuses non-Int input | live stdlib and WAT emitter |
| `... === required` | `Bool` | `==` | none | returns false when required bits are missing | live TypeScript and differential vectors |

No branch, absence, exception, loop, async operation, mutation, or cleanup path
exists inside the source function.

## Verification

1. A RED differential test requires package ownership of
   `effectsSubsetFungi` and compares live TypeScript with Fungi over empty,
   exact, proper subset, disjoint, combined, `UnmappedEffect`, high-bit, and
   signed hostile vectors.
2. The exact candidate must strict-check with zero errors and warnings.
3. Independent SLIDE must compile, publish, re-admit, and execute the exact
   source. Its successful registry identity and digest are pinned from the
   first independently admitted result.
4. Typed VOK receipts must return the exact Bool and retain
   `authorityReleased: false`.
5. Wrong arity/type, NaN, infinity, fractions, out-of-range integers,
   inadequate work, source/receipt/envelope mutation, and artifact mutation
   must refuse.
6. Golden, retirement, graph, index, percentage, roadmap, count, and path-leak
   owners close only through their registered generators and checks.

## Authority boundary

This is a reference and physical-execution proof, not a consumer switch. It
does not authenticate mask provenance, replace authoritative per-effect
string-name checks, authorize an unmapped effect, retire TypeScript, or release
production authority. No SLIDE registry is widened as part of this design. If
the existing exact `Int.bitAnd` surface is absent, the physical slice records a
profile blocker instead of adding a substitute operation.

The Fungi source contains no null, NaN, `else if`, `else`, throw, try/catch,
`for`, `while`, or `loop`.
