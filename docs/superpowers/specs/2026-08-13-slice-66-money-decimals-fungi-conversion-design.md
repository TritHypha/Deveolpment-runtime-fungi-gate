# Slice 66 money-decimals Fungi conversion design

## Objective

Add one package-owned Fungi reference twin for the current
`moneyDecimals(currency)` leaf and prove it through strict checking, package
differential evidence, physical `.slide` publication and independent VOK
re-admission. Keep TypeScript and its `moneyMethod` consumer active.

## Bound source and authority

- Source: `packages-galerina/galerina-core-compiler/src/stdlib.ts#moneyDecimals`.
- Candidate: `packages-galerina/galerina-core-compiler/src/self-hosted/money-decimals.fungi`.
- Retirement tranche: `T0-compiler`, with no declared bootstrap floor.
- Live caller: `moneyMethod`; its downstream paths are `moneyBinary` and
  `callStdlib`.
- Queue authority is limited to the exact `moneyDecimals` symbol.
- Threadability: `PARALLEL_PURE` for this immutable leaf only. Money object
  construction, interpreter state, compilation, publication and admission are
  not granted parallel authority.

## Exact behavior

The current TypeScript source returns integer `2` for every String currency.
The Fungi twin therefore accepts `currency: String`, deliberately ignores its
content and returns `2`. The parameter remains in the boundary so a future
registry-driven implementation cannot silently remove currency dependence.

This conversion does not settle RD-0349 or claim that every currency has two
minor-unit digits as a permanent language rule. When the pinned currency
registry lands, both the TypeScript leaf and this twin must change together and
the differential must turn red until they agree.

The flow contains no null, NaN, `else if`, exception syntax, iteration,
effects, host API, authority grant, Hallmark, border or vault access.

## Approaches considered

1. **Exact constant leaf with retained String parameter (selected).** This is
   the complete current source behavior and is supported by the scalar profile.
2. **Implement the future currency registry now.** Rejected: the pinned ISO
   snapshot and owner-governed registry do not exist in this slice.
3. **Inline literal `2` at every caller.** Rejected: it destroys the single
   future change point and would not convert the named source symbol.

## Proof contract

1. RED: add a package test requiring the loaded Fungi asset and fail while it
   is absent.
2. GREEN: add the exact flow, loaded-asset entry and symbol-scoped queue
   decision; strict-check it and prove interpreter plus signed-Wasm vectors.
3. Prove the public Money path still rounds representative currencies to two
   decimals under the current source behavior.
4. Publish one physical `.slide`, independently re-admit it through VOK, prove
   typed `Int` receipts for representative and hostile Strings, and retain
   missing/surplus/type/invalid-text/exhaustion/mutation refusals.
5. Keep TypeScript and all consumers active. No retirement, signing,
   production, release or push authority is granted.
6. Review both private Fungi skills at slice close; update only for a new
   reusable, evidence-backed lesson.

## Failure policy

Any frontend, source-binding, public-path, physical, VOK, mutation or
exhaustion failure closes the slice as blocked at that exact boundary. Do not
invent registry data or remove the parameter to manufacture a pass.

## Adjudicated outcome

`BLOCKED_BY_BOOTSTRAP_FLOOR`.

The retirement ledger records no explicit `declaredFloor` on `stdlib.ts`, but
that field is not the final queue authority. The conversion queue derives the
compiler bootstrap floor from the owning path/tranche and refused the exact
symbol-scoped candidate with `bootstrap floor override refused`. The attempted
decision was removed and the queue remained unchanged. No Fungi asset, test,
loaded-asset entry or source change was created.
