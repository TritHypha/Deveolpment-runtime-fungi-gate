# Slice 150 AttestationPolicy Fungi conversion adjudication

## Outcome

Slice 150 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#AttestationPolicy`
as `BLOCKED_BY_CRYPTO_POLICY_CALLBACK_RECORD_ABI`. No placeholder Fungi asset is
created.

The policy contains optional Boolean/String fields, an ordered hash allow-list,
an ML-DSA public-key byte array and a revocation callback whose thrown failure
must deny. The existing Fungi PQ policy twin folds already verified facts; it
does not preserve this host object, key material or callback behavior and is
not a duplicate replacement.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen with exact typed policy/key descriptors, affine revocation authority,
  callback-failure receipts and an independently admitted crypto verifier.

TypeScript remains the policy-object boundary owner.

## Skill review

Both private skills now require independently admitted cryptographic evidence
and forbid projected signature-valid Booleans (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: SKILL_UPDATE b53365f000212f902dfbf66fa5a18fc7f13cb560
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
