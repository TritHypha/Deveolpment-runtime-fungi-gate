# Slice 823 src/plugin-manifest.ts#verifyPluginManifest Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/plugin-manifest.ts#verifyPluginManifest`.

`BLOCKED` (BLOCKED_BY_PLUGIN_HYBRID_VERIFY_POLICY_REVOCATION_ASYNC_ORDER_AND_RECEIPT_ABI). Exact exit: capture one immutable envelope, policy, key and artifact snapshot; independently verify Ed25519, mandatory revocation/freshness and ML-DSA-65 in exact source order, returning a closed verifier receipt rather than caller Booleans.

Minimum vectors: malformed envelope/key/base64; wrong signer/hash; revocation false/true/1/throw/missing; policy/key mutation during await; ML import/failure; replay and partial hybrid.

Evidence: source build point `dfad2785eb018b86fdd305318988225daf445c36`;
source SHA-256 `52B166E7BEF82B50CEEFE7CE844C287C98E350485ACFC3FBBD9E21C53AAE00A9`; bytes remain exact through plan HEAD `8f594095`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `rd0236-runtime-hardening.test.mjs` SHA-256 `977B30D726E5B6265B1084FD2DA559291815E53E98479636AE3835CA0E9A1F03`. These tests are regression evidence only. Exact ranges, callers and loaded-asset reconciliation are retained in the Slice 798-847 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `24b414c6d44ea13218e37fdd0bcaef3556a75a26`; authoring `ff1a093c9ddca265c1ff25988eb6e7abad3b339a`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Authoring skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
