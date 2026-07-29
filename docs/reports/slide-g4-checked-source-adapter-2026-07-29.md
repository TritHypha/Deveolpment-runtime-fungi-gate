# SLIDE G4 checked-source fixture adapter

**Date:** 2026-07-29

**Status:** G4-A bounded adapter implemented; G4-B/G4-C remain open

**Authority released:** no

## Outcome

Galerina now has a `.fungi`-owned adapter from one exact three-flow
compiler-fact profile to the already frozen SLIDE V2-D semantic body:

- source fixture:
  `packages-galerina/galerina-core-compiler/tests/fixtures/slide-g4-checked-source.fungi`;
- adapter:
  `packages-galerina/galerina-core-compiler/src/self-hosted/slide-gfrontend-fixture-adapter.fungi`;
- regression and mutation evidence:
  `packages-galerina/galerina-core-compiler/tests/slide-gfrontend-fixture-adapter.test.mjs`.

The adapter accepts `ParseResult`, derives `FlowEntry` itself, and validates:

- exactly one ordered record declaration with three exact typed fields;
- exactly one ordered two-case enum declaration;
- exactly three ordered pure, effect-free flow signatures;
- `return value + 1`;
- the Boolean positive/negative branch and its exact checked call operands;
- the typed join and all three ordered K3 exits;
- the immutable `[3, 5, 8]` aggregate;
- `index < 0 or index >= 3` before access;
- the exact `values.get(index)` read;
- record construction and enum selection; and
- both nested fail-closed `_` match exits.

Only after those facts match does it materialize and validate V2-D, export the
canonical body, independently decode and validate it, and bind its
domain-separated semantic digest.

## Semantic-corpus correction

Fresh execution proved that the old frozen V2-E source is not the source form
of current V2-D function 2:

| Input | V2-E source | Frozen V2-D |
|---|---:|---:|
| `(2, 3, Allow)` | 5 | 6 |
| `(-2, 3, Allow)` | 1 | 7 |

V2-E returns `left + right`. V2-D increments `left` on the non-negative branch
and increments `right` on the negative branch before joining with `right`.
The 1,492-byte V2-E source and receipt remain unchanged. G4 uses a separately
named source fixture and does not rewrite or reinterpret the frozen V2-E
evidence.

## Exact successful identity

- canonical body length: **791 bytes**
- body digest:
  `b744e3076e99404e5cc424f89939236b1377f8515970d3077b0fc18eefe78e38`
- semantic digest:
  `a762d59c1552e6b3c8be45fd202b9767e52dbdfbd8684a6ea0b3cb2e029932f4`
- native certificate: absent
- authority: not released

## Refusal properties

Focused mutations cover record identity/order, enum cases, flow identity,
checked arithmetic, branch call operand, K3 arm loss, bounds drift, and
catch-all loss. Every refusal returns:

- `materialized = false`;
- an empty semantic body;
- empty body and semantic digests;
- zero source-flow count; and
- `authorityReleased = false`.

The implementation uses `SLIDE-GFRONT-002`, `-003`, `-005`, and `-007` from
the G4 failure family. Unknown or unresolved K3 outcomes never enter an allowed
path.

## Fresh focused evidence

```text
node --test tests/slide-gfrontend-fixture-adapter.test.mjs
12 tests · 12 pass · 0 fail
```

The positive test also executes the new source directly and proves its two
allowed branch results are 6 and 7.

## Deliberate limits

This is G4-A, not a general frontend snapshot:

- it recognizes one exact bounded semantic shape;
- it does not yet carry raw-source digest, edition identity, stable declaration
  IDs, total source spans, checker-profile digest, diagnostic-set digest,
  lowering trace, or governance/value-state/memory facts;
- direct TypeScript frontend checking is test evidence, not yet a sealed
  `.fungi` `CheckedModuleSnapshot` input;
- it does not emit a general V2-E frontend receipt;
- it selects no backend, executor, cache, driver, Tower Citizen route, or
  Tri-Pipe dispatch; and
- it grants no component-removal or native-output permission.

G4-B must add the materialize-once public candidate/refusal seam. G4-C must
replace this bounded shape recognition with the versioned immutable checked
snapshot and total lowering trace defined in the canonical handoff contract.

## Separate release-gate blocker

Final whole-project acceptance remains owner-blocked on selected-memory
authority. The independent read-only review prompt is
`docs/reports/PROMPT-memory-graph-authority-review-2026-07-29.md`.
