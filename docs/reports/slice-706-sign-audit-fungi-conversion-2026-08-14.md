# Slice 706 governance-enforcer.ts#GovernanceEnforcer.signAudit Fungi conversion adjudication

Scope: `packages-galerina/galerina-tower-citizen/src/governance-enforcer.ts#GovernanceEnforcer.signAudit`.

`BLOCKED` (BLOCKED_BY_FORGEABLE_MISLABELLED_MLDSA65_SIGNATURE_AND_MUTABLE_AUDIT_STATE). Exact exit: either demote and rename the value as a non-authorizing checksum, or implement real ML-DSA-65 over canonical length-framed fields with private-key custody, freshness/replay/revocation rules and an independently verified receipt bound to correlation, input and policy version.

Minimum vectors: Public recomputation delimiter collision replay and version mutation.

Evidence: source build point `17996b1145cc42067ec76332685b986ca741754f`;
source SHA-256 `63DC1C1C8890C4E3198FE76E4D39196E5D77A037F721B0EFE42E7C3F70E24EC0`; bytes remain exact through plan HEAD `408446d9fb81fb681fde577542c7b7015c4ce378`. Focused Tower checks are regression evidence only. No exact scoped Fungi/GIR/physical `.slide`/re-admission/VOK replacement, consumer switch or retirement exists.

Focused test pins: `tpl-simulator.test.mjs` SHA-256 `0D58F009D1DDEACFCDC2726BE931A4ECF60D63014D477D84D097B124F5BED3EC` and `rd0236-runtime-hardening.test.mjs` SHA-256 `977B30D726E5B6265B1084FD2DA559291815E53E98479636AE3835CA0E9A1F03`. These tests are regression evidence only. Exact ranges, callers and loaded-asset reconciliation are retained in the Slice 698-747 evidence manifest in `fungi-conversion-batch-33-42-file-status.md`.

Private skill commits: translation `0eba47133c6d4205f002d2b2217ee3ad9d9a3c1a`; authoring `5c28fea04c27c25eb3366a020e56d3c2768f319c`. Both remain private and unpushed.

## Slice-close receipt

Skill disposition: SKILL_UPDATE 0eba47133c6d4205f002d2b2217ee3ad9d9a3c1a
Authoring skill disposition: SKILL_UPDATE 5c28fea04c27c25eb3366a020e56d3c2768f319c
Threadability: SERIAL_HARD_PATH
Source classification: BLOCKED
Bounded closure: COMPLETE
