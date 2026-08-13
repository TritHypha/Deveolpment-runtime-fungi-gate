# Slices 96-98 verdict-boundary design

## Decision

The next three symbol-scoped decisions in
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts`
share one trust-boundary family but do not share one conversion outcome.

- Slice 96 `collapse` is exactly represented by the existing package-owned
  `collapseVerdict` Fungi flow and its complete physical SLIDE/VOK proof. It is
  `SUPERSEDED_BY_EXISTING_FUNGI`.
- Slice 97 `authorize` is exactly represented by the existing package-owned
  `authorizeVerdict` Fungi flow and its complete physical SLIDE/VOK proof. It
  is `SUPERSEDED_BY_EXISTING_FUNGI`.
- Slice 98 `decideAtBoundary` is not the union of those scalar decisions. It
  returns an exact structured record whose diagnostic field is nullable and
  conditionally invokes an optional callback with a structured warning. The
  pinned physical profile has no exact nullable diagnostic-record plus
  optional callback/effect ABI. It is
  `BLOCKED_BY_OPTION_RECORD_CALLBACK_ABI`.

No duplicate Fungi asset and no host-projected diagnostic Boolean are
admitted.

## Exact proof shape

Slices 96 and 97 reuse only existing governed assets and tests. Their focused
package proofs must bind the exported TypeScript source, check the existing
Fungi asset, compare every closed K3 input and retain Unknown as deny. Their
physical proofs must publish a real `.slide`, independently re-admit it through
VOK, verify typed receipts, refuse malformed argument shapes, insufficient
work and mutated source/artifacts, and release no authority.

Slice 98 retains its existing TypeScript tests as the source contract. The
exit remains closed until one reviewed physical boundary can conserve all of:

1. exact `BoundaryDecision` field identity and values;
2. distinct absent diagnostic versus the complete warning record;
3. callback absence and exactly-once callback invocation for Unknown only;
4. typed callback/effect accounting without host precomputation;
5. malformed and surplus-field refusal plus independent VOK verification.

Replacing TypeScript `null` with a Fungi `Option` is desirable only when the
physical ABI proves the complete cross-boundary representation. It is not
permission to change observable source semantics silently.

## Authority and scheduling

Slices 96 and 97 are `PARALLEL_PURE`. Slice 98 is
`SERIAL_OBSERVABLE_CALLBACK` because callback invocation is observable and
ordered. The group grants no TypeScript removal, consumer switch, whole-file
classification, production admission, release, signing or push authority.

Repository-wide closure remains `UNKNOWN`. The codebase-memory build point
also remains `UNKNOWN` while its service returns `Transport closed`; Myco is a
bounded navigation fallback, not equivalent authority.

## Skill review expectation

The private skills already require duplicate search, exact K3 vectors,
physical profile proof, typed `Option`/record conservation, effect accounting
and refusal of host-projected decisions. Review both repositories at group
close and record `NO_SKILL_UPDATE` unless this work exposes a missing reusable
rule. Both repositories remain private and unpushed.
