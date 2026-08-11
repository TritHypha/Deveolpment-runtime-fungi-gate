# Hardening trust-name/refute Fungi conversion design

Date: 2026-08-11
Status: approved by the owner's standing full-auto, zero-trust instruction

## Outcome

Extend the existing package-owned hardening trust `.fungi` asset with exactly two pure scalar flows from `hardening-residency.ts`:

- `trustName(Verdict) -> String` maps deny, unknown and allow to `Refuted`, `Unverified` and `Trusted`;
- `refute() -> Verdict` returns the sticky hard-negative `Verdict.Deny`.

TypeScript remains the executing compiler/bootstrap reference. This slice grants no consumer switch, source-to-SLIDE fixpoint, retirement, release or production authority.

## Alternatives considered

1. Convert `triToBool` next. Refused: its exact policy type and typed-error external profile remain unproved.
2. Convert `composeAuthVerdict` next. Refused: its exact bounded external `Array<Verdict>` profile remains unproved.
3. Convert `dischargeTrust` next. Refused: the source accepts `boolean | undefined`; Fungi forbids the missing/null-style state and needs an explicit closed option/policy type before parity can be claimed.
4. Convert `trustName` plus `refute`. Adopted: both domains are finite, effect-free and already supported by SLIDE's checked scalar profile. Zero-argument String and Verdict constructors have current independent evidence.

## Semantic boundary

The closed trit mapping is exact:

| Source trit | Fungi Verdict | `trustName` | `refute` |
|---:|---|---|---|
| -1 | `Verdict.Deny` | `Refuted` | `Verdict.Deny` |
| 0 | `Verdict.Unknown` | `Unverified` | `Verdict.Deny` |
| +1 | `Verdict.Allow` | `Trusted` | `Verdict.Deny` |

`trustName` uses one exhaustive `check`, not an `else if` chain. `refute` uses the closed Verdict constructor. Both are synchronous, immutable, finite and effect-free. The new Fungi contains no `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for` or `loop`.

Malformed Verdict inputs are refused by typed physical admission before execution. String output is accepted only through SLIDE's canonical owned UTF-8 Safe Value envelope.

## Evidence path

1. Candidate-specific compiler tests first require the missing flows and exact finite truth table.
2. Strict Galerina checking and canonical GIR/WAT must match TypeScript for all three name vectors and the zero-argument refutation result.
3. SLIDE must publish four physical exports from the same source asset, independently re-admit `trustName` and `refute`, execute every vector, and verify typed String/Verdict receipts.
4. Invalid Verdict input, altered source bytes and altered physical artifact bytes must refuse.
5. Existing `combineTrust` and `boundaryTrusted` behavior must remain unchanged.

## Retirement rule

No TypeScript path is deleted, switched or credited as retired. Only a later complete compiler source-to-SLIDE bootstrap fixpoint plus explicit consumer-switch and retirement authority may change that denominator.
