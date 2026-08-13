# Slice 76 AI Verdict Unknown Guard Adjudication

## Decision

`packages-galerina/galerina-tower-citizen/src/ai-governance.ts#isTrit` is
`BLOCKED_BY_UNKNOWN_VERDICT_GUARD_ABI`.

No `.fungi` candidate, bridge, fixture or consumer switch is created. The
TypeScript predicate and `governAiProposal` remain active.

## Pinned scope

- Galerina build point: `1d2cad3bc76548e42a49537a6c3563a5aa7e8acc`.
- Source SHA-256: `e1cea2efd8230787e9c237712082b7b6755adf9e67820ef97b545fa0eb40c834`.
- Exact symbol: `isTrit` at `src/ai-governance.ts`.
- Retirement row: `T2-runtime-core`, replacement absent, no declared floor.
- Related package assets: authorization, governance decisions, inference
  governance, PQ admission and transport FSM; none implements this dynamic
  type guard.
- Reconciled SLIDE head: `ed326eaa`; its capability reference remains
  `99a75a6` because the later change is CI-only path handling.

## Source contract

The source accepts JavaScript `unknown` and returns `true` only for the number
values `-1`, `0` and `1`, using strict equality without coercion. It returns
`false` for every other number, `NaN`, infinities, signed non-member values,
BigInt, String, Bool, `undefined`, `null`, Symbol, functions, objects and
proxies.

`governAiProposal` applies the predicate to both `coreVerdict` and `aiVerdict`.
Each invalid input is replaced with `Verdict.DENY` before the K3 meet. The
helper therefore owns a live malformed-input distinction on the admission
path; it is not merely a validation convenience.

## Decision and effect ledger

| Source operation | Proven source type | Result | Effect | Required physical operation | Exit |
|---|---|---|---|---|---|
| compare with `-1` | JavaScript `unknown` | Bool | none | heterogeneous value-kind plus exact numeric comparison | `true` when equal |
| compare with `0` | remaining unknown | Bool | none | same | `true` when equal |
| compare with `1` | remaining unknown | Bool | none | same | `true` when equal; otherwise `false` |
| caller fallback | predicate result | Verdict | none | preserve false then explicit DENY substitution | malformed input becomes DENY |

The leaf is `PARALLEL_PURE`: strict equality performs no coercion or property
access and the input value is not mutated. Proposal mapping, evidence
construction and later admission must derive their scheduling independently.

## Capability comparison

The physical profile has both signed-i32 `Int` and `Verdict`. Neither preserves
the source contract:

- `Verdict` admits only `-1`, `0`, `1`, so malformed values refuse before the
  predicate instead of producing `false` for the caller's explicit DENY path.
- `Int` admits a wider numeric subset but excludes non-number JavaScript values,
  binary64 fractions, non-finite values, unsafe integers and wider numbers.
- the current safe-value union is not a general JavaScript `unknown` parameter
  with exact type-kind discrimination.

The existing inference-governance asset consumes host-computed Boolean facts.
It cannot prove that malformed verdict classification moved out of TypeScript.

## Rejected substitutions

- `flow isTrit(v: Verdict) -> Bool` removes the negative input domain.
- `flow isTrit(v: Int) -> Bool` narrows `unknown` to signed i32.
- Host-side type tagging or a precomputed Boolean retains the authority in
  TypeScript.
- Treating physical boundary refusal as source `false` changes caller control
  flow and diagnostic/audit evidence.
- Reusing the authorization-boundary asset proves collapse of admitted trits,
  not classification of hostile unknown values.

## R&D trigger

Revisit after a versioned heterogeneous value ABI carries exact type-kind and
numeric-domain evidence through GIR, physical `.slide`, independent
re-admission and VOK, and permits the predicate to return `false` rather than
silently equating boundary refusal with the source result. A separately
approved API redesign may move malformed-value handling to an explicit typed
border, but every caller and audit expectation must then migrate together.

This adjudication grants no conversion, retirement, production, signing,
release or push authority. Aggregate closure remains deferred to Slice 87.
