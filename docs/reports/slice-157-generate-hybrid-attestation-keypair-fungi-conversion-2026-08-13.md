# Slice 157 generateHybridAttestationKeypair Fungi conversion adjudication

## Outcome

Slice 157 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#generateHybridAttestationKeypair`
as `BLOCKED_BY_HYBRID_KEYGEN_RANDOM_CUSTODY_ABI`. No placeholder Fungi asset is
created.

The async function combines Ed25519 key generation, a dynamic ML-DSA module
import, 32 bytes of host randomness, ML-DSA-65 key generation, PEM export and
mutable typed-array key material. Current Fungi/SLIDE admits none of this
complete async, entropy, dynamic-loader or hybrid key-custody transaction.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips, including the
  hybrid no-downgrade path.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen only through an isolated hybrid key service with authenticated entropy,
  pinned implementation/suite/context, private-key custody and failure/
  cancellation/zeroization receipts.

TypeScript remains the development hybrid-key floor.

## Skill review

Both private skills now preserve canonical bytes, algorithms, suites, key
identity/custody and verifier receipts (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing hybrid entropy key custody and no downgrade rules require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
