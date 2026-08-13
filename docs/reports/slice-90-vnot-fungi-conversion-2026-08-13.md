# Slice 90 `vNot` Fungi Conversion

`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#vNot`
now has a package-owned, reference-only Fungi candidate at
`packages-galerina/galerina-tower-citizen/src/self-hosted/verdict-not.fungi`.
The TypeScript source, public package export and consumers remain active.

## Bound identities

- Galerina physical-proof commit:
  `84f4524e398ff6d584a006cd7b6d2d9e917a6cdc`.
- TypeScript source SHA-256:
  `801f3aa1366bee32aa2015b76a5f457677193d621fe0d425780c90dd6b5c37a1`.
- Fungi candidate SHA-256:
  `3b5edf496bc4a908c21c9b0d56a379f4bcab1eee0511235abe8dfd2093dc6a3d`.
- Independent SLIDE commit:
  `ed326eaa14f1a899841cbac8da353d400970367e`.

The retirement ledger previously classified the owning TypeScript file as
`replacement-absent`, with no execution authority and no declared floor. This
receipt proves only the exported `vNot` symbol; executable siblings in the same
file are not retired by it.

## Exact behavior

| Input | Output |
|---:|---:|
| `DENY (-1)` | `ALLOW (+1)` |
| `INDETERMINATE (0)` | `INDETERMINATE (0)` |
| `ALLOW (+1)` | `DENY (-1)` |

The candidate preserves `Verdict -> Verdict` directly. It uses one exhaustive
three-arm `check`, no effects, no iteration, no exception syntax and no
integer or host-projected bridge. Galerina's canonical compact operator is
`flip(verdict)`, but the pinned SLIDE checked-Fungi frontend does not yet parse
or lower it. The candidate therefore uses the exact typed `check` desugaring;
this receipt does not claim direct physical `flip` support.

The TypeScript helper chain is `asVerdict(negTrit(a))`. For the declared
`Verdict` domain, `negTrit` returns only another closed trit, so the mint's
invalid-value trap is unreachable. The physical boundary still independently
refuses every non-K3 input.

## Evidence

- Package-owned candidate and independent TypeScript oracle: **19/19** focused
  tests passed. The existing hand-authored K3 NOT table remains 3/3.
- Complete Tower-Citizen package: **509/509** passed with zero failures, skips,
  cancellations or todo tests.
- Physical SLIDE/VOK lane: **1/1** passed. The package compiler bound parameter
  type ID `3` and result type ID `3`, published one physical `.slide`, and VOK
  independently re-admitted it for every K3 value.
- Typed receipts returned the exact three outputs with `fallbackInvoked: false`
  and `authorityReleased: false`.
- Missing, surplus, wrong-type and non-K3 arguments refused. Exhausted work,
  one-byte source and artifact changes, receipt mutations and every changed
  safe-value envelope byte also refused.

This is a complete reference proof for one exported pure symbol. It is not a
consumer switch, production grant, TypeScript retirement or whole-file proof.
The symbol is `PARALLEL_PURE`; no package-wide threadability claim follows.

## Skill review

Both private skill repositories required a reusable clarification and remain
private custody:

- `writing-fungi` commit `dc2ef82f` requires canonical `flip` only when the
  selected physical profile proves it, and records the exhaustive typed
  `check` desugaring for a pin that lacks direct support.
- `translating-typescript-to-fungi` commit `30eb4dd3` requires typed K3 semantic
  reconciliation before syntax selection and prohibits claiming direct
  physical `flip` support from desugared evidence.

Each skill change was RED-first, passes 3/3 deterministic audit tests, and
passes its bounded release audit. Neither repository was pushed or published.

## Slice-close receipt

Skill disposition: SKILL_UPDATE dc2ef82facdcfe77570ec8238fa1e5c9f21ef7c1
Threadability: PARALLEL_PURE
Source classification: CANDIDATE
Bounded closure: COMPLETE
