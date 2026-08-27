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
