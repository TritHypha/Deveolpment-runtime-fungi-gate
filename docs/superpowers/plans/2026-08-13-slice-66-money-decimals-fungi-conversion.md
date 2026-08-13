# Slice 66 Money-Decimals Fungi Conversion Plan

**Goal:** Prove a package-owned, physically admitted Fungi twin for the current
`moneyDecimals(currency) -> 2` leaf while retaining TypeScript and its caller.

## Constraints

- Exact named symbol only; no currency-registry invention.
- No source consumer switch or TypeScript deletion.
- Focused checks only; aggregate graphs, indexes, roadmaps and full closure are
  deferred until Slice 87.
- Commit locally only and do not push.

## Task 1: Establish RED and queue scope

- [ ] Add a focused test requiring `money-decimals.fungi` and its package
  loaded-asset entry; run it while the asset is absent and require that exact
  failure.
- [ ] Add a symbol-scoped candidate decision for `stdlib.ts#moneyDecimals`,
  regenerate the queue and require no whole-file authority.

## Task 2: Implement and prove the exact leaf

- [ ] Add `pure flow moneyDecimals(currency: String) -> Int { return 2 }` with
  a binding intent contract.
- [ ] Strict-check the asset and run focused interpreter/signed-Wasm vectors.
- [ ] Prove representative public Money rounding still uses two decimal places.
- [ ] Add a focused physical package candidate, publish it, re-admit it through
  VOK and verify typed Int receipts plus refusal/mutation boundaries.

## Task 3: Conserve the slice

- [ ] Update the live register, Slice 66 report and `docs/TODO.md`.
- [ ] Review both private skills and record either an exact verified update or
  `NO_SKILL_UPDATE`.
- [ ] Run queue freshness, path-leak and whitespace checks.
- [ ] Commit only the exact Slice 66 files locally; do not push.

## Execution outcome

Task 1 stopped at queue preflight. The symbol is pure and its file ledger row
has no explicit declared floor, but the authoritative queue derives a compiler
bootstrap floor and refused the override. The attempted decision was removed;
no implementation or test was started. Slice 66 closes as
`BLOCKED_BY_BOOTSTRAP_FLOOR`, with aggregate closure still deferred.
