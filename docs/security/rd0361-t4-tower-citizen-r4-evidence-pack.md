# RD-0361 T4 tower-citizen authority evidence pack

Date: 2026-07-29  
State: tier-1 authority flipped; TypeScript retained as a live differential
shadow

## Scope

This tranche promotes the four tower-citizen pure decision twins. It covers K3
quorum/lease governance, inference identity and taint governance, hybrid
post-quantum admission, and the S4 recovering transport state machine. It does
not retire TypeScript or make model output, telemetry, or a receipt into
authority.

## Execution and failure evidence

The four owning differentials passed **4/4** after rebuilding and signed #105
admission:

- `rd0361-governance-decisions-execution.test.mjs`
- `rd0361-transport-fsm-execution.test.mjs`
- `rd0364-inference-governance-execution.test.mjs`
- `rd0365-pq-admission-policy-execution.test.mjs`

The corpora cover distinct-signer quorum and malformed input, lease bounds,
the S4 timeout/erase/closed-state invariants, inference bridge admission,
identity class, cost and egress gates, undisposed output taint, and all 128
hybrid-crypto policy combinations.

All four targeted weakening mutants were killed, **4/4, zero survivors**:

| Twin | Mutant and protected failure |
|---|---|
| governance decisions | `rd0361-tc-governance-quorum` — sub-M quorum must not manufacture ALLOW |
| transport FSM | `rd0361-tc-transportfsm-resume` — INDETERMINATE reverify must not resume |
| inference governance | `rd0364-tc-inferencegov-outputtaint` — undisposed model output must not become trusted |
| PQ admission | `rd0365-tc-pqadmission-classical` — invalid Ed25519 must not pass the classical half |

## Hash, admission and authority boundary

`node scripts/gather-r4-twin-hashes.mjs --tranche tower-citizen --json`
reported **4/4 clean**: zero parse errors, faithful assembly, deterministic
hash, ephemeral development signature, successful #105 admission, and no
WebAssembly imports.

| Twin | bytes | SHA-256 |
|---|---:|---|
| `governance-decisions` | 149 | `e62b1cc37b97744d507a77f578fda9f9435a46816e640f08cfcc74700fb43560` |
| `inference-governance` | 475 | `04121436b8e1c879f52959b9d902e698b135b2ada2060967f08ee7269bc70a18` |
| `pq-admission-policy` | 323 | `a19a80c26528de4001f8348044727519eaf848b54f9e4576bfbc8b5e86b434aa` |
| `transport-fsm` | 631 | `5c91fbbb1002a421662d2a9f93801421b1055f026c9ec5ec54b6cf29d24733f8` |

Committed feature `165c7a3dc` later added the fail-closed `s4PermitData`
projection. On 2026-08-24 the current source remained checker-clean, its named
RD-0361 differential passed 1/1, and the R4 verifier re-derived and admitted
the 631-byte hash above. This rebind does not change the authority class.

The live phase-close hash verifier re-derives these entries and refuses hash
drift, admission failure, malformed or duplicate ledger state, and ambient
imports.

## Result and authorization

The four candidates meet the R4 bar and are T4 authoritative specifications
under the owner's standing “unlock all green light” instruction and autonomous
ownership directive. TypeScript remains the running differential shadow, no
file was retired, no change was pushed, and this pack does not claim
independent review by another AI.
