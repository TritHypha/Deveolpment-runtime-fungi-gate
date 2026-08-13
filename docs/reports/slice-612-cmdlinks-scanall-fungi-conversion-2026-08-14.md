# Slice 612 cmdLinks.scanAll Fungi conversion adjudication

Scope: `packages-galerina/galerina-tools-myco/src/cli.ts#scanAll`.

`BLOCKED` (BLOCKED_SILENT_FILESYSTEM_READ_FAILURE_SEQUENTIAL_CALLBACK_AND_PARTIAL_COVERAGE_ABI): Require closed read outcomes and a loud coverage receipt bound to one immutable snapshot.

Minimum vectors: empty/multiple order; ENOENT/permission/EIO/short read; cancellation; partial accumulation; mutation between passes.

Evidence: source build point `674aad9d956acc67eafceb5497cf97c7a0ab96ec`;
source SHA-256 `3DEFAB980880B677875BE2258A40414B581E9FF395E370F02831574850204187`; live scoped bytes remain identical through the authored plan. Fresh Myco no-emit typecheck and 105/105 source-driven tests pass. These checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/independent re-admission/VOK replacement, consumer switch or TypeScript/JavaScript retirement exists.

## Slice-close receipt

Skill disposition: SKILL_UPDATE a313867e93b3228fcc7b04e775d20a4fd0939f51
Authoring skill disposition: SKILL_UPDATE 844376b4acc99b5c807f2c5aa34c0c892b0e1461
Threadability: UNKNOWN
Source classification: BLOCKED
Bounded closure: COMPLETE
