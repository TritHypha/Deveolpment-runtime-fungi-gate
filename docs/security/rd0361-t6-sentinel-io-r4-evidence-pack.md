# RD-0361 T6 sentinel-I/O authority evidence pack

Date: 2026-07-29  
State: tier-1 authority flipped; TypeScript retained as a live differential
shadow

## Scope

The tranche contains two pure I/O-border deciders:

- `hardened-border.fungi` verifies digest integrity, source/manifest mapping,
  block bounds and the final release fold. Tampered or out-of-bounds bytes
  cannot reach the backing buffer.
- `manifest-validator.fungi` validates manifest headers, per-block shape,
  ordered layout and the all-blocks aggregate.

Neither twin performs I/O. They decide whether already supplied evidence is
admissible and import only deterministic string equality from the compiler
stdlib ABI.

## Evidence

- Both execution differentials passed **2/2** after faithful build, ephemeral
  signing and #105 admission:
  `rd0361-hardened-border-execution.test.mjs` and
  `rd0361-manifest-validator-execution.test.mjs`.
- Mutant `rd0361-io-hardenedborder-integrity` was killed when a digest mismatch
  was changed to release.
- Mutant `rd0361-io-manifestvalidator-allblocks` was killed when a bad block
  was changed to a valid manifest.
- `node scripts/gather-r4-twin-hashes.mjs --tranche sentinel-io --json`
  reported **2/2 clean**, zero ambient imports and successful signed #105
  admission:

| Twin | bytes | SHA-256 |
|---|---:|---|
| `hardened-border` | 264 | `35f0a72e85ebffaee091928d03862e35db5548e316aacbf209998bd761d2cdbc` |
| `manifest-validator` | 361 | `75eff924c4b386a0d5a058a5eb4e1477a4addad9b51d8639433cd40b8f6c9f5c` |

The phase-close verifier re-derives the ledger hashes and refuses drift,
admission failure, invalid ledger state, or imports outside the closed stdlib
ABI.

## Result

Both twins meet the R4 evidence bar and are T6 authoritative under the owner's
standing “unlock all green light” instruction and autonomous ownership
directive. TypeScript remains the running differential shadow. Nothing was
retired or pushed, and this pack does not claim independent review by another
AI.
