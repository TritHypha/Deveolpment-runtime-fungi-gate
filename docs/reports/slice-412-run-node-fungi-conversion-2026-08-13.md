# Slice 412 runNode Fungi conversion adjudication

Scope: `packages-galerina/galerina-test/src/spawn.ts#runNode`.

`BLOCKED_BY_NODE_PROCESS_ENV_SYNC_SPAWN_TIMEOUT_SIGNAL_STREAM_CALLBACK_AND_OUTCOME_ABI`: synchronous process launch, environment, clocks, streams, output limits, callback ordering and typed termination causes lack an admitted host/effect profile. Invalid cwd and ENOBUFS both reproduce as false `timedOut:true` results.

Evidence: source build point `e92a8e4aa0b48331875f78084ffc3d3c284862e0`;
source SHA-256 `E64741FAB4D1441F4F81045CA8554908B1A4D35217F61A99FA0E3CB46B735E25`; package typecheck and focused **41/41** existing-dist tests pass, but none directly covers this helper. No placeholder Fungi was created.

## Slice-close receipt

Skill disposition: SKILL_UPDATE bf22fd0bc164736abf6aa44fbdeb59cdb81ae3ea
Authoring skill disposition: SKILL_UPDATE 6e4b73ccfdba9f52f490571fd867189bd229b1a9
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
