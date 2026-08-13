# Slice 155 generateAttestationKeypair Fungi conversion adjudication

## Outcome

Slice 155 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#generateAttestationKeypair`
as `BLOCKED_BY_ED25519_KEYGEN_PRIVATE_CUSTODY_ABI`. No placeholder Fungi asset
is created.

The function obtains host entropy through Node Ed25519 key generation and
exports SPKI public and PKCS8 private PEM strings. Key generation is an active
custody operation, not pure record construction, and current Fungi/SLIDE has no
admitted entropy, key-object, export or private-material lifecycle contract.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen only with an isolated key-custody service, authenticated entropy,
  non-exportable/private-material policy, zeroization and typed receipts.

TypeScript remains the development key-generation floor.

## Skill review

The independent cryptographic-evidence rule now covers key identity and custody
explicitly (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing entropy key custody and lifecycle rules require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
