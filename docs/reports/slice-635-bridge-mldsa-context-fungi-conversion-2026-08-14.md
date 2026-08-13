# Slice 635 BRIDGE_MLDSA_CONTEXT Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/bridge-attestation.ts#BRIDGE_MLDSA_CONTEXT`.

`BLOCKED` (BLOCKED_BY_MUTABLE_MLDSA_CONTEXT_BYTE_IDENTITY): Use immutable/copy-bound context bytes with exact suite/dependency identity and a physical verifier receipt.

Minimum vectors: exact 27 bytes; empty/short/long/single-byte mutation; cross-surface substitution; dependency alias mutation.

Evidence: source build point `674aad9d956acc67eafceb5497cf97c7a0ab96ec`;
source SHA-256 `91C72D7F43E110680885C11EE1C7AE02F4E2C660CFA67ACB066EB5DC6FA01D02`; live scoped bytes remain identical through the authored plan. Fresh Tower no-emit typecheck and 515/515 existing tests pass. These checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/independent re-admission/VOK replacement, consumer switch or TypeScript/JavaScript retirement exists.

Private skill commits: translation `a313867e93b3228fcc7b04e775d20a4fd0939f51`; authoring `844376b4acc99b5c807f2c5aa34c0c892b0e1461`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current translation rules already cover this boundary
Authoring skill disposition: NO_SKILL_UPDATE: current authoring rules already cover this boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
