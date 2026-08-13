# Slice 159 verifyAttestationHybrid Fungi conversion adjudication

## Outcome

Slice 159 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#verifyAttestationHybrid`
as `BLOCKED_BY_HYBRID_CRYPTO_VERIFIER_ASYNC_ABI`. No placeholder Fungi asset is
created.

The async verifier first requires every classical shape/hash/profile/Ed25519
check, then independently verifies the ML-DSA-65 signature with a fixed context.
It preserves optional hash presence, dynamic import, base64 bytes, exact failure
messages and caught implementation errors. A caller Boolean or policy fold is
not parity.

## Evidence and exit

- Both owning-package typechecks pass.
- Neutral contract **12/12**, focused consumers **37/37**, and complete
  Tower-Citizen **515/515** pass with zero skips.
- Reopen with one independent hybrid verifier receipt binding subject bytes,
  both suites/keys/signatures, context, policy, revocation, freshness and every
  typed failure.

TypeScript remains the hybrid verifier floor.

## Skill review

The writing skill now records numeric/KAT controls and AND-first K3 authority
aggregation without teaching unbuilt optimization (`96054a9767a13d2e3c6bb9614f742aec193ee51b`).

## Slice-close receipt

Skill disposition: SKILL_UPDATE 96054a9767a13d2e3c6bb9614f742aec193ee51b
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
