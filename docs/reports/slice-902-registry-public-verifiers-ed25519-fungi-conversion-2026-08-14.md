# Slice 902 src/registry-public-verifier.ts#createRegistryPublicVerifiers.ed25519 Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/registry-public-verifier.ts#createRegistryPublicVerifiers.ed25519`.

`BLOCKED` (BLOCKED_BY_ED25519_CRYPTO_RECEIPT_MESSAGE_BYTEARRAY_SIGNATURE_PARSER_ERROR_COLLAPSE_AND_RESULT_ABI). Exact exit: bind algorithm, key, message, canonical 64-byte signature and keyId in an independently admitted Ed25519 receipt and typed `NoKey | Invalid | Verified` result while preserving the source short circuit and catch-to-false order.

Minimum vectors: matching/mismatching keyId; valid/tampered/empty/wrong-length/noncanonical signature; message subarray/alias/detach/SAB mutation; crypto false/throw/provider drift/replay.

Evidence: source build point `754882b91418790143c656e07b6354f7e54bfdfd`;
source SHA-256 `EEF7F4B87AB0216AAC588F7880E616537BC29B1CAED9E6CD7C87F39EA11BC1AC`; bytes remain exact through plan HEAD `0d5b66e3a46b40fbb5b541e26664e94487bf1f0a`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `registry-public-verifier.test.mjs` SHA-256 `970B961C3B9631B578A7E2EE5D9152F67036E5452A2A55E105BE79FFC1F37BC7`. Exact ranges, callers, defects and loaded-asset reconciliation are retained in the Slice 898-947 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `13c070f75cb4899dc46fc35b9d43a770f9116380`; authoring `c4b10ae638c4daee09cab9ab1f3dc3d3ce35cd11`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Authoring skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
