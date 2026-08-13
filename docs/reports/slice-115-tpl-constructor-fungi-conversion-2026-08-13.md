# Slice 115 TPLSimulator constructor Fungi conversion adjudication

## Outcome

Slice 115 classifies
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.constructor`
as `BLOCKED_BY_ACTIVE_OBJECT_TYPED_MEMORY_ABI`. No placeholder Fungi asset is
created.

Construction validates a JavaScript-number size, allocates and retains mutable
`Int32Array` storage, derives word and canary positions, stamps both canaries,
and retains active `AuditLogger` and `GovernanceEnforcer` object identities.
The physical profile has neither this class-state ABI nor those active object
capabilities. A host-created record is not equivalent.

## Evidence and exit

- Focused constructor, packing, canary and lifecycle evidence passes in
  **49/49**; TypeScript typecheck passes.
- Complete Tower-Citizen package: **515/515**, zero skips.
- Reopen only with exact mutable typed-memory allocation, retained active
  capability identity and constructor-failure proof through VOK.

TypeScript owns construction and state. No consumer switch follows.

## Skill review

Existing active-host-object, exact-domain and no-host-projection rules at the
current private skill heads require this refusal.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: active object and typed-memory rules already require refusal
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
