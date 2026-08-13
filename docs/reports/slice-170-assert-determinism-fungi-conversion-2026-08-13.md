# Slice 170 assertDeterminism Fungi conversion adjudication

## Outcome

Slice 170 classifies
`packages-galerina/galerina-inference-bridge-contract/src/bridge.ts#assertDeterminism`
as `BLOCKED_BY_TYPED_BRIDGE_RESULT_AND_ERROR_IDENTITY_ABI`. No placeholder
Fungi asset is created.

The decision rejects exactly a `technique === "ternary"` result whose
`deterministic` claim is false, then throws a JavaScript `Error` whose exact
message contains the unbounded `bridgeId`. The source consumes the complete
`BridgeResult` object, including binary64 fields and external string identity.
A projected pair of Booleans would move the admission decision into the host.

## Evidence and exit

- Both owning-package typechecks pass.
- Neutral contract **12/12**, focused consumers **27/27**, and complete
  Tower-Citizen **515/515** pass with zero skips.
- Reopen only after the complete result ABI, injective technique vocabulary,
  provenance of the determinism claim and an exact typed mapping for the
  observable JavaScript Error boundary are admitted.

TypeScript remains the executable floor.

## Skill review

Existing exact-record, host-projection, independent-evidence and JavaScript
Error-identity rules cover this blocker.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: exact record, host projection and Error identity rules already cover the blocker
Threadability: PARALLEL_PURE
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
