# Slice 776 src/key-rotation.ts#retireVerdict Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/key-rotation.ts#retireVerdict`.

`BLOCKED` (BLOCKED_BY_RING_CRYPTO_SNAPSHOT_PROVENANCE_BOUND_REVOCATION_AND_RETIRE_POLICY_ABI). Exact exit: bind one ring/key snapshot and verifier receipt; replace caller-mintable revocationRecorded with a receipt bound to key, epoch, ring and action; close selectors and prove physical ByteArray/record authority.

Minimum vectors: forged/replayed/wrong-epoch true, invalid/mutating mode, ring mutation after verify, active/unknown and all symmetric/asymmetric modes.

Evidence: source build point `2a5c5454fbdc163709f9d04e74842ae77924fb1b`;
source SHA-256 `E0AB126D2D32925ACDB5E2A0D31028E99E31CA265CCE634E6E1EDC4181C47F26`; bytes remain exact through plan HEAD `5439944b53d1c7f428d19561cef183c7689c98c9`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `key-rotation.test.mjs` SHA-256 `950673FF76FC12DDB0C21EC41B42A1611A937A6CB6C39D1859F070454C7ADB25`. These tests are regression evidence only. Exact ranges, callers and loaded-asset reconciliation are retained in the Slice 748-797 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `0eba47133c6d4205f002d2b2217ee3ad9d9a3c1a`; authoring `5c28fea04c27c25eb3366a020e56d3c2768f319c`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: NO_SKILL_UPDATE: current rules cover this exact boundary
Authoring skill disposition: NO_SKILL_UPDATE: current rules cover this exact boundary
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
