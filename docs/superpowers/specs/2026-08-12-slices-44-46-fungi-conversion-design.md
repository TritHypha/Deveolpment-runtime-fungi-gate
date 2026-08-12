# Slices 44-46 Fungi Conversion Design

## Decision

This product-owner gate admits two symbol-scoped reference conversions and one
blocker:

| Slice | Exact symbol | Decision | Physical result |
|---:|---|---|---|
| 44 | `galerina-core-logic/src/omni/omni-state.ts#isOmniUncertain` | `CANDIDATE` | The exact one-String Boolean decision publishes, re-admits and executes through SLIDE/VOK. |
| 45 | `galerina-devtools-project-graph/src/graphs/resource-graph.ts#validateTransition` | `CANDIDATE` | The exact reference twin is proved, but physical publication is `BLOCKED` because the selected profile admits one scalar argument rather than the required two-String boundary. |
| 46 | `galerina-tools-benchmark/src/index.ts#isBenchmarkReportShareable` | `BLOCKED` | The source consumes two nested records, including an eleven-field report; the selected physical profile cannot preserve that boundary. |

Candidate authority is limited to the two named symbols and their reference
proofs. It does not authorize a consumer switch, TypeScript deletion,
retirement, profile widening, production, signing, release or push.

## Slice 44: Omni uncertainty

The TypeScript source recognizes exactly six of the eight declared Omni state
labels. The package-owned `isOmniUncertain(state: String) -> Bool` flow uses an
exhaustive match and terminal `_ => false`. The differential set covers every
declared state and hostile case, whitespace, punctuation, newline, BOM and NUL
labels. Typed interpretation, signed Wasm, physical SLIDE publication, VOK
re-admission, hostile argument, budget and mutation checks are required.

Threadability is `PARALLEL_PURE`. The flow has no effects, mutation, ambient
authority or host API.

## Slice 45: resource lifecycle transition

The source admits exactly eleven pairs from the complete seven-by-seven
declared state matrix. The package-owned
`validateTransition(from: String, to: String) -> Bool` flow preserves the
closed table with bounded sequential decisions and exhaustive terminal exits.
The differential proof covers all 49 declared pairs plus hostile labels through
typed interpretation and signed Wasm.

Threadability is `PARALLEL_PURE`. The flow has no effects, mutation, ambient
authority or host API.

Physical publication remains blocked. The selected checked-Fungi scalar
profile accepts one external scalar argument. Encoding `(from, to)` into one
host string would relocate tuple parsing and transition authority into the
TypeScript host, so that shortcut is refused. The focused physical lane must
retain an exact compile refusal until a reviewed two-argument profile exists.

## Slice 46: benchmark privacy report

The exact source boundary is two nominal records. The report contains eleven
fields and the configuration contains nested privacy state. The current
physical record profile cannot represent this exact shape. Flattening fields,
precomputing privacy flags or passing a scalar decision would move source
authority into the host. No Fungi asset or queue admission is authorized.

The owning package regression lane remains evidence of package health only; it
does not prove conversion parity.

## Preflight correction

Before selecting any later scope, the product owner must reconcile the live
conversion register, retirement floor, every owning-package
`packageGraph.loadedAssets` entry, exact and sibling Fungi assets/tests, and any
governed mirror source. A missing graph result is not evidence that an asset or
earlier conversion is absent. This rule is also required by the public
translation skill.

## Verification boundary

Focused package and physical lanes are authoritative only for the named
symbols. Crash-linked full tooling, normal phase-close, `graph-all` and the
monolithic memory evaluator remain excluded. Roadmap, subway and repository
indexes are refreshed once at the bounded batch exit rather than per slice.
