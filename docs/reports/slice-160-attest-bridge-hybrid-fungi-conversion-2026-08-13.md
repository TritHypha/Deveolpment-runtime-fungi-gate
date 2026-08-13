# Slice 160 attestBridgeHybrid Fungi conversion adjudication

## Outcome

Slice 160 classifies
`packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#attestBridgeHybrid`
as `BLOCKED_BY_HYBRID_ACTIVE_BRIDGE_DELEGATION_ABI`. No placeholder Fungi asset
is created.

The function combines hybrid signing with an active delegating bridge object.
It preserves a specific missing-manifest Error, getters, prototype-backed
identity, async completion and initialize/shutdown/execute ordering. An inert
record cannot replace those leased capabilities.

## Evidence and exit

- Both owning-package typechecks pass.
- Neutral contract **12/12**, focused consumers **37/37**, and complete
  Tower-Citizen **515/515** pass with zero skips.
- Reopen with independently admitted hybrid signing plus an affine bridge lease
  whose lifecycle, cancellation, failure and delegation receipts are exact.

TypeScript remains the active hybrid-wrapper owner.

## Skill review

The two updated private skills already cover this active-object and signing
boundary; no further reusable rule was found.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: updated active lease and hybrid signing rules already require refusal
Threadability: ISOLATED_SERVICE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
