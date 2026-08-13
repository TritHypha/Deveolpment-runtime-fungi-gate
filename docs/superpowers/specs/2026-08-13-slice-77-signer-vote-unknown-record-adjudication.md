# Slice 77 Signer Vote Unknown Record Adjudication

## Decision

`packages-galerina/galerina-tower-citizen/src/quorum.ts#isValidVote` is
`BLOCKED_BY_UNKNOWN_STRUCTURAL_RECORD_ABI`.

No `.fungi` candidate, bridge, fixture or consumer switch is created. The
TypeScript predicate, tally and quorum boundary remain active.

## Pinned scope

- Galerina build point: `1ded5d9188df421cc80b99c94ea5fe99166bea85`.
- Source SHA-256: `73518af41c6754ded5b04e44a20f64aea97c096abf5e22f6e989fbf3120630a5`.
- Exact symbol: `isValidVote` at `src/quorum.ts`.
- Live data-flow caller: `tally`; downstream callers include `quorumVerdict`,
  `checkQuorum`, key rotation and focused quorum tests.
- Related package assets: authorization, governance decisions, inference
  governance, PQ admission and transport FSM. `governance-decisions.fungi`
  consumes the host-computed malformed fact and does not classify the record.
- Reconciled SLIDE head: `ed326eaa`; its capability reference remains
  `99a75a6` because the later change is CI-only path handling.

## Source contract

The source accepts JavaScript `unknown`. It returns `false` for `null`,
non-objects, a missing or non-String signer, an empty signer, and a verdict
outside numeric `-1`, `0`, `1`. It otherwise accepts structural objects,
including objects with surplus or inherited properties. Property reads use
ordinary JavaScript semantics: accessors and proxy traps can execute and can
throw. Strings use the complete JavaScript UTF-16 value domain.

`tally` maps a `false` result to `{ malformed: true, distinctApprovals: 0 }`.
`checkQuorum` turns malformed evidence into `INDETERMINATE`, then the boundary
denies and reports the `malformed` reason. This result distinction is live
authority evidence, not a convenience check.

## Decision and effect ledger

| Source operation | Proven source type | Result | Effect | Required physical operation | Exit |
|---|---|---|---|---|---|
| null/type test | JavaScript `unknown` | Bool | none | heterogeneous value-kind test | non-object becomes `false` |
| `vote.signer` read | open structural object | unknown | may invoke host accessor/proxy code | source-equivalent dynamic property read | throw propagates or continue |
| String and empty test | unknown/String | Bool | none after property read | full JavaScript String classification | invalid becomes `false` |
| `vote.verdict` read | open structural object | unknown | may invoke host accessor/proxy code | source-equivalent dynamic property read | throw propagates or continue |
| K3 membership | JavaScript `unknown` | Bool | none | exact numeric `-1/0/1` comparison | member `true`, otherwise `false` |
| caller fallback | predicate result | tally record | none | preserve false as malformed evidence | malformed reaches denied boundary |

The helper is `SERIAL_HARD_PATH`. Its property reads can execute active
accessor or proxy code and throw, so it is not a pure parallel classifier even
though ordinary data-only records take a synchronous fast path.

## Capability comparison

SLIDE has a bounded external record ABI and exact Safe Value records, but those
interfaces intentionally refuse proxies, accessors, inherited fields, surplus
fields, missing fields and wrong field values before the Fungi flow executes.
That is safer admission, but it is not the source predicate's Boolean domain or
observable behavior. A `record SignerVote` parameter also removes every
non-record negative case. Its String and Verdict fields arrive already typed,
so the source classification has already happened outside Fungi.

The existing `governance-decisions.fungi` flow consumes `distinctApprovals`,
`m` and a host-computed `malformed` Boolean. It proves the final K3 fold but
leaves this record/type authority in TypeScript.

## Rejected substitutions

- `flow isValidVote(v: SignerVote) -> Bool` removes the complete negative input
  domain and makes the predicate vacuously true for admitted records.
- Flattening to `(signer: String, verdict: Verdict)` moves record parsing,
  property effects and malformed classification into the host.
- Treating physical record refusal as source `false` changes the receipt and
  caller control-flow boundary.
- Tightening the product API to exact records may be desirable, but it is a
  separately approved migration requiring all callers, tests and audit
  semantics to move together.

## R&D trigger

Revisit after either a versioned heterogeneous/open-record ABI preserves
source-equivalent value kinds, structural property semantics, JavaScript String
and K3 comparison through GIR, physical `.slide`, independent re-admission and
VOK, or an owner-approved exact-record API migration retires the old behavior
with differential caller evidence.

This adjudication grants no conversion, retirement, production, signing,
release or push authority. Aggregate closure remains deferred to Slice 87.
