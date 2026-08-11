# Hardening trust-boundary Fungi conversion dossier

Date: 2026-08-11
Status: `PHYSICAL_REFERENCE_SLICE_PROVED_CLOSURE_PENDING`
Authority: non-retiring compiler-reference slice; TypeScript remains the executing bootstrap and differential reference.

## Pinned source

- Repository source build point: `2a49bc8996bf28913705bc4e4d76abb3c4429ffb`.
- Source: `packages-galerina/galerina-core-compiler/src/hardening-residency.ts`.
- Source SHA-256: `94f7201206ca406d3d7768dfaab781e78e160a2ad9b550a9ccafabba4fd17ad8`.
- Runtime: Node `v24.18.0`; npm `12.0.2`.
- Slice: `combineTrust` and `boundaryTrusted` only.
- Candidate: `packages-galerina/galerina-core-compiler/src/self-hosted/hardening-trust-boundary.fungi`.
- Candidate SHA-256: `86c831621c09ce6829c87cb9c4fd9c12110f59198e15b26e413d154fa7bf4fbb`.
- Excluded: `trustName`, `refute`, `dischargeTrust`, `spillRetype`, every residency derivation/reconciliation function, diagnostics, fingerprints and host-capability behavior.

The codebase-memory graph refused its required refresh with `Transport closed`,
so graph freshness remains `UNKNOWN`. The fresh Myco index plus exact source
and test reads found the public re-export, compiler unit vectors and
Tower-Citizen trit-conformance vectors. No production call site was found for
either selected export. That is sufficient for this exact finite slice, not
for the rest of the source file or the compiler bootstrap.

## Source and caller contract

`CompilerTrust` is the closed numeric trit `-1 | 0 | 1`: refuted/deny,
unknown, and proven/allow. `combineTrust` returns the minimum trit, so neither
operand can manufacture greater trust. `boundaryTrusted` returns true only for
proven/allow; unknown and refuted both remain false.

The functions are publicly re-exported from the compiler package. Current
direct evidence callers are `hardening-residency.test.mjs` and the
Tower-Citizen hardening-trit conformance suite. The selected functions are
deterministic, synchronous, immutable, finite and effect-free. They perform no
I/O, allocation visible to callers, clock/random work, async scheduling,
cleanup, partial mutation, loop or exception handling.

The Fungi boundary uses `Verdict`, never `Int`. Invalid runtime values are
therefore refused by typed SLIDE admission before execution. No `null`, `NaN`,
exception syntax, `else if`, `for` or `loop` is present.

## Decision and effect ledger

| Source operation | Proven subject/type | Terminal | Fungi construct | Direct/transitive effects | Failure exit | Evidence |
|---|---|---:|---|---|---|---|
| `a < b ? a : b` in `combineTrust` | two closed K3 trust trits | yes | exhaustive nested `check` returning K3 minimum | none | malformed trit refused before execution | source; literal nine-row table; GIR/WAT; physical receipts |
| `trust === CompilerTrust.PROVEN` in `boundaryTrusted` | one closed K3 trust trit | yes | exhaustive `check`; only `if:` returns true | none | malformed trit refused; deny/unknown return false | source; literal three-row table; GIR/WAT; physical receipts |

There is no branch fallthrough, ambient authority, error suppression or
partial result. Every admitted K3 value reaches exactly one terminal arm.

## Current proof

- Package-owned asset and package-graph declaration: present.
- Strict checker: zero errors and zero governance warnings across two flows and
  two top-level declarations.
- Canonical Galerina GIR/WAT: exact parity with literal expectations and the
  pinned TypeScript source over all nine conjunction vectors and all three
  boundary vectors.
- Owning compiler package: **6,344/6,344** tests, zero failures.
- Independent SLIDE build point: clean `ac8a041`; no SLIDE source change was
  required because its existing external Verdict/Bool scalar profile admits
  the exact signatures.
- Physical proof: two `.slide` files are published, independently re-admitted
  and executed through typed VOK receipts over all twelve vectors.
- Negative proof: source-byte mutation refuses compilation, malformed Verdict
  arguments refuse execution, both non-ALLOW boundary values remain false, and
  one-byte physical artifact mutation refuses re-admission.
- Focused conversion surface: **3/3**, zero skips.
- Repository closure and generated-owner freshness: pending this dossier's
  publication cycle; no green claim is made before those owners run.

## Retirement boundary

This slice does not switch a compiler consumer and cannot retire any part of
`hardening-residency.ts`. Compiler/bootstrap TypeScript is a separate trust
boundary: removal requires an executable source-to-SLIDE self-compile, exact
bootstrap fixpoint, every production consumer switched, no fallback route and
explicit retirement authority. Until those gates pass, the TypeScript-family
denominator and retirement debt do not decrease.

The next scalar candidates remain subject to their exact contracts.
`triToBool` is blocked on its policy type plus typed-error external profile;
`composeAuthVerdict` is blocked on bounded external `Array<Verdict>`. Neither
may be approximated by re-encoding its API as an admitted scalar.
