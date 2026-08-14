# Slice 928 src/substrate-erasure.ts#generateSubstrateKeypair Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/substrate-erasure.ts#generateSubstrateKeypair`.

`BLOCKED` (BLOCKED_BY_NODE_ED25519_RANDOM_KEYGEN_PRIVATE_KEY_CUSTODY_PEM_EXPORT_ERROR_AND_KEYPAIR_ABI). Exact exit: use a governed provisioning/custody service with pinned Ed25519 provider and entropy, an owner-approved private-key egress policy, exact SPKI/PKCS8 PEM bytes, typed failures and a keypair receipt.

Minimum vectors: provider/RNG failure; repeated distinct pairs; pair relationship; wrong suite; PEM headers/line endings; private-key redaction/cleanup; platform variance.

Evidence: source build point `754882b91418790143c656e07b6354f7e54bfdfd`;
source SHA-256 `D4187A6AED8F2A83F49387AB4439CB2A3F4B64C521DAACD0C67B81D4FC99AD91`; bytes remain exact through plan HEAD `0d5b66e3a46b40fbb5b541e26664e94487bf1f0a`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `substrate-erasure.test.mjs` SHA-256 `5168F198D8435067A1C74803084BD1D2C78C56A2D1F65DCE527E06909316A238`. Exact ranges, callers, defects and loaded-asset reconciliation are retained in the Slice 898-947 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `13c070f75cb4899dc46fc35b9d43a770f9116380`; authoring `c4b10ae638c4daee09cab9ab1f3dc3d3ce35cd11`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Authoring skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
