# Slice 625 verifyCapabilityGrant Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/capability-grant.ts#verifyCapabilityGrant`.

`BLOCKED` (BLOCKED_BY_SAME_SNAPSHOT_HYBRID_CRYPTO_REVOCATION_VERIFIER_ABI): Return a verified immutable receipt carrying engine, mask, grantId and hash from one snapshot; consumer must never reread the caller record.

Minimum vectors: absent grant/signatures; engine mismatch; mask extrema; changed getters; revoked/throwing check; post-verify mutation; hybrid downgrade.

Evidence: source build point `674aad9d956acc67eafceb5497cf97c7a0ab96ec`;
source SHA-256 `B8A90324D9D7F92EEC3BF5EF06B4947C8A4F09FAC144993A3410F807B3757883`; live scoped bytes remain identical through the authored plan. Fresh Tower no-emit typecheck and 515/515 existing tests pass. These checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/independent re-admission/VOK replacement, consumer switch or TypeScript/JavaScript retirement exists.

Private skill commits: translation `a313867e93b3228fcc7b04e775d20a4fd0939f51`; authoring `844376b4acc99b5c807f2c5aa34c0c892b0e1461`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current translation rules already cover this boundary
Authoring skill disposition: NO_SKILL_UPDATE: current authoring rules already cover this boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
