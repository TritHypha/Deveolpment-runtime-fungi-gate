# Slice 120 eraseOnTrap Fungi conversion adjudication

## Outcome

Slice 120 classifies the private generic
`packages-galerina/galerina-tower-citizen/src/tpl-simulator.ts#TPLSimulator.eraseOnTrap`
method as `BLOCKED_BY_HIGHER_ORDER_ERASE_ON_FAILURE_ABI`. No placeholder Fungi
asset is created.

The helper accepts an arbitrary-return callback, executes it once, and on any
failure erases the complete simulator before rethrowing the original failure.
The current physical profile has no generic function-value boundary, mutable
instance cleanup effect or proof of erase-before-failure ordering. Ordinary
`Result` propagation alone is not parity.

## Evidence and exit

- Focused toxic-value, overflow and canary-fault evidence passes within
  **49/49** and proves no secret residue survives failure.
- TypeScript typecheck and Tower-Citizen **515/515** pass with zero skips.
- Reopen only with exactly-once callback execution, erase-before-failure,
  cleanup-failure semantics and arbitrary result typing on the physical path.

TypeScript remains active; host cleanup cannot authorize replacement.

## Skill review

The private translation skill now carries the exact cleanup-before-failure rule
at `75701e0`; the writing-side rule is pinned by Slice 117. The skill passes
3/3 and its private release audit, with no push.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 75701e095df152fa5b790c418a63f6992b724e2e
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE

Repository-wide closure and final codebase-memory freshness remain `UNKNOWN`.
