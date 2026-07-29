# RD-0361 T7 core-network authority evidence pack

Date: 2026-07-29  
State: tier-1 authority flipped; TypeScript retained as a live differential
shadow

## Scope

The final governed-authority tranche contains seven pure network-border
deciders: degrade-only admission telemetry, B8 K3 admission, certificate
governance, CORS, defensive proxy/input controls, SSRF egress and inbound
policy/rate limiting. None performs network I/O; each decides over supplied,
typed evidence.

## Differential and negative evidence

All seven real execution differentials passed **7/7** after faithful build,
ephemeral signing and #105 admission:

- `rd0361-admission-feedback-execution.test.mjs`
- `rd0361-b8-admission-execution.test.mjs`
- `rd0361-cert-gate-execution.test.mjs`
- `rd0361-cors-policy-execution.test.mjs`
- `rd0361-defensive-controls-execution.test.mjs`
- `rd0361-egress-guard-execution.test.mjs`
- `rd0361-inbound-guard-execution.test.mjs`

All seven targeted fail-open mutants were killed, **7/7, zero survivors**:

| Mutant | Protected failure |
|---|---|
| `rd0361-net-admissionfeedback-harddeny` | hard-DENY telemetry cannot be erased |
| `rd0361-net-b8admission-boundary` | INDETERMINATE cannot authorize |
| `rd0361-net-certgate-boundary` | revocation-unknown cannot authorize |
| `rd0361-net-corspolicy-allowlist` | a non-allowlisted origin cannot be reflected |
| `rd0361-net-defensivecontrols-mtlspin` | an unpinned mTLS proxy cannot become trusted |
| `rd0361-net-egressguard-metadata` | 169.254.169.254 cannot be classified public |
| `rd0361-net-inboundguard-denymatch` | an explicit deny rule cannot be ignored |

## Hash, admission and ambient-authority evidence

`node scripts/gather-r4-twin-hashes.mjs --tranche core-network --json`
reported **7/7 clean**, signed and #105-admitted. Six modules have no imports;
`cert-gate` imports only deterministic string equality from the compiler's
closed stdlib ABI. Ambient imports are zero.

| Twin | bytes | SHA-256 |
|---|---:|---|
| `admission-feedback` | 183 | `4d1e3bb6a25d2c4ec0af791f0db2e33704946f32ca1bdb28df6e7258159f3bad` |
| `b8-admission` | 229 | `1104ad9943d109d5862b0322945fbbd820fa8c02cd866a72491e6bb1f8602e8d` |
| `cert-gate` | 487 | `2021331245cbe57ef2a00eab9eebb8976d5824fb4f06ace2f6b1586f7a505029` |
| `cors-policy` | 189 | `a95a461f4e183e197fa8830d04006fc0beb2d17386b664c3da6f8f363dff3261` |
| `defensive-controls` | 409 | `19da5ad09872562727d78aed8d5cfd8b3a40d29ef8f00a3f9525d5ab1c998960` |
| `egress-guard` | 698 | `909e027524b5a394f0053b1dea9dec8b14ef7391cbe0f544682da52fdd9ea22a` |
| `inbound-guard` | 207 | `a447f52d440d6fb281ce3318b148bea7852a874498f7a8d1bbdb54ded089c1ec` |

The phase-close verifier re-derives every ledger hash and refuses drift,
admission failure, malformed/duplicate/unknown ledger state, and undeclared
imports.

## Result

All seven candidates meet the R4 evidence bar and are T7 authoritative under
the owner's standing “unlock all green light” instruction and autonomous
ownership directive. TypeScript remains the running differential shadow. No
file was retired or pushed, and this pack does not claim independent review by
another AI.
