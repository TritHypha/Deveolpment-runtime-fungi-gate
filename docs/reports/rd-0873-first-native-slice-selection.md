# RD-0873 Task 6 selection report

Status: `BYTE_FINAL_SELECTION`

This report selects one scalar candidate for the later Task 7 review gate. It
contains locators, contract facts, and digests only. It contains no source or
artifact bodies, and it embeds no future review, continuity, approval, or other
receipt digest.

## Exact candidate

- Product: `galerina`
- Package: `galerina-core-config`
- Source locator: `packages-ts/galerina-core-config/src/index.ts#FUNCTION!N!isEnvironmentMode`
- Future native locator: `packages/fungi/products/galerina/rd0873-first-native-slice/slice.fungi#isEnvironmentMode`
- Candidate node: `ga1:ee94f6897e8d424566e0dfea1410e7a3c93a7f05b2ce4d8477a3dbf31c6186b6`
- Candidate state: `NOT_AUTHORED`
- Source raw SHA-256: `80b4b0b8b1a8a31cff824d71ef85dba17ffcc69ef2aca1e90ba3f0a1c339864b`
- Candidate scope: one pure `String -> Bool` classifier

The source recognizes exactly four canonical values: `development`, `test`,
`staging`, and `production`. Every other admitted String returns `false`.
The candidate has no filesystem, process, network, time, randomness, mutable
state, exception, scheduling, or host effect. It has no loop, recursion,
dependency-resolution obligation, or unresolved relation in the admitted
workset.

## Exact local admission evidence

The observation bound its own production worktree through Git
`rev-parse --show-toplevel`, required an exact branch and 40-hex HEAD, and
required an empty porcelain status before capture. It ran on branch
`codex/rd0873-task6-production-capture` at implementation HEAD
`8647b395d8ced273300bbbcd291111fca9af8221`. The recorded root binding is
`GIT_REV_PARSE_SHOW_TOPLEVEL_MATCH` and the recorded status is `CLEAN`.

The source-origin capture used the non-fixture `LOCAL_PRODUCTION_V1` profile
with these exact selected paths:

- `packages-ts/galerina-core-config/src/index.ts`
- `governance/logic-aig-source-origin-parser-policy.json`
- `governance/logic-aig-source-origin-resolution-policy.json`
- `governance/logic-aig-source-origin-repository-identity.json`
- `governance/logic-aig-source-origin-source-policy.json`

All other repository paths were explicitly excluded by the bounded inventory
policy. The resulting policy and snapshot digests are:

- Inventory policy: `4d59066932e789588874f2a4a529ccc7b634eaa5271ed49005fd55f76db995e4`
- Source snapshot: `42ef256299a309a16944f9ae8379ff860e893c13b7bd1c3a91f4ad0d3ee6272a`
- Local source-origin subject: `b0af4b6e2707cc53e61bded0109a731cff53cfdccca6d9f1e001cf53512b0755`
- Local project observation: `b01b28e063e9870d1bad2c7d1a3a35d7e69a2d59c94e82c6682df4006d7a9d1d`

The complete observation record is self-digested as
`67697c1acd39f8e2527047bc3d28396d64e7587c5e65d3cb9ad904fe62a7d4eb`.

The seven-artifact KAT-C frame is deliberately unauthenticated and remains a
non-authorizing local observation:

- Profile: `galerina.source-origin.local.v1`
- Frame SHA-256: `9247904cf53b76a3077e2ed5ff74ba1ba4afbacfca7a4da1254b571f9301be17`
- Frame manifest digest: `7887b58222b108e2c26a46d40dc025b9a40d75581c60446a85e4b024a2217708`
- Subject digest: `b0af4b6e2707cc53e61bded0109a731cff53cfdccca6d9f1e001cf53512b0755`

The local gateway binds the candidate to the admitted PROJECT parent and its
derived WORKSET:

- Workset query digest: `19967bb42841deb2aca3102336db4b565e2e48ff705e7d070cccaebba53a4585`
- Task 6 claim digest: `4555040e2336291767483f6d0f07f8578b09cf36fabdcece712c0ab6c97ccd64`
- Gateway result: `LOCAL_VERIFIED`
- Gateway result digest: `6f430a9bd4621c5da91a29db9de29d59a7525cc5797f7b5e6929f152aad114ef`
- Gateway authorizing: `false`
- Gateway authentication: `NONE`
- Gateway execution boundary: `COOPERATIVE_LOCAL_SAME_USER`
- Workset projection digest: `ed241725eea6a157b42eaa92a896b15352805368323e41d0fd7625c4963bb2ed`
- Applicable unresolved rows: `0`
- Task 6 obligation: `ZERO_APPLICABLE`
- Task 6 obligation digest: `a73cabbd9f80e187168557dfbca949889ad27ced0b31932b47fd487ba9fbc378`
- Selection digest: `c5eea959c70997063f62588f700c556e22048e4813800e48943b5307ae545149`

The final selection record is `NOT_AUTHORED`, with required evidence views
`FUNGI`, `HOST`, and `TASK6_OBLIGATION`. The gateway and obligation are local
cooperative observations; they do not authenticate provenance or authorize
source publication.

## Selection controls

The candidate is limited to the exact classifier contract. The later native
slice must preserve case-sensitive and whitespace-sensitive matching, return
`true` only for the four listed values, return `false` for every other admitted
String, and expose no effect or host capability. Inputs outside the admitted
String contract must be refused by the later native boundary rather than
coerced.

Near neighbours were rejected from this selection because they either load
configuration, inspect open `unknown` values, resolve governance or posture
policy, or expand the review unit beyond one scalar decision. No consumer
switch, retirement, registry publication, or `.fungi` source is part of this
report.

Task 7 remains gated on separate selection review, continuity, continuity
review, and owner approval that bind these exact report bytes.
