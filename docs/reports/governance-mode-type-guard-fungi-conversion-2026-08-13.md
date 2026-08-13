# Governance-mode type guard - Slice 71

## Result

Slice 71 is `BLOCKED_BY_UNKNOWN_TYPE_GUARD_ABI`.

The three admitted labels fit the physical String match ceiling, but the exact
function is not String-only. It accepts JavaScript `unknown` and returns false
for every non-matching value and type. The pinned physical profile has no
heterogeneous `unknown` parameter or JavaScript type-test boundary.

## Evidence

- Graph callers: `resolveProjectGovernance` and the governance test module;
  downstream configuration parsing reaches the production helper.
- Retirement row: `T2-runtime-core`, replacement absent, no declared bootstrap
  floor.
- Exact positive domain: `"full"`, `"auto"`, `"lean"`.
- Exact negative domain: every other JavaScript primitive and reference value,
  without coercion.
- Owning package at the unchanged source build point: typecheck and build
  passed; **54/54 tests passed**, zero failures and zero skips.
- Existing package Fungi asset: environment-mode String classification only;
  it does not supersede this `unknown` type guard.

No Fungi asset, queue candidate, test fixture or TypeScript source change was
created. The predicate and its callers remain active.

## Threadability

`PARALLEL_PURE`. Strict equality against String literals is deterministic,
non-coercing and effect-free for all JavaScript inputs. This does not supply the
missing physical heterogeneous-value ABI.

## Skill review

`NO_SKILL_UPDATE`. The private translation skill already requires the complete
source input domain and forbids narrowing or host-owned tag projection. The
writing skill already requires physical-boundary parity, so no reusable rule
is missing.

## R&D trigger

Revisit after a bounded, versioned Galerina dynamic-value sum type and physical
admission surface can represent every source category with exact surplus
refusal, or after the TypeScript API deliberately changes to accept only
String and all callers prove that new contract.

This result grants no conversion, retirement, signing, production, release or
push authority. Aggregate closure remains deferred to Slice 87.
