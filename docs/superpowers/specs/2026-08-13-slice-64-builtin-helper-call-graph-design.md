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

1. **Five bounded pure helpers plus one shallow Boolean composition
   (selected after RED diagnosis).** Four leaves own four exact names and the
   fifth owns two. The exported flow combines the five pure results with one
   `or` expression. This keeps every function at or below the narrow
   eight-block ceiling, uses the bounded wide-function registry and keeps the
   call graph at depth one.
2. **Three six-name helpers.** Rejected after a valid RED run. Six-name leaf
   matches exceed the narrow block ceiling, selecting the wide-control profile
   before the wide-function profile; the combined graph is therefore refused.
3. **One flat eighteen-arm match or a runtime ceiling increase.** Rejected.
   The flat form has an exact compile refusal, and this slice has no authority
   to change a SLIDE registry ceiling.

## Exact behavior

The helpers own, in order: `AuditLog`/`Secrets`/`Crypto`/`Database`;
`Http`/`File`/`Auth`/`Session`; `validate`/`redact`/`emit`/`return`;
`Ok`/`Err`/`Some`/`None`; and `true`/`false`.

Every helper uses an exhaustive `match` with terminal `_ => return false`.
The exported `isBuiltin` returns the Boolean `or` of all five pure helper
results. The source decision is pure and has no observable evaluation-order or
short-circuit effect to preserve. It contains no null, NaN, `else if`,
exception syntax, iteration, effect, host API, authority grant, Hallmark,
border or vault access.

All other Strings return `false`. Missing, surplus-argument, non-String,
invalid-text, exhausted-work and mutated-artifact physical inputs must refuse,
not coerce.

## Proof contract

1. RED: change the focused physical expectation from compile refusal to proof
   while retaining the current flat candidate; require the test to fail at the
   physical compile boundary.
2. GREEN: replace only the Fungi body with the five-leaf shallow helper graph.
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
