# Slice 64 builtin helper-call graph design

## Objective

Reopen the earlier Slice 37 `isBuiltin` refusal as Slice 64 under the newly
reconciled independent SLIDE pin. Preserve the exact eighteen-name
case-sensitive String membership decision without changing its TypeScript
caller, widening the physical profile or claiming retirement authority.

## Bound source and authority

- Source: `packages-galerina/galerina-devtools-context/src/receipt-generator.ts#isBuiltin`.
- Candidate: `packages-galerina/galerina-devtools-context/src/self-hosted/builtin-name.fungi`.
- Queue scope: the exact `isBuiltin` symbol only.
- Retirement tranche: `T3-package-graph`, with no declared bootstrap floor.
- Threadability: `PARALLEL_PURE`; this classification applies only to the
  immutable membership leaf and grants no parallel authority to AST walking,
  receipt generation or publication.

The original flat eighteen-arm match and its earlier helper probes remain
bounded evidence against the older physical profile. They do not override the
new pinned call-chain capability and do not count as current physical proof.

## Approaches considered

1. **Three six-name pure helpers plus one exported composition (selected).**
   Every leaf remains below the proved seven-arm flat String-match ceiling.
   The exported flow checks the first helper, then the second, and returns the
   third. This minimizes calls while preserving all eighteen exact names.
2. **Six three-name helpers.** This stays below the leaf ceiling but adds
   unnecessary call and control edges, increasing physical proof cost without
   improving semantics.
3. **One flat eighteen-arm match or a runtime ceiling increase.** Rejected.
   The flat form has an exact compile refusal, and this slice has no authority
   to change a SLIDE registry ceiling.

## Exact behavior

The first helper owns `AuditLog`, `Secrets`, `Crypto`, `Database`, `Http` and
`File`. The second owns `Auth`, `Session`, `validate`, `redact`, `emit` and
`return`. The third owns `Ok`, `Err`, `Some`, `None`, `true` and `false`.

Every helper uses an exhaustive `match` with terminal `_ => return false`.
The exported `isBuiltin` returns `true` after a successful first or second
helper and otherwise returns the third helper's Boolean. It contains no null,
NaN, `else if`, exception syntax, iteration, effect, host API, authority grant,
Hallmark, border or vault access.

All other Strings return `false`. Missing, surplus-argument, non-String,
invalid-text, exhausted-work and mutated-artifact physical inputs must refuse,
not coerce.

## Proof contract

1. RED: change the focused physical expectation from compile refusal to proof
   while retaining the current flat candidate; require the test to fail at the
   physical compile boundary.
2. GREEN: replace only the Fungi body with the three-by-six helper graph.
3. Strict-check the exact asset and run its package parity proof over all
   eighteen names plus hostile surplus text.
4. Publish one physical `.slide`, independently re-admit it through VOK and
   retain the existing exhaustion and mutation refusal matrix.
5. Keep TypeScript and all consumers active. No result from this slice grants
   retirement, signing, production, release or profile-widening authority.
6. Review both private Fungi skill repositories at slice close; update only for
   a new reusable, evidence-backed lesson, otherwise record
   `NO_SKILL_UPDATE`.

## Failure policy

Any frontend, queue, package, physical, re-admission, mutation or exhaustion
failure returns the slice to `BLOCKED` with the exact boundary named. The
implementation must not reduce the eighteen-name domain, precompute the
Boolean in the host or change the SLIDE profile to obtain a pass.
