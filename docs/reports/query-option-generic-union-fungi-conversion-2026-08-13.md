# Query Option Generic Union - Slice 74

## Result

Slice 74 is `BLOCKED_BY_GENERIC_TAGGED_UNION_ABI`.

The exported helper is a generic type guard over the custom structural
`QueryOption<T>` union. The pinned physical surface has no generic
arbitrary-payload tagged-union parameter and cannot conserve that API.

## Evidence

- Graph source: `isSome<T>` reads `option.kind`; its single current caller is
  the package contract test, while the helper remains an exported entry point.
- Retirement row: `T3-package-graph`, replacement absent, no declared floor.
- Package Fungi inventory: empty.
- Frontend distinction: Fungi knows `Option<T>`, but the source API is a custom
  `{ kind: "some", value: T } | { kind: "none" }` structural union.
- Physical distinction: the pinned type table contains bounded concrete result,
  array, fixture-record and fixture-variant profiles, not parametric option or
  arbitrary `T` payload admission.
- Focused Data Query lane: **19/19 tests passed**, zero failures and zero skips.

No Fungi asset, bridge, candidate test or TypeScript source change was made.
The source helper and package API remain authoritative.

## Threadability

`SERIAL_HARD_PATH` at the live JavaScript object boundary. The runtime surface
does not independently exclude accessors, proxies or concurrent mutation.
This classification does not prevent a future admitted immutable tagged-union
leaf from being reclassified from its own evidence.

## Skill review

`NO_SKILL_UPDATE`. The private translation skill already requires complete
generic, union, property and target-profile conservation and forbids scalar or
tag projection. The writing skill already distinguishes frontend types from
physically admitted SLIDE/VOK types. No new reusable rule was learned.

## R&D trigger

Revisit after a versioned generic tagged-union ABI preserves tags, arbitrary
payload descriptors, exact shapes and surplus refusal through GIR, physical
`.slide`, independent re-admission and VOK. A concrete-option API redesign is a
separate owner-approved migration.

This result grants no conversion, retirement, production, signing, release or
push authority. Aggregate closure remains deferred to Slice 87.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing skills already require exact generic union and physical payload proof
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
