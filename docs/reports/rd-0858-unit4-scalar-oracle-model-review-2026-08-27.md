# RD-0858 Unit 4 scalar-oracle model review

Date: 2026-08-27

## Review identity

- Provider: Grok.
- Model: Expert.
- Conversation: `bb1e7c0b-be7b-44c6-acd8-823723b35fb7`.
- Submitted: `2026-08-27T09:18:56.626Z`.
- Captured: `2026-08-27T09:20:25.293Z`.
- Reviewed supplied-claim target: `ec97fb0152fed2a16b90edd7abbf080705ddd68f`.
- Prompt bytes: 6,834.
- Prompt SHA-256:
  `4138858cd7fab2eb86a0981b064ecada288d14cf3b066ebd1cb5b895f2c7d1ce`.
- Reply bytes: 7,826.
- Reply SHA-256:
  `520ca5b5cff12a77786a0cba433caffebb6101a46c0d8601989f87eb303288c6`.
- Verdict: advisory `PROCEED_TO_LOCAL_ADJUDICATION`; non-authorizing.

The complete captured bytes are retained beside this report as
`evidence/rd-0858-unit4-scalar-oracle-grok-prompt.txt` and
`evidence/rd-0858-unit4-scalar-oracle-grok-reply.txt`. The prompt is
source-minimal and predates the final closure candidate, so the response is
architecture pressure-test evidence rather than an exact-revision code review.

## Multi-vector adjudication

- [x] Semantic authority: exact Trit mapping and the fixed scalar profile are
  covered by the checked-flow controls; width injection and self-selection
  refuse.
- [x] Identity and canonicalization: duplicate fields, non-canonical JSON,
  Unicode neighbours, stale build identity and one-field substitutions refuse
  before execution.
- [x] Execution and exits: timeout, crash, partial output and missing evidence
  produce terminal non-authorizing refusal/error receipts; no COMPLETE result
  or runtime profile rescue is manufactured.
- [x] Assurance: graph, Myco and Hypha receipts are supporting evidence only;
  the two global non-green gates remain explicit and are not converted into a
  scalar PASS claim.
- [x] Lifecycle: later profile `64` planning must remain deterministic,
  pre-admitted and receipt-bound; it cannot weaken or replace scalar profile
  `1` as the universal correctness fallback.

## Boundary

Grok cannot mint PASS or integration authority. Final closure still requires
an exact-head external graph and fresh independent review of the complete
candidate. Profiles `32`, `64`, `256`, broader conversion, detached GIR,
SLIDE/VOK admission, `.gate`, Trametes and production selection remain closed.

## Final-candidate replacement review

- Provider: Grok.
- Model: Expert.
- Conversation: `9557f317-c2ee-49e3-b03e-b4b7be7ef83b`.
- Submitted: `2026-08-27T15:00:08.440Z`.
- Captured: `2026-08-27T15:02:05.229Z`.
- Reviewed supplied-claim target:
  `010695776292509ddb60a85870940fc15548c2de`.
- Prompt bytes: 7,962.
- Prompt SHA-256:
  `cb82c8149e893d7db0aebf09947075b4bcf631874bcb564deced386acc426c59`.
- Reply bytes: 7,106.
- Reply SHA-256:
  `7fa86c0761412b758ec17dbf92605abbc53167e057031eabb48fea2aa5b77a53`.
- Advisory recommendation: `PROCEED_TO_LOCAL_ADJUDICATION`.

The byte-identical captures are
`evidence/rd-0858-unit4-scalar-oracle-final-grok-prompt.txt` and
`evidence/rd-0858-unit4-scalar-oracle-final-grok-reply.txt`. Prompt lint passed
all 570 self-test fixtures and returned zero findings for the exact submitted
bytes.

### Final-candidate local adjudication

- [x] Vector 1: non-Trit, missing-arm and width-neighbour inputs are already
  permanent refusal controls. No profile field authorizes a different Trit
  lattice.
- [x] Vector 2: duplicate fields, non-canonical field order, Unicode
  normalization neighbours, stale identities and held-file drift refuse before
  execution. Host replacement is contained by held direct-file identities and
  post-use rechecks.
- [x] Vector 3: the launcher estate covers partial, missing, malformed,
  oversized, crash and timeout transitions and refuses them without retry or
  profile rescue.
