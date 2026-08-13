# Slice 153 signManifest Fungi conversion adjudication

## Outcome

Slice 153 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#signManifest`
as `BLOCKED_BY_ED25519_PRIVATE_KEY_SIGNING_ABI`. No placeholder Fungi asset is
created.

The function parses a PEM PKCS8 private key into a Node key object, signs exact
canonical UTF-8 manifest bytes with Ed25519 and emits base64 inside a bridge
attestation. Current Fungi/SLIDE exposes neither private-key custody nor this
cryptographic, byte and failure contract.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen only through an independently owned signing service/capability with
  exact key role, canonical bytes, signature suite, encoding and failure
  receipts; private key bytes must not enter ordinary Fungi values.

TypeScript remains the development signing floor.

## Skill review

Both private skills now bind policy and cryptographic verification/signing as
separate gates (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing independent cryptographic evidence and key custody rules require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
