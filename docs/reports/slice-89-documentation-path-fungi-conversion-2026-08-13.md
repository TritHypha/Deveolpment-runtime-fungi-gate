# Slice 89 Documentation Path Fungi Conversion

`packages-galerina/galerina-devtools-impact/src/impact-plan.mjs#isDocumentation`
now has a package-owned, reference-only Fungi candidate at
`packages-galerina/galerina-devtools-impact/src/self-hosted/documentation-path.fungi`.
The MJS source and its `buildImpactPlan` consumer remain active.

## Bound identities

- Galerina physical-proof commit:
  `8d0aa574e578ef297342e45f39b26c74e1d09e93`.
- MJS source SHA-256:
  `2f37a4f9e23cbd11238432e58356d9db51aa98b6f2503d8e1ffaf2b615c4060b`.
- Fungi candidate SHA-256:
  `4278b24440bf85ce5307d548b8461e4c710ce80713732b09477e4e0691c4dcfb`.
- Independent SLIDE commit:
  `ed326eaa14f1a899841cbac8da353d400970367e`.

The retirement ledger places the MJS file in `T3-package-graph` with no
declared floor, no prior replacement and no execution authority. The package
had no existing Fungi asset for this decision.

## Exact behavior

The only caller supplies a non-empty canonical repository-relative String. The
candidate returns true for the `docs/` prefix and for the exact root files
`README.md`, `AGENTS.md` and `SECURITY.md`; every other canonical String reaches
the terminal `_ => return false` arm. It uses one Boolean `if`, one exhaustive
String `match`, no effects and no iteration or exception syntax.

A shared ten-vector table proves nested documentation, all three exact root
files, the `docs`/`docs2` boundary, nested `README.md`, package source and a
Unicode canonical path through the live MJS `buildImpactPlan` oracle and the
Fungi candidate.

## Evidence

- Source-oracle lane: 6/6 passed.
- Candidate strict/effect, interpretation and signed-Wasm lane: 2/2 passed.
- Complete owning package: 9/9 passed, zero failures and skips.
- Governed physical lane: 10/10 passed. Slice 89 compiled into a physical
  `.slide` package, published, independently re-admitted and executed through
  VOK. Every named vector returned the exact Boolean.
- The physical lane also refused wrong types, missing/surplus arguments,
  malformed/oversized text, exhausted work, source and artifact mutation,
  altered receipts and every changed safe-value envelope byte.

This is a complete reference proof for one internal symbol. It does not switch
the consumer, retire MJS, release authority or prove repository-wide closure.
The candidate is `PARALLEL_PURE`; the surrounding impact planner is not
classified by this receipt.

## Skill review

No private-skill update is required. `writing-fungi` already requires Boolean
`if`, exhaustive String `match`, terminal `_ =>`, exact physical proof and no
forbidden syntax. `translating-typescript-to-fungi` already requires a pinned
caller domain, decision/effect ledger, candidate-specific differential proof
and retention of the legacy source until the retirement gate passes.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing prefix, exhaustive-match, physical-proof and retirement rules cover this candidate
Threadability: PARALLEL_PURE
Source classification: CANDIDATE
Bounded closure: COMPLETE
