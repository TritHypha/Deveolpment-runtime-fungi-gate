# Slice 95 anyOf Fungi conversion adjudication

## Outcome

Slice 95 classifies
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#anyOf`
as `BLOCKED_BY_VERDICT_ARRAY_FOLD_ABI`. No placeholder Fungi asset is created.

The source accepts arbitrary-length `readonly Verdict[]`, returns Unknown for
the empty array, preserves a single element, reduces a nonempty array through
ordered K3 maximum, and fails closed on malformed elements. Slice 92 proves the
binary `vOr` leaf; it does not represent this array boundary.

The selected checked-Fungi physical profile admits scalar Bool/Verdict
parameters only. It has no `Array<Verdict>` parameter, exact length/index
operations or bounded maximum-fold route. Host-precomputing emptiness, maximum
or element validity would move authority outside Fungi and is refused.

## Evidence and exit

- Tower-Citizen passes **515/515**, including exhaustive authorization checks
  for lengths one through four, empty-array Unknown, single-Allow preservation
  and malformed-element refusal.
- Reopen only after a reviewed physical `Array<Verdict>` ABI admits exact
  length/index semantics, bounded work, malformed/surplus refusal, empty→Unknown
  and complete differential plus independent VOK proof.

TypeScript and all callers remain active. No consumer switch, retirement,
production, release, signing, push or authority permission follows.

## Skill review

The private `writing-fungi` repository is clean at
`dc2ef82facdcfe77570ec8238fa1e5c9f21ef7c1`; the private
`translating-typescript-to-fungi` repository is clean at
`30eb4dd3619499b754189ff784d4831e9508d49d`. Existing container-ABI and
no-host-projection rules cover the refusal, so no skill update is required.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing container ABI and no-host-projection rules require this refusal
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
