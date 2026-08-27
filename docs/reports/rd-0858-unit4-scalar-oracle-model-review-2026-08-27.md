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
