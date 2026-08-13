# Slice 423 DEFAULT_E2E_EXAMPLES Fungi conversion adjudication

Scope: `packages-galerina/galerina-test/src/runners.ts#DEFAULT_E2E_EXAMPLES`.

`BLOCKED_BY_EXPORTED_MUTABLE_DEFAULT_CORPUS_ARRAY_IDENTITY_ABI`: the exported retained array is mutable and future default runs observe caller changes. An immutable Fungi array would narrow source semantics.

Evidence: source build point `e92a8e4aa0b48331875f78084ffc3d3c284862e0`;
source SHA-256 `A9F7395D08F1DDC97087B8E8BBF163EE10C3C72684B4FB889BB0F456B13FD645`; harness typecheck and **47/47** focused tests pass, but the current test does not prove exact custody. No exact physical twin exists.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 3f11c32161eb7416712f640847ea937a64f0844d
Authoring skill disposition: SKILL_UPDATE bd258b6dcc1f9dcdc84cc62b6141ac74276d4b4b
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
