# Slice 118 boundsCheck Fungi conversion adjudication

## Outcome

Slice 118 classifies the private
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.boundsCheck`
method as `BLOCKED_BY_BINARY64_INSTANCE_FAULT_ABI`. No placeholder Fungi asset
is created.

The method compares a JavaScript binary64 index with retained instance size and
reports invalid input by `SecurityTrap`. Physical Int would narrow the source
domain, while host pre-validation would retain the bounds decision outside
Fungi. Its private status does not remove the observable behavior of callers.

## Evidence and exit

- Focused negative, fractional and out-of-range state-access evidence is
  included in **49/49**; TypeScript typecheck passes.
- Complete Tower-Citizen package: **515/515**, zero skips.
- Reopen with exact source-domain admission, instance-state access and typed
  failure behavior proved through every caller.

TypeScript remains active; no retirement claim follows.

## Skill review

Existing numeric-domain, failure and no-host-projection rules require refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: existing binary64 instance-failure rules require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
