# Slice 910 src/snapshot-key-provider.ts#resolveKey Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/snapshot-key-provider.ts#resolveKey`.

`BLOCKED` (BLOCKED_BY_ACTIVE_RING_AND_CUSTODY_CALLBACKS_VERIFY_RING_SELECTOR_SECRET_ALIAS_NULL_COLLAPSE_AND_HANDLE_ABI). Exact exit: bind currentRing, selector and readKey capabilities to one authenticated inert ring snapshot, preserve exact verify/select/read/commit order in a typed exhaustive failure union, and return an affine or copy-safe secret handle rather than a mutable alias.

Minimum vectors: callback throw/reentry/mutation; malformed/getter/proxy ring; verify false/throw; selector null/throw/wrong epoch; readKey null/throw/weak/substituted; commit mismatch/throw; returned-key mutation.

Evidence: source build point `754882b91418790143c656e07b6354f7e54bfdfd`;
source SHA-256 `BD69DA74E4E66260BEA0091F2C6D6AA8C08E341152A87994492538FF9BCC2B28`; bytes remain exact through plan HEAD `0d5b66e3a46b40fbb5b541e26664e94487bf1f0a`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `snapshot-key-provider.test.mjs` SHA-256 `1DE4174C839C8E60B3F2D64DF227D0B10FCFC0957FBF8DC2427680C81F51E465`. Exact ranges, callers, defects and loaded-asset reconciliation are retained in the Slice 898-947 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `13c070f75cb4899dc46fc35b9d43a770f9116380`; authoring `c4b10ae638c4daee09cab9ab1f3dc3d3ce35cd11`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Authoring skill disposition: NO_SKILL_UPDATE: current rules already cover this scope
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
