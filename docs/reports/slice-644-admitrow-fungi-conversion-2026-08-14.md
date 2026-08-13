# Slice 644 admitRow Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/data-plane-border.ts#admitRow`.

`BLOCKED` (BLOCKED_BY_TYPED_VERDICT_TO_BOOLEAN_BORDER_ABI): Require typed Verdict-to-Bool boundary proof and same-snapshot receipt before privileged use.

Minimum vectors: ALLOW/INDETERMINATE/DENY without truthiness; invalid records; mutation between verdict and Boolean use.

Evidence: source build point `674aad9d956acc67eafceb5497cf97c7a0ab96ec`;
source SHA-256 `16D8E0AB4D9F14144B8EDA2611BA012B4837EAA1DC272D4E403ECE02AD14363D`; live scoped bytes remain identical through the authored plan. Fresh Tower no-emit typecheck and 515/515 existing tests pass. These checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/independent re-admission/VOK replacement, consumer switch or TypeScript/JavaScript retirement exists.

Private skill commits: translation `a313867e93b3228fcc7b04e775d20a4fd0939f51`; authoring `844376b4acc99b5c807f2c5aa34c0c892b0e1461`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current translation rules already cover this boundary
Authoring skill disposition: NO_SKILL_UPDATE: current authoring rules already cover this boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
