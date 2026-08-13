# Slice 79 Architecture Unknown Guard Adjudication

## Decision

`packages-galerina/galerina-framework-app-kernel/src/registry-durability-admission.ts#isArchitecture`
is `BLOCKED_BY_UNKNOWN_ARCHITECTURE_GUARD_ABI`.

The TypeScript decision remains active. No `.fungi` candidate, consumer switch
or retirement is authorized.

## Pinned scope

- Galerina build point: `e6db68e2dc26bc82de7a9ee013c7a04a1326423b`.
- TypeScript SHA-256: `8af5dc485a086d8be6f90e6c64208606b9e93a1ba3cb09c5d456e09f299cb4e7`.
- Exact live callers: `isRegistryDurabilityAdapterDescriptor` and
  `hostIsValid`.
- Reconciled SLIDE head: `ed326eaa`; capability reference `99a75a6`.

## Exact source contract

The predicate consumes JavaScript `unknown`. It returns true only when the
value is exactly the String `x86_64` or `aarch64`, with no coercion. Every other
String and every non-String JavaScript value returns false.

Both live callers first require an exact plain-data record and then use this
predicate as one conjunct in descriptor or host validation. The existing
`registry-durability-admission.fungi` asset accepts host-computed Boolean facts;
its `descriptorValid` input therefore does not replace this ingress decision.

## Fail-closed boundary ruling

A physical `String` parameter can preserve the two positive labels and hostile
String refusals, but it cannot preserve the source predicate's non-String
negative domain. Physical boundary rejection happens before the Fungi decision
and is not equivalent to the source's Boolean false result.

Passing a projected String or precomputed Boolean would move validation
authority into the TypeScript host. Creating such a candidate is refused.

## Decision and effect ledger

| Source branch | Input domain | Result | Effect | Physical issue | Exit |
|---|---|---|---|---|---|
| exact `x86_64` | JavaScript `unknown` | true | none | String case is representable | true |
| exact `aarch64` | JavaScript `unknown` | true | none | String case is representable | true |
| every other value | JavaScript `unknown` | false | none | non-String values are rejected before the flow | false |

The leaf is `PARALLEL_PURE`: strict equality against two immutable literals,
with no property access, coercion, mutation, host call or I/O. Its callers and
all durability admission/publication work require their own scheduling and
authority analysis.

## R&D trigger

Revisit after GIR, SLIDE and VOK expose a versioned heterogeneous value/type-kind
boundary that can execute the complete `unknown -> Bool` guard, or after an
owner-approved API migration makes both callers consume an exact typed record
without retaining a hidden JavaScript classification decision.

This result grants no retirement, production, signing, release or push
authority. Aggregate closure remains deferred to Slice 87.
