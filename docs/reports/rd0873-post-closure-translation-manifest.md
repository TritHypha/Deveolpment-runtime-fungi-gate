# RD-0873 Post-Closure Translation Manifest

Date: 2026-09-10  
Status: **HOLD**  
Authorizing: **false**

This is a locator-only, non-authorizing candidate record for the first
post-closure TypeScript-to-Fungi pilot. It does not reopen bulk conversion,
create `.fungi` source, switch a consumer or retire TypeScript.

## Owner-signed starting state

The owner has confirmed that RD-0873 Tasks 7-9 and RD-0858 are complete and
signed off. The interrupted benchmark worker was a crash during execution, not
a failed assurance result. The accepted benchmark and corpus assurance remain
closed, including the prior 2,720-file corpus result.

The manifest capture point was local `main` at
`1b3ba263975f0d8bffe3484fd7c79127cc7ba8c4` with tree
`50642d358e1958abd6837afe97e01dd01c99f365`. Subsequent documentation-only
commits do not alter the source file below, which has SHA-256
`2d780121a92cfe02f84778447a14951820232fe5c569c1ca9b8ebae6b806a3b7`.

## Advisory candidate

| Field | Value |
| --- | --- |
| Product | `galerina` |
| Package | `packages-ts/galerina-core-config` |
| Source | `packages-ts/galerina-core-config/src/governance.ts` |
| Symbol | `isGovernanceMode` |
| Span | lines 28-30 |
| Signature | `(value: unknown): value is GovernanceMode` |
| Shape | complexity 0; no loop; no callee; two callers |
| Direct callers | `resolveProjectGovernance`; `packages-ts/galerina-core-config/tests/governance.test.mjs` |
| Discovery | codebase-memory `search_graph`, `get_code_snippet`, `trace_path` |
| Graph result | one exact symbol match; inbound trace complete for the bounded request |

The body is a three-value equality predicate (`full`, `auto`, `lean`) over a
TypeScript `unknown` input. It is deterministic and small, but the source
accepts non-String values and the current Fungi boundary cannot silently narrow
that domain. A candidate remains blocked until the owner-bound ingress contract
proves the exact admitted value domain and its hostile wrong-class vectors.

A bounded exact probe of the protected conversion queue found zero occurrences
of `isGovernanceMode`; there is no queue entry that reopens this symbol for
authoring at the recorded build point.

## Exclusions

- `packages-ts/galerina-core-compiler/src/self-hosted/retry-strategy.fungi` is
  an existing package-owned conversion and is not a new pilot candidate.
- `isEnvironmentMode` uses a live `Set`; its identity and mutation semantics
  are not admitted by this manifest.
- `isLoPackageGraphAlias` depends on a regular-expression execution surface;
  its exact engine and work bound are not admitted here.
- No SLIDE, VOK or Lyth build point is asserted by this local record. Their
  independent owner receipts must be supplied and must bind the exact candidate
  before authoring.

## Missing admission inputs

The following remain required before a pilot can move from `HOLD` to authoring:

1. An owner-bound queue decision naming this symbol, the current Galerina head,
   source digest, compiler/toolchain, scalar profile and exclusions.
2. A source dossier and semantic/effect ledger covering unknown input values,
   equality behavior, callers and every negative vector.
3. An immutable checked snapshot and canonical GIR receipt.
4. Independent SLIDE re-derivation and execution, exact-subject VOK admission,
   and independent review at the same build point.
5. A private-skill review using `translating-typescript-to-fungi` and
   `writing-fungi`, with either a verified update or a recorded
   `NO_SKILL_UPDATE` reason.

Until all five inputs are present and mutually bound, the safe next action is
to preserve this manifest as `HOLD`. No corpus scan, branch/worktree creation,
bulk authoring, consumer switch, TypeScript retirement or production admission
is authorized by this record.
