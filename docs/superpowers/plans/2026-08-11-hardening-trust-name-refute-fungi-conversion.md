# Hardening Trust-Name/Refute Fungi Conversion Implementation Plan

**Goal:** Extend the proved hardening trust asset with exact `trustName` and `refute` flows, then prove them through canonical GIR/WAT and physical SLIDE/VOK without retiring TypeScript.

## Constraints

- Preserve `Verdict` as the closed -1/0/+1 domain.
- Convert the TypeScript conditional chain in `trustName` to exhaustive `check`.
- Use the closed `Verdict.Deny` constructor for `refute`.
- No `null`, `NaN`, `else if`, `throw`, `try`, `catch`, `for` or `loop` in new Fungi.
- Preserve existing `combineTrust` and `boundaryTrusted` exports and evidence.
- Commit locally only; do not push.

## Task 1: RED compiler parity

- [ ] Extend `packages-galerina/galerina-core-compiler/tests/hardening-trust-fungi-conversion.test.mjs` to require `trustName` and `refute` exports.
- [ ] Compare `trustName` over all three Verdict values and require `refute()` to equal the TypeScript reference.
- [ ] Run the focused test and retain the exact missing-export RED result.

## Task 2: Exact Fungi flows

- [ ] Add `trustName(trust: Verdict) -> String` using exhaustive `check` with literal results `Refuted`, `Unverified`, and `Trusted`.
- [ ] Add `refute() -> Verdict` returning `Verdict.Deny`.
- [ ] Run strict type/governance checking, focused compiler parity and the complete compiler package.
- [ ] Commit only the source and focused test.

## Task 3: Physical SLIDE/VOK

- [ ] Extend `scripts/tests/hardening-trust-fungi-slide.integration.test.mjs` to publish four exports.
- [ ] Execute and verify all three `trustName` vectors as canonical owned String receipts and `refute` as a zero-argument Verdict receipt.
- [ ] Require malformed Verdict input and source/artifact mutations to refuse; preserve all earlier negative vectors.
- [ ] Run with `GALERINA_SLIDE_REPO` resolved from the sibling repository and require zero skips.

## Task 4: Closure

- [ ] Update the conversion dossier, `docs/TODO.md`, the active roadmap and subway evidence without claiming retirement.
- [ ] Run the owning compiler, tooling, graph, audit, Golden, count, retirement, roadmap and phase-close checks.
- [ ] Refresh Myco and attempt the primary codebase-memory refresh once; record `UNKNOWN` if the transport remains closed.
- [ ] Commit explicit governed outputs locally and do not push.
