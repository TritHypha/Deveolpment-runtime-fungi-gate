# Slice 158 signManifestHybrid Fungi conversion adjudication

## Outcome

Slice 158 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#signManifestHybrid`
as `BLOCKED_BY_HYBRID_SIGNING_ASYNC_CRYPTO_ABI`. No placeholder Fungi asset is
created.

The function binds canonical UTF-8 manifest bytes to Ed25519 and ML-DSA-65
signatures, dynamically imports the PQ implementation, carries a fixed context,
uses private key material and emits two base64 fields asynchronously. Current
Fungi/SLIDE has no admitted equivalent signing, loader, key-custody or failure
transaction.

## Evidence and exit

- Both owning-package typechecks pass.
- Neutral contract **12/12**, focused consumers **37/37**, and complete
  Tower-Citizen **515/515** pass with zero skips.
- Reopen only through an isolated hybrid signing capability binding exact
  bytes, suites, context, key roles/custody, encodings and async failure.

TypeScript remains the hybrid signing floor.

## Skill review

The translation skill now binds injective verifier evidence, VOK leases and
Lyth/SLIDE admission to the exact artifact (`1bd80388b5d6538319465ca23266f30f37629926`).

## Slice-close receipt

Skill disposition: SKILL_UPDATE 1bd80388b5d6538319465ca23266f30f37629926
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
