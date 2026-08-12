# Slices 50-52 Wide Boundary Adjudication

## Decision

Slices 50-52 are `BLOCKED`. No Fungi asset, conversion test, loaded-asset
entry, queue authority, consumer switch or retirement claim is created.

| Slice | Exact symbol | Decisive boundary |
|---:|---|---|
| 50 | `galerina-target-cpu/src/index.ts#canUseLowBitCpuPath` | The source consumes an exact capability record and searches an array. The current physical profile cannot preserve that external record/array ABI; precomputing feature booleans in the host would move decision authority out of Fungi. |
| 51 | `galerina-db-postgres/src/index.ts#isPositiveSafeInteger` | JavaScript accepts exact integers through `2^53 - 1`, including values outside signed i32. Current checked-Fungi `Int` lowers to i32 and has no exact binary64 `Number.isSafeInteger` predicate. |
| 52 | `galerina-data-database/src/index.ts#isNonNegativeSafeInteger` | The same binary64 safe-integer versus i32 mismatch is decisive. The current frontend also cannot preserve the source decision over fractions, infinities, NaN and signed zero by merely declaring an `Int` parameter. |

These are source-domain refusals, not incomplete implementations. A narrowed
scalar helper could prove a leaf calculation but would not translate the
assigned source boundary.

## Independent owner evidence

The live code graph proves the exact symbols and callers. The retirement
ledger assigns no bootstrap floor and records no Fungi replacement for any of
the three source files. The three package manifests declare no loaded Fungi
assets, and bounded tracked-file checks find no package-owned exact or sibling
conversion.

Fresh owning-package lanes pass:

- CPU target: **3/3**;
- PostgreSQL: **24/24**;
- database: **22/22**.

The compiler's focused integer-range lane passes **7/7** and proves that
Galerina `Int` lowers to signed i32. Values above `2147483647` cannot therefore
establish parity with JavaScript's safe-integer ceiling
`9007199254740991`. This reproduces the earlier JSON safe-integer refusal at
the current architecture boundary; it does not supersede these package-local
symbols because no Fungi asset was produced.

For Slice 50, the declared TypeScript record includes architecture,
`supportsLowBitKernels`, and a SIMD feature array. The source reads the record
and performs `includes` itself. An external bridge that supplies only
`isX86`, `isArm`, `hasAvx2`, or `hasNeon` would make the host the decision
authority and is forbidden. Untyped JavaScript callers can also expose
missing fields, non-arrays, accessors and proxies; a future narrowed nominal
contract must be an explicit source/API change, not an implicit conversion.

## R&D triggers

Revisit Slice 50 only after a reviewed physical profile can admit and
independently re-verify the exact closed capability record and bounded SIMD
array, including missing/surplus/wrong-class/accessor/proxy refusal and array
work receipts.

Revisit Slices 51-52 only after a reviewed numeric profile can prove the
complete source contract. At minimum it requires:

1. a typed physical integer width covering `[-(2^53 - 1), 2^53 - 1]`;
2. an exact input border for JavaScript binary64 values or an explicitly
   approved source-contract narrowing;
3. typed refusal for NaN, infinities, fractions and unsafe magnitudes;
4. preserved zero, signed-zero and comparison behavior where observable;
5. SLIDE/VOK receipts at i32 edges, i32-plus-one, safe-integer edges, unsafe
   neighbors and malformed physical inputs.

No compiler or SLIDE limit may be widened merely to make these slices pass.

## Skill-close review

`NO_SKILL_UPDATE` for both public Fungi skills. The translation skill already
states that a physical type narrower than the source domain is `BLOCKED`,
calls out i32 versus wider JavaScript integers, and requires exact record ABI
proof. The writing skill already requires physical record preservation and
refusal of wrong numeric classes. These slices add build-point evidence, not
a new timeless rule.
