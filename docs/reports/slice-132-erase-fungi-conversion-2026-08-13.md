# Slice 132 erase Fungi conversion adjudication

## Outcome

Slice 132 classifies
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.erase`
as `BLOCKED_BY_TYPED_MEMORY_RESET_CAPABILITY_ABI`. No placeholder Fungi asset
is created.

One observable cleanup operation fills the packed state with reject encoding,
re-stamps both canaries, resets binary64 scale and calls the retained live
GovernanceEnforcer reset capability. The physical profile has no equivalent
transactional mutable-instance/capability boundary.

## Evidence and exit

- Hard erase, post-failure erase, canary restoration and scale reset evidence
  passes in focused **56/56**.
- Typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen only with exact typed-memory reset, canary/scale state and active
  governance reset proof as one transaction.

TypeScript remains the cleanup authority; no retirement follows.

## Skill review

Existing cleanup-before-failure, typed-memory and active-capability rules require refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing cleanup typed-memory and active-capability rules require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure remains `UNKNOWN`.
