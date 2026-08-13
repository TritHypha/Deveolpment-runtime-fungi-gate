# Slice 74 Query Option Generic Union Adjudication

## Decision

`packages-galerina/galerina-data-query/src/index.ts#isSome` is
`BLOCKED_BY_GENERIC_TAGGED_UNION_ABI`.

No `.fungi` candidate, bridge, fixture or consumer switch is created. The
TypeScript helper and exported API remain active.

## Pinned scope

- Galerina build point: `4ff2dfdc01e948766f8a7065350a507b5ad2868f`.
- Source SHA-256: `b2351ff6ddf0c9a2fc18b0c7c0ba69e0dfc29fac72d79c3760d48f3039d12a36`.
- Exact symbol: `isSome<T>` at `src/index.ts`.
- Retirement row: `T3-package-graph`, replacement absent, no declared floor.
- Package-owned Fungi assets: none.
- Reconciled SLIDE head: `ed326eaa`; its capability reference remains
  `99a75a6` because the later change is cross-platform CI path handling only.

## Source contract

The exported source type and predicate are:

```text
QueryOption<T> =
  { kind: "some", value: T }
  | { kind: "none" }

isSome<T>(option: QueryOption<T>)
  -> option is { kind: "some", value: T }
```

The runtime decision reads `option.kind` and compares it exactly with the
String `"some"`. The type-predicate result also narrows the caller's generic
payload type `T`; it is not merely a Boolean over a concrete integer option.
The current graph has one package-test caller, but the helper is an exported
package entry point.

## Decision and effect ledger

| Source operation | Proven source type | Result | Effect/boundary | Required physical operation | Exit |
|---|---|---|---|---|---|
| read `option.kind` | generic structural tagged union | String | JavaScript property observation | exact parametric union admission and field read | boundary refusal if the input is not admitted |
| compare with `"some"` | String | Bool | none after admission | exact String equality | `false` for `none` |
| narrow payload | arbitrary `T` retained | type predicate | compile-time caller contract | preserve the admitted payload type and variant identity | `true` only for `some` |

The live JavaScript property boundary is `SERIAL_HARD_PATH`: TypeScript
`readonly` is compile-time-only and the runtime object surface does not itself
exclude accessors, proxies or concurrent mutation. A future closed immutable
physical tagged union could derive a different scheduling class.

## Capability comparison

Fungi has a frontend `Option<T>` type and `Some`/`None` constructors. That
does not prove parity with this custom structural API. The current flow grammar
does not declare user-authored generic flow parameters, and the pinned
physical type table has concrete `result_i32`, `result_bytes`, `array_i32`,
one fixture record and one fixture variant only. It has no parametric option or
arbitrary-payload tagged-union parameter.

SLIDE's immutable array option work is a bounded concrete `Array<Int>` profile.
It does not widen the public parameter ABI to `QueryOption<T>` and cannot
preserve an arbitrary `T` payload.

## Rejected substitutions

- Mapping the API to `Option<Int>` specializes `T` and changes the public type.
- Mapping it to frontend `Option<T>` changes the source record/variant ABI and
  still lacks a physical generic parameter profile.
- Passing only `option.kind` leaves payload and variant admission in the host.
- Passing a precomputed Boolean leaves the complete decision in TypeScript.
- A checker-clean generic type reference is not physical `.slide`, independent
  re-admission or VOK evidence.

## R&D trigger

Revisit after a versioned generic tagged-union profile preserves variant tags,
arbitrary admitted payload descriptors, exact field sets and surplus refusal
through GIR, physical `.slide`, independent re-admission and VOK. An alternative
owner-approved API migration to one concrete `Option<X>` must first update and
test every consumer; it is not this translation.

This adjudication grants no conversion, retirement, production, signing,
release or push authority. Aggregate closure remains deferred to Slice 87.
