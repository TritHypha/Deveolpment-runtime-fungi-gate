# Governance qualifier escalation Fungi conversion proof

## Outcome

The compiler's private `qualifierEscalated` decision has an exact
package-owned `.fungi` counterpart and complete compiler/interpreter/signed-
Wasm parity. Physical SLIDE/VOK publication is blocked by a bounded checked-
Fungi profile limit; the source semantics were not weakened to obtain a pass.

## Closed decision

The source ranks `pure = 0`, `flow = 1`, `guarded = 2`, `secure = 3` and
`privileged = 4`. Every other String has fallback rank 0. Escalation is true
only when the after rank is strictly higher than the before rank. The exact
7 by 7 canonical-plus-hostile matrix agrees across the public TypeScript
caller, typed Fungi interpreter and signed/admitted Wasm.

The `.fungi` flow contains no null, NaN, `else if`, exception syntax, `for` or
`loop`. Unknown admitted Strings cannot acquire authority above `pure`.

## Exact custody

| Item | Evidence |
|---|---|
| TypeScript reference | SHA-256 `7B368F689A822B7A34E4A7101010DC113B5DB72ACD40C8952F1E7A9E94090D6C` |
| Fungi candidate | SHA-256 `CADE8DA8465525E60344686786691D7F6BB3134229016E5364F4B1E8925CB739` |
| Focused differential test | SHA-256 `34C428AE282A2C5665C7D17E7D876B9F07580C59FD5C6E9095F32D2483AAC53D` |
| Initial Fungi commit | `67d9da49e3fff224fb26557a640ca66acb12c8f0` |
| Bounded final shape | `4c0fba1b908f826f52d3e4fbf7067badb1c94816` |
| Independent SLIDE build point | `ac8a0418ec0bfe6443807db1b100b0a02d5b1ea8` |

## Verification and refusal

- Focused compiler/interpreter/signed-Wasm proof: 2/2 pass.
- Owning compiler package at this slice: 6,348/6,348 pass.
- Direct SLIDE profile probes admit one, two and three sequential exact String
  branches.
- The required fourth exact String branch refuses with
  `SLIDE-CHECKED-PURE-SCALAR-001`; helper-call decomposition and a four-arm
  `match` also refuse in the current profile.
- No physical proof was committed and no consumer was switched.

## R&D wishlist

Extend the independent SLIDE checked-Fungi pure-scalar profile to admit a
bounded four-or-more exact-String routing decision without changing arbitrary-
String fallback semantics. The extension needs hostile-String, source-
mutation, artifact-mutation, typed-argument and VOK receipt proofs. It must
remain fail-closed for unsupported branch counts and must not infer authority
from a successful compile Boolean.

## Authority boundary

`governance-diff.ts`, `qualifierEscalated`, `classifyDelta`, `diffGovernance`
and every consumer remain active. This partial conversion grants no physical
SLIDE, consumer-switch, bootstrap, production, release or retirement
authority.