- [x] Vector 4: the compiler package identity excludes exactly the two
  generated report paths. Permanent controls prove both reports are invariant
  while editable boundary policy and compiler source change identity. No
  compiler `src/` or package-local `scripts/` execution consumer reads the
  excluded `package-graph.json` report. The assurance-only semantic-coverage
  fabric does read that generated report, and the repository graph orchestrator
  fixes and checks it independently at 9/9. The external graph and Myco/Hypha
  remain snapshot-only evidence, not absence authority.
- [x] Vector 5: the local fast-forward addendum does not change the two global
  HOLD gates. Non-scalar profiles remain refused and scalar `1` remains the
  universal fallback oracle.

The response identified no new material root after local Git-object and test
adjudication. It remains advisory and does not mint PASS, merge authority or a
global phase-close result.

## Consumed-byte replacement challenge

- Provider: Grok.
- Model: Expert.
- Conversation: `9557f317-c2ee-49e3-b03e-b4b7be7ef83b`.
- Submitted: `2026-08-27T20:47:53.261Z`.
- Captured: `2026-08-27T20:49:23.060Z`.
- Reviewed supplied-claim target:
  `f1ac0f22c9ce5f9df1a57667f1f6aec84b993d8c`.
- Prompt transport bytes: 6,885.
- Prompt transport SHA-256:
  `9ac0d34080d315aad4a93fffd2f75315b20b69b7878b3b95ffda2de5849271e8`.
- Reply transport bytes: 7,271.
- Reply transport SHA-256:
  `29e0ed323391d9419b4a521df1331dc2cd9b3bc4df5f8deac0467bd1a4f1336f`.
- Advisory recommendation: `PROCEED_TO_LOCAL_ADJUDICATION`.

The exact transport bytes are retained losslessly as base64 in
`evidence/rd-0858-unit4-scalar-consumed-byte-grok-transport.json`. Decoding
reproduces both recorded byte counts and SHA-256 identities. The manifest is
19,221 bytes with SHA-256
`58f9ec55b49fafa19a9a33e5ee02af31d60ef450c6ca97638e18e898359e8045`.

Human-readable captures are retained as
`evidence/rd-0858-unit4-scalar-consumed-byte-grok-prompt.txt` and
`evidence/rd-0858-unit4-scalar-consumed-byte-grok-reply.txt`. They are reading
copies rather than transport-identity sources: the prompt omits one terminal
LF; the reply strips one trailing space and adds one terminal LF. Their
repository-byte identities are respectively 6,884 bytes / SHA-256
`b4318d27152feca8ba59d5d700acddfcdb72a254160c844a38bdd36ee087e737`
and 7,271 bytes / SHA-256
`1589861861d117504b770c8bbc52f8eace101516e93d756e75f1675a45a65bd4`.
Transport identity and repository text hygiene are therefore disclosed
separately rather than normalized into one claim.

### Local adjudication

- [x] H1 `REJECTED`: the exact compiler host implements source, file,
  directory, realpath, module-resolution and output callbacks over admitted
  maps only. Compiler and library path substitution, stale persistent output,
  ambient dependency and `NODE_OPTIONS`/`NODE_PATH` controls remain green.
- [x] H2 `REJECTED`: Windows case aliases share one canonical virtual key and
  duplicate keys refuse; consumed bytes and labels are sorted into the input
  digest; options are recursively key-sorted and path-normalized; toolchain,
  runtime and strict-loader identities are bound into execution identity v4.
- [x] H3 `REJECTED`: compiler output is collected in memory, diagnostics and
  emit status are checked before publication, writes are exclusive inside a
  fresh ownership-marked temporary root, and every refusal path attempts only
  ownership-checked cleanup. A fresh exact replay passes 25/25.
- [x] H4 `UPHELD` as a governance boundary, not a code finding: the
  process-root fast-forward must preserve ignored outputs byte-for-byte, keep
  the global phase-close at 94/96 and stop before profiles 32/64/256 or any
  broader native chapter.

The external model remains non-authorizing. The later exact target `be7adb14a`
received independent code and assurance `PASS` verdicts at C0/I0/M0; that
evidence, not the model reply, supports scalar-local integration.
