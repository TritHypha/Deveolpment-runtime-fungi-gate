# Slices 59-61 TriState Record-Union Adjudication

## Decision

Slices 59-61 are `BLOCKED`. No `.fungi` asset, manifest entry, differential
test or candidate authority is created.

The three source functions are pure comparisons, but their public input is not
a scalar String or integer tag. It is the canonical `TriState` discriminated
union whose variants have different record shapes. The current checked-Fungi
physical path has no proved exact admission for that record union. Replacing
the input with `kind: String`, an enum, or an i32 tag would prove only a leaf
comparison while moving the record projection into a host or TypeScript
adapter. That is not boundary parity.

## Preflight corrections

Two initially proposed scopes were rejected before worker assignment:

- `galerina-core-compiler/src/i32-arith.ts#isI32Trap` is on the declared
  compiler bootstrap floor.
- `galerina-core-compiler/src/stdlib-registry.ts#getStdlibModuleKind` is on the
  same compiler bootstrap floor.

Neither is an ordinary dossier slice. The replacement wave stays inside the
non-floor `galerina-core-logic/src/tri/tri-state.ts` file.

## Exact scopes and evidence

| Slice | Exact symbol | Runtime decision | Live callers | Result |
|---:|---|---|---|---|
| 59 | `isTriTrue` | `state.kind === "true"` | one package-test caller; no production caller | `BLOCKED` |
| 60 | `isTriFalse` | `state.kind === "false"` | one package-test caller; no production caller | `BLOCKED` |
| 61 | `isTriUnknown` | `state.kind === "unknown"` | one package-test caller; no production caller | `BLOCKED` |

The source SHA-256 at the reviewed build point is
`B2B6AE079B8FC04D7FB4213E07DA30281C6280A68767F7423703DDF8918D7FBD`.
The owning package passes **57/57** with zero failures.

Each function is exported through the package's `./tri` public subpath. The
absence of an in-repository production caller is therefore not deletion or
retirement authority.

## Source domain

The canonical TypeScript type is:

```text
{ kind: "true"; value: true }
| { kind: "false"; value: false }
| { kind: "unknown"; reasons: readonly UnknownReason[] }
```

`UnknownReason` is itself a record containing `code`, `message`, and optional
`source`. The complete input therefore includes variant-specific fields, an
array of nested records and an optional-field state. Although the three leaf
functions inspect only `kind`, the uninspected fields remain part of the
declared public input boundary.

The TypeScript return annotations are also type predicates. A Fungi `Bool`
can preserve the runtime result after an exact representation is available,
but it does not itself replace the TypeScript caller-narrowing contract. That
contract must be redesigned or retired with its consumers rather than silently
dropped.

## Language and physical findings

- The live Fungi parser supports canonical flat `record` declarations and
  single type-reference aliases.
- The active type-reference parser does not prove a TypeScript-style
  `A | B | C` sum of records.
- The Golden Pack proves flat record construction and field access, not a
  heterogeneous record-union input boundary.
- Existing `tri-ops.fungi` operates on the closed `Verdict` domain and does not
  supersede these record-union predicates.
- Existing `omni-uncertain.fungi` accepts a scalar String; copying that shape
  would narrow this source boundary.
- Current physical evidence accepts selected scalar and bounded record shapes,
  but supplies no exact `TriState` record-union admission with nested
  `Array<UnknownReason>`, optional-field conservation and hostile-object
  refusal.

Frontend checker acceptance, an internal enum, or a source-to-tag table would
not close that last gap. The physical surface must receive and validate the
complete typed value, or an approved whole-family representation change must
replace `TriState` and every consumer together.

## Decision and effect ledger

| Source operation | Subject | Fungi route when unblocked | Effects | Current result |
|---|---|---|---|---|
| read `state.kind` | heterogeneous record union | exact typed projection | none | blocked at input representation |
| compare with one literal tag | String equality | exhaustive `match` with terminal `_ => false` | none | leaf compute is expressible |
| return type predicate | TypeScript caller narrowing | explicit caller redesign plus `Bool` result | none | no proved direct analogue |
| unknown payload | `Array<UnknownReason>` with optional `source` | exact nested record/Option encoding | none | no admitted physical boundary |

All three source leaves are `PARALLEL_PURE`: immutable, deterministic,
order-independent and effect-free. That classification does not authorize a
physical candidate or thread an unvalidated record boundary.

## Required future proof

Before reopening these slices, one reviewed route must provide:

1. a canonical heterogeneous-record representation, or an owner-approved
   replacement representation for the entire `TriState` public family;
2. exact physical admission for all three variants, nested reasons and the
   optional source field;
3. missing, surplus, inherited, accessor, proxy, wrong-class and wrong-payload
   refusal vectors;
4. a complete three-variant differential for every guard, including
   `isTriUnknown(TRI_STATE_FALSE) === false`;
5. GIR, `.slide`, independent re-admission and VOK evidence for the exact
   boundary;
6. an explicit replacement for the TypeScript type-predicate contract before
   consumer switch or retirement.

No host-precomputed discriminant, scalar convenience wrapper, truthiness rule
or silent tag encoding is permitted.

## Consultant and skill review

The read-only Claude reviews mounted and named both public Fungi skills. Their
blocker findings agree with the product-owner result, but their missing graph
and sibling-repository access is not used as authority. Codex independently
verified the graph callers, source digest, retirement row, package assets,
parser surface, Golden record evidence and focused package lane.

`NO_SKILL_UPDATE` applies to both public skills. The reusable rule is already
binding: the translation skill requires exact heterogeneous-union tag maps and
complete physical domains, while the writing skill explicitly refuses scalar
helpers as proof of record-boundary parity.

## Authority retained

TypeScript remains the executing reference. These decisions authorize no
consumer switch, deletion, retirement, production, release, signing, profile
widening or push. Repository-wide closure remains `UNKNOWN` because the
crash-linked aggregate lanes are intentionally excluded.
