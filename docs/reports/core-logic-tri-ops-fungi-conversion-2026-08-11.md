# Core logic Tri operations Fungi conversion dossier

Date: 2026-08-11
Status: `PHYSICAL_REFERENCE_PROOF_PENDING_REPOSITORY_CLOSE`
Authority: non-retiring conversion slice; the TypeScript source and consumers remain authoritative until every switch and retirement gate is proved.

## Pinned source

- Repository build point: `8845bb6bc36397cfb724d81119841e9e5c5a261c`
- Source: `packages-galerina/galerina-core-logic/src/index.ts`
- Source SHA-256: `2bdc2a8f8743da317fa769aebb056317622839da018c0a4897765bce8402e91a`
- Runtime: Node `v24.18.0`; npm `12.0.2`
- Slice: `triNot`, `triAnd`, `triOr`, and `triNor`, including their `assertTri`, inversion, minimum, maximum, and composition behavior.
- Excluded from this slice: `isTri`, `triToBool`, records, truth tables, Omni logic, diagnostics, state conversions, and every other export in the source file.

The codebase-memory graph transport refused discovery and remains `UNKNOWN`. The fresh Myco index and exact-file reads found the package tests, the older compiler pilot, and a separate benchmark implementation. This is sufficient for the bounded slice but not evidence that the whole TypeScript file is retireable.

## Source contract

`Tri` is the closed numeric set `{-1, 0, +1}`. TypeScript rejects other runtime values through `assertTri` before computing. On admitted values:

- `triNot(-1)=+1`, `triNot(0)=0`, `triNot(+1)=-1`;
- `triAnd(left,right)=min(left,right)`;
- `triOr(left,right)=max(left,right)`;
- `triNor(left,right)=triNot(triOr(left,right))`.

The slice is deterministic, synchronous, immutable, finite, and effect-free. It performs no I/O, allocation visible to callers, clock/random work, async scheduling, cleanup, or partial mutation. The only negative path is malformed runtime input, which TypeScript exposes as a thrown `TypeError` before a value is returned.

The Fungi boundary must use `Verdict`, not `Int`. That makes the closed K3 domain part of the callable type and lets independent SLIDE admission refuse malformed values. No `null`, `NaN`, `else if`, exception syntax, `for`, or `loop` is required or permitted.

## Decision and effect ledger

| Source operation | Proven subject/type | Terminal | Fungi treatment | Direct/transitive effects | Failure exit | Evidence |
|---|---|---:|---|---|---|---|
| `assertTri(value)` at each public input | closed `Tri` runtime domain | no | typed `Verdict` parameter plus independent argument admission | none | malformed value is `REFUSED` before execution | TypeScript source; SLIDE typed Verdict envelope tests |
| `value === TRI_UNKNOWN ? ... : invertTri(value)` | K3 selector | yes | exhaustive three-arm `check` | none | every arm returns one `Verdict` | TypeScript source; Golden `004-k3-check.fungi` |
| `minTri(left,right)` | two K3 selectors | yes | exhaustive `check` composition preserving the nine-row truth table | none | every nested arm returns one `Verdict` | TypeScript source and package tests |
| `maxTri(left,right)` | two K3 selectors | yes | exhaustive `check` composition preserving the nine-row truth table | none | every nested arm returns one `Verdict` | TypeScript source and package tests |
| `triNot(triOr(left,right))` | typed flow composition | yes | call the proved `triOr` result then `triNot` | none | downstream refusal propagates before value release | TypeScript source |

There are no loops, exceptions to reproduce inside Fungi, host APIs, effects, mutation, encoding changes, or timing dependencies in this slice.

## Required proof before status changes

1. A package-owned `.fungi` asset exists and is declared in the package graph.
2. The exact asset passes strict type and governance checking.
3. Canonical Galerina GIR/WAT execution matches TypeScript for all 3 unary and 9 binary K3 vectors.
4. Independent SLIDE compiles the exact bytes into a physical `.slide` package, re-admits it, and produces typed receipts for all vectors.
5. SLIDE refuses malformed Verdict arguments and one-byte artifact/source mutations.
6. VOK/admission gates are all independently positive for the proof candidate; no test Boolean substitutes for them.
7. Relevant package, Golden, graph, audit, roadmap, and phase-close owners pass after publication.

Items 1 through 6 now hold; item 7 is still pending. The current status is
therefore `PHYSICAL_REFERENCE_PROOF_PENDING_REPOSITORY_CLOSE`. Even after item
7 holds, this proves only the four-flow slice and does not retire `src/index.ts`
or authorize a production consumer switch.

## Current proof record

- Package-owned source and package graph asset: present.
- Strict Galerina checker: zero errors and zero governance warnings across four
  flows and four top-level declarations.
- Canonical Galerina GIR/WAT parity: all 3 unary and 9 binary K3 vectors match
  the pinned TypeScript source; owning package **55/55**.
- Independent SLIDE build point: `ac8a041`; complete suite **986/986 across 97
  suites**; current 91-file manifest digest
  `sha256:e0e5dd5ddfa8def3aa0949ab0a240a7f031d73663b00b07e58467033d0202e48`.
- Physical proof: four `.slide` files published, independently re-admitted and
  executed through VOK typed receipts over every vector.
- Negative proof: invalid typed arguments refuse and a one-byte physical
  artifact mutation refuses before execution.
- Remaining status transition: run the Galerina graph/audit/roadmap/phase-close
  owner chain on the final committed build point. Until that passes, the
  dossier does not claim repository-close freshness.

The source and its consumers intentionally remain active. Passing the remaining
repository gates will prove this bounded slice, not retire `src/index.ts`, not
reduce the TypeScript-family denominator, and not authorize production.
