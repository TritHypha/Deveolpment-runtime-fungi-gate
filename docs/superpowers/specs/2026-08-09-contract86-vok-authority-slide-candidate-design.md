# Contract 86 VOK authority SLIDE candidate design

Date: 2026-08-09

Status: approved by the owner-directed full-auto migration route. This is a
reference-only capability increment, not production admission.

## Goal

Compile the existing `@galerina/core-runtime` `vokAuthorityVerdict` governed
source into a receipt-bound, source-free physical `.slide` publication and
verify its complete nine-trit decision domain through the independent SLIDE
loader.

## Why this source is next

The generated source-capability inventory still records 111 unexecuted
`.fungi` files. `vok-authority-admission.fungi` is a small, pure, scalar-only
source with an existing exhaustive 3^9 oracle and native parity evidence. It
therefore tests an important missing boundary—an exported flow with internal
pure helper calls—without adding host effects, collections, ambient paths or a
new decision rule.

## Approaches considered

1. **Receipt-bound physical `.slide` candidate — selected.** Reuse the pinned
   89-file SLIDE tool closure and source-manifest builder, preserve the current
   source, and exhaustively compare physical execution with numeric K3 minimum.
2. **Trust the existing Wasm/native parity — rejected.** That evidence proves
   the decision, not independent SLIDE compilation, source-free publication or
   receipt re-admission.
3. **Rewrite the three flows into one flat flow — rejected.** It would avoid
   testing internal pure-call closure and create a second semantic source.

## Contract

- Package identity: `@galerina/core-runtime`.
- Export: `vokAuthorityVerdict`.
- Parameters: nine `Int` values.
- Result: one `Int` in the closed K3 domain.
- Source: the tracked `src/self-hosted/vok-authority-admission.fungi` bytes.
- Execution: physical `.slide` only, affine handle, typed receipt verification,
  and `fallbackInvoked=false`.
- Admission: reference-only; no signing, durability, retirement or production
  authority is released.

The source contains two internal pure helper flows. The compiler must derive
their reachable closure deterministically. Missing, ambiguous, recursive or
unsupported calls refuse; the implementation must not inline a handwritten
replacement into the test or host.

## Evidence

The acceptance corpus is all 19,683 vectors over `{-1,0,+1}^9`, plus malformed
trits at every boundary class already covered by the Galerina oracle. Exactly
one vector may return `+1`; every physical result must equal the existing
`min` oracle, carry a verified typed receipt and consume one affine handle.

Build determinism and one-byte object mutation refusal remain mandatory. If
the current frontend refuses internal calls, the RED evidence must name that
capability precisely before the smallest bounded frontend extension is made.

## Non-goals

- no real consumer switch in this contract;
- no claim that all pure calls or arbitrary call graphs are supported;
- no production platform evidence or offline signing ceremony;
- no movement of the 111-source retirement counter without signed terminal
  authority.
