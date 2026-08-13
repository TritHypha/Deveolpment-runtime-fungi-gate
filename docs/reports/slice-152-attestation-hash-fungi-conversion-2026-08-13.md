# Slice 152 attestationHash Fungi conversion adjudication

## Outcome

Slice 152 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestationHash`
as `BLOCKED_BY_CANONICAL_MANIFEST_SHA256_HOST_ABI`. No placeholder Fungi asset
is created.

The function canonicalizes the complete bridge manifest to exact UTF-8 bytes,
hashes them with Node SHA-256 and returns lowercase hexadecimal. Current Fungi
has no admitted SHA-256 intrinsic or complete manifest/wire ABI. A host-provided
digest would verify a different program unless bound by an independent receipt.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen with exact canonical-manifest bytes, registered SHA-256 semantics,
  lowercase-hex encoding and independent physical/VOK digest receipts.

TypeScript remains the hash implementation owner.

## Skill review

Both private skills now prohibit projecting host crypto into an unverified
Boolean, scalar or record (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing independent cryptographic evidence rule requires refusal
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
