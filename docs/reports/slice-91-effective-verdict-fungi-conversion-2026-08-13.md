# Slice 91 `effectiveVerdict` Fungi Conversion

`packages-galerina/galerina-tower-citizen/src/substrate-model.ts#effectiveVerdict`
now has a package-owned, reference-only Fungi candidate at
`packages-galerina/galerina-tower-citizen/src/self-hosted/effective-verdict.fungi`.
The TypeScript source, package export and consumers remain active.

## Bound identities

- Galerina physical-proof commit:
  `ecab9742eea876c3a996958a8b567f1b1e68a032`.
- TypeScript source SHA-256:
  `bf66d6aaa4ceb713155aaee593430d41a105a83b13444ebcf70cc6ccc4d8c91a`.
- Fungi candidate SHA-256:
  `e239c0f945062f0680772008a1a20d95f80a5f33801a94e3560c159946485fdd`.
- Independent SLIDE commit:
  `ed326eaa14f1a899841cbac8da353d400970367e`.

This receipt proves only the exported `effectiveVerdict` symbol. It does not
retire the owning file or any other substrate-model behavior.

## Exact behavior

| Ideal | Reading | Effective verdict |
|---:|---:|---:|
| `DENY (-1)` | `DENY (-1)` | `DENY (-1)` |
| `DENY (-1)` | `UNKNOWN (0)` | `DENY (-1)` |
| `DENY (-1)` | `ALLOW (+1)` | `DENY (-1)` |
| `UNKNOWN (0)` | `DENY (-1)` | `DENY (-1)` |
| `UNKNOWN (0)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `UNKNOWN (0)` | `ALLOW (+1)` | `UNKNOWN (0)` |
| `ALLOW (+1)` | `DENY (-1)` | `DENY (-1)` |
| `ALLOW (+1)` | `UNKNOWN (0)` | `UNKNOWN (0)` |
| `ALLOW (+1)` | `ALLOW (+1)` | `ALLOW (+1)` |

The candidate preserves `Verdict x Verdict -> Verdict`. It implements Kleene
minimum with nested exhaustive typed `check`, no effects, no mutation, no
iteration, no exception syntax and no integer or host-projected bridge. A
substrate reading may confirm or degrade the ideal verdict and cannot upgrade
it.

## Evidence

- Candidate differential plus the existing substrate safety theorem:
  **23/23** focused tests passed.
- Complete Tower-Citizen package: **511/511** passed with zero failures, skips,
  cancellations or todo tests.
- Executable Fungi Golden Pack: **11/11** checker and execution vectors passed.
- Physical SLIDE/VOK lane: **1/1** passed. The compiler bound parameter type
  IDs `[3, 3]` and result type ID `3`, published one physical `.slide`, and VOK
  independently re-admitted it for all nine rows.
- Typed receipts returned exact values with `fallbackInvoked: false` and
  `authorityReleased: false`.
- Missing, surplus, wrong-type and non-K3 arguments refused. Exhausted work,
  source and artifact mutation, receipt mutation and every changed safe-value
  envelope byte also refused.

This is a complete reference proof for one exported pure symbol. It is not a
consumer switch, production grant, TypeScript retirement or whole-file proof.
The symbol is `PARALLEL_PURE`; no package-wide threadability claim follows.

## Skill review

No skill update is required. Both private skill repositories already require typed Verdict routing,
exhaustive `check`, exact differential tables, pinned physical SLIDE/VOK proof,
hostile input refusal and no authority inference. Slice 91 exposed no reusable
gap beyond those existing rules. Their current local commits remain
`dc2ef82facdcfe77570ec8238fa1e5c9f21ef7c1` for `writing-fungi` and
`30eb4dd3619499b754189ff784d4831e9508d49d` for
`translating-typescript-to-fungi`. Neither repository was pushed or published.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing typed K3, physical proof and hostile-input rules cover this candidate
Threadability: PARALLEL_PURE
Source classification: CANDIDATE
Bounded closure: COMPLETE
