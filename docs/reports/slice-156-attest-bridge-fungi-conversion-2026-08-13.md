# Slice 156 attestBridge Fungi conversion adjudication

## Outcome

Slice 156 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestBridge`
as `BLOCKED_BY_ACTIVE_BRIDGE_DELEGATION_OBJECT_ABI`. No placeholder Fungi asset
is created.

The function refuses a missing manifest with a specific JavaScript Error,
signs the retained manifest and returns a delegating object with observable
getters plus initialize, shutdown and execute method forwarding. A closed
record cannot preserve prototype/method identity, lifecycle effects, callback
ordering or the original bridge object.

## Evidence and exit

- Audit and attestation focus passes **67/67** with zero skips.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen with a leased bridge capability ABI, exact delegation/lifecycle
  receipts, independently admitted signing and preserved missing-manifest
  failure identity.

TypeScript remains the active bridge-wrapper owner.

## Skill review

Existing active-object rules plus the new independent cryptographic-evidence
rule require refusal (`b53365f`, `b01d64e`).

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing active object lease and independent signing rules require refusal
Threadability: ISOLATED_SERVICE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
