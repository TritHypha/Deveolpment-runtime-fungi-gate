# Governance change-class maximum Fungi conversion design

## Scope

Translate the private deterministic `maxClass` fold in
`packages-galerina/galerina-core-compiler/src/governance-diff.ts` into the
existing package-owned governance-diff Fungi asset. Preserve TypeScript as the
executing consumer and differential authority.

## Source semantics

The live source orders the closed `ChangeClass` family as:

1. `neutral`
2. `tightening`
3. `expansion`
4. `experimental`

`maxClass(a, b)` returns the higher-ranked class. Equal ranks return `a`, so
the decision is left-biased on a tie. Live callers supply only internally
derived `ChangeClass` values.

## Chosen shape

Extend `governance-qualifier-escalation.fungi` with three pure flows:

- `normalizeChangeClass(String) -> String` returns the exact four declared
  names and maps every other String to `experimental`;
- `changeClassRank(String) -> Int` ranks the normalized family `0..3`;
- `maxChangeClass(String, String) -> String` compares the ranks and returns the
  normalized left value on a tie, otherwise the normalized right value.

This keeps the typed 4 x 4 matrix byte-exact. The physical String boundary is
strictly safer than unchecked JavaScript: an unrecognised class cannot escape
as an authority label and instead becomes the most conservative declared
class, `experimental`.

## Rejected alternatives

1. Return either raw String argument after comparing fallback ranks. This can
   propagate an unknown authority class and is rejected fail-closed.
2. Add a Galerina enum or new syntax. The project already represents this
   internal TypeScript union at a String border; inventing syntax would widen
   the language and this slice's scope.
3. Convert the complete `diffGovernance` loop. That combines maps, arrays,
   optional values, classification, and aggregation. It needs a separate
   bounded design and must not be smuggled through a leaf conversion.

## Proof boundary

- Differential proof: all 16 declared pairs plus hostile Strings.
- Physical proof: publish one `.slide`, independently re-admit it, and verify
  typed String receipts through VOK.
- Hostile proof: wrong arity/type, invalid Unicode, inadequate work, source,
  receipt, safe-value envelope, and artifact mutation all refuse.
- No null, NaN, `else`, `else if`, exception syntax, or loop form.
- No registry widening, raised limit, consumer switch, or retirement claim.

