# Slice 78 Boundary Crossing Physical Adjudication

## Decision

`packages-galerina/galerina-devtools-graph-algorithms/src/graphs/boundary-graph.ts#isCrossingAllowed`
has a package-owned checked `.fungi` candidate, but terminal conversion is
`BLOCKED_BY_TWO_STRING_PHYSICAL_PROFILE`.

The TypeScript decision remains active. No consumer switch or retirement is
authorized.

## Pinned scope

- Galerina build point: `4c64debc5d22c1afb06d7ad9263599c4c99f9820`.
- TypeScript SHA-256: `edb85548909634948c230e4bca2012b79177867667a66cec86c76f49449b49a8`.
- Candidate SHA-256: `201ed336fbd75d736e783e757ffba980ed1a567e445c2c74a95027d1d57cc707`.
- Exact live caller: `buildBoundaryGraph`.
- Reconciled SLIDE head: `ed326eaa`; capability reference `99a75a6`.

## Exact source domain

`BoundaryKind` is the closed six-label union `api`, `webhook`, `internal`,
`package`, `secure`, `public`. `BoundaryTrustLevel` is the closed four-label
union `untrusted`, `validated`, `internal`, `privileged`.

The 24-entry table is:

- secure callers admit only internal or privileged callees;
- API and webhook callers admit validated, internal or privileged callees;
- internal, package and public callers admit all four declared trust levels.

The live caller derives both inputs from typed nodes. The candidate additionally
returns false for every surplus label, using a terminal wildcard rather than
extending authority.

## Evidence and physical boundary

The candidate passes parser/type/effect checking, GIR emission, interpretation,
signed WAT/Wasm execution and every 24 typed pair plus hostile labels. The
complete owning package passes 97/97.

Physical `compileCheckedFungiPackageSet` refuses with
`SLIDE-PACKAGE-BUILD-001`, emits no package build handle and therefore cannot
publish a `.slide` bundle, re-admit it through VOK or produce a typed receipt.
The physical integration test records that refusal as the required result.

## Decision and effect ledger

| Source branch | Input domain | Result | Effect | Candidate shape | Exit |
|---|---|---|---|---|---|
| secure | 4 trust labels | Bool | none | two String comparisons | true for internal/privileged |
| API/webhook | 4 trust labels | Bool | none | caller and trust comparisons | true except untrusted |
| internal/package/public | 4 trust labels | Bool | none | exhaustive caller match | true |
| terminal wildcard | surplus physical text | Bool | none | `_ =>` | false |

The leaf is `PARALLEL_PURE`: immutable String inputs, comparisons only, no
mutation, property access, host call or I/O. Graph construction and publication
must be scheduled separately.

## R&D trigger

Revisit when the checked-Fungi physical profile admits this bounded two-String
Boolean control shape and proves publication, independent VOK re-admission,
work exhaustion, source/artifact mutation refusal and typed receipt recovery.

This result grants no retirement, production, signing, release or push
authority. Aggregate closure remains deferred to Slice 87.
