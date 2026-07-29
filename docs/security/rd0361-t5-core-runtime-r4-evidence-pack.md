# RD-0361 T5 core-runtime authority evidence pack

Date: 2026-07-29  
State: tier-1 authority flipped; TypeScript retained as a live differential
shadow

## Surface

`passive-plan-replay-admission.fungi` is the deterministic replay admission
fold. A plan is allowed only when its signature and hash match, its capability
is still current, it is fresh, its target is bound, and every step remains
contained with coherent qualifiers. A previously approved plan does not carry
authority forward after revocation.

## Evidence

- The live twin audit reported the candidate check-clean and differential.
- `rd0363-passive-plan-replay-execution.test.mjs` passed **1/1** after faithful
  build, ephemeral signing and #105 admission, covering the complete
  deny-by-default Boolean grid against the RD-0363 specification.
- Targeted mutant `rd0363-rt-passiveplan-authority` was killed **1/1**. It
  deliberately changed a non-current capability from DENY to ALLOW, proving
  the differential guards the approved-then-revoked escalation.
- `node scripts/gather-r4-twin-hashes.mjs --tranche core-runtime --json`
  reported R0-clean, faithful assembly, **355 bytes**, SHA-256
  `c9e31341ef90816852947fbc4bf83a48fb5639d2f1b44c688160bb2644d011f0`,
  signed #105 admission, and zero WebAssembly imports.
- The phase-close ledger verifier re-derives the hash and refuses drift,
  admission failure, invalid ledger state, or ambient authority.

## Result

The candidate meets the R4 bar and is T5 authoritative under the owner's
standing “unlock all green light” instruction and autonomous ownership
directive. TypeScript remains the running differential shadow. No file was
retired or pushed, and this pack does not claim independent review by another
AI.
