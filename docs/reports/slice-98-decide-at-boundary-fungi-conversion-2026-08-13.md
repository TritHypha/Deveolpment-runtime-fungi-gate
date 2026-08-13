# Slice 98 decideAtBoundary Fungi conversion adjudication

## Outcome

Slice 98 classifies
`packages-galerina/galerina-tower-citizen/src/three-valued-governance.ts#decideAtBoundary`
as `BLOCKED_BY_OPTION_RECORD_CALLBACK_ABI`. No placeholder Fungi asset is
created.

The source returns the complete `BoundaryDecision` record and conditionally
invokes an optional diagnostic callback exactly once for Unknown. The record
preserves the input Verdict, binary decision label, authorization Boolean and
either no diagnostic or the exact `FUNGI-GOV-3VL-001` warning record. Deny and
Allow carry a distinct absent diagnostic; Unknown carries the record and may
produce the callback effect.

The existing `collapseVerdict` and `authorizeVerdict` scalar flows prove two
fields only. Reassembling the result in TypeScript, precomputing whether the
callback should run, or treating boundary refusal as the callback result would
leave the observable decision in the host. Replacing TypeScript `null` with
Fungi `Option` is not exact cross-boundary proof until the physical profile
admits and independently verifies the complete record/option/callback shape.

## Evidence and exit

- Tower-Citizen passes **515/515**, including exact Unknown, Deny and Allow
  record behavior and exactly-once/never callback observations.
- Reopen only after a reviewed physical ABI admits the exact boundary record,
  typed absent/present diagnostic, structured warning payload and optional
  callback effect without host-projected authority.
- The reopened proof must refuse malformed and surplus shapes, exhaust work
  safely, publish a real `.slide` and independently verify typed VOK receipts.

TypeScript and all callers remain active. No consumer switch, retirement,
production, release, signing, push or authority permission follows.

## Skill review

The private `writing-fungi` repository is clean at
`dc2ef82facdcfe77570ec8238fa1e5c9f21ef7c1`; the private
`translating-typescript-to-fungi` repository is clean at
`30eb4dd3619499b754189ff784d4831e9508d49d`. Existing rules already require
typed Option/record conservation, effect accounting and refusal of
host-projected decisions, so no skill update is required. Both repositories
remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing Option record effect and no-host-projection rules require this refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
