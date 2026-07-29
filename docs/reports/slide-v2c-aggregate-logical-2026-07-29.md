# SLIDE V2-C immutable aggregate logical checkpoint

**Date:** 2026-07-29
**Scope:** detached logical records and fail-closed semantic validation
**Local implementation commit:** `437a3987`
**Registry binding commit:** `3de15ea8`
**Executable integration commit:** `5ea92c78`
**Canonical producer commit:** `00940a67`

## Claim boundary

This checkpoint proves one bounded logical aggregate fixture. It does not yet
prove canonical V2-C bytes, independent import, a semantic digest, aggregate
execution, native memory safety, a broker, or production authority.

Every successful decision reports `authorityReleased: false`. The fixture has
zero effects, capabilities, memory objects, host calls, and back edges.

## Implemented

- `slide-v2c-aggregate-model.fungi` materializes registered immutable UTF-8
  text, bytes, `Array<Int32>`, record, variant, and checked-index result
  semantics.
- V2-C appends type IDs 10-13 and opcode IDs 12-20 without reinterpreting
  frozen V2-A or V2-B IDs.
- The exact 1,866-byte LF-terminated registry descriptor is bound by SHA-256
  `c373bd6c12a7e3602a45c608fd0997e2227a703c73ac75c4270539552877bd38`.
- The model binds the frozen V2-A registry digest and V2-B sidecar descriptor
  digest as context, but the sidecar supplies no authority.
- Exact finite ceilings cover canonical-body bytes, text bytes, raw bytes,
  array elements, fields, cases, semantic aggregate depth, copied bytes,
  steps, and all forbidden resource classes.
- `slide-v2c-aggregate-validator.fungi` validates the complete registry,
  limits, dense ID tables, constant payloads, ordered numeric field/case
  descriptors, and exact typed forward-only instruction sequence.
- Text evidence requires the supplied bytes to equal the UTF-8 encoding of the
  decoded string. Raw bytes use a distinct encoding identity and cannot be
  reinterpreted as text.
- All multi-way dispatch uses exhaustive `match`; every Verdict exit is an
  exhaustive `check`.
- `slide-v2c-executable-model.fungi` embeds the two frozen V2-A functions
  unchanged and appends function 3, whose 13 SSA instructions perform the
  registered aggregate operations and terminate with an explicit typed return.
- `slide-v2c-executable-validator.fungi` projects and revalidates the embedded
  V2-A subgraph under the frozen V2-A validator, binds the complete descriptor
  tables, and validates the aggregate function signature, authority surface,
  instructions, operands, immediates, and no-fallthrough return.
- `slide-v2c-cbor-encoder.fungi` emits a deterministic shortest-form 21-key
  CBOR root only after complete logical admission. The canonical body is 725
  bytes with SHA-256
  `aa6ecf62b9d54167682569a817e8313ce391e51ce649b5025df750f237b72fe3`.
  Root keys 18-20 carry full constant, record, and variant definitions.
  Refusal releases neither partial bytes nor authority.

## Mutation evidence

The focused V2-C suite passes 18/18 and refuses:

1. format/profile drift;
2. V2-C registry descriptor drift;
3. parent-registry digest drift;
4. V2-B sidecar digest drift;
5. a nonzero memory ceiling;
6. capability identity injection;
7. a type-table gap;
8. text payload/UTF-8 evidence mismatch;
9. raw-byte ceiling overflow;
10. reordered record fields;
11. changed variant payload types;
12. replacement of the checked-index opcode;
13. a dynamic field identity; and
14. a surplus instruction.

Before the descriptor-binding test was appended, the combined focused
regression was 157/157 across frozen R1, V2-A, V2-B, and V2-C. The updated
aggregate-slice suite is 18/18. The complete executable-graph suite adds
10/10, including embedded-parent mutation, capability injection, unchecked
index, dynamic projection, descriptor divergence, surplus function, and
fallthrough refusal. The two V2-C suites pass 28/28. Compiler TypeScript build
also passes.

The canonical producer suite adds 6/6: deterministic bytes plus refusal for
registry drift, embedded-parent drift, aggregate-operation drift, and
authority-ceiling injection. All three V2-C suites pass 34/34.

## What this replaces, rebuilds, and integrates

Nothing is removed at this checkpoint.

Galerina must rebuild:

- aggregate GIR emission so strings, bytes, arrays, fields, cases, checked
  indexing, and typed failures are materialized once;
- registered constant/record/variant descriptor production; and
- source-map bindings for aggregate operations.

Independent SLIDE must still build:

- the frozen V2-C registry descriptor and digest;
- canonical 21-key encoding and a separately implemented strict decoder;
- complete graph reconstruction and domain-separated semantic binding;
- bounded instruction-driven aggregate execution; and
- a second non-Galerina producer.

Only after those gates pass may the primary path cut:

- post-GIR AST reads for aggregate values;
- WAT/tree-walker aggregate reconstruction;
- dynamic name-based field/case recovery; and
- default empty or partial aggregates used for missing GIR.

The current interpreter, WAT/Wasm, database/network adapters, Tower Citizen,
Tri-Pipe, and V2-B reference gates remain in place. Failed V2-C admission
cannot select any of them as a fallback.

## Next safe boundary

Build an independent 21-key decoder that exposes neither a partial descriptor
nor partial aggregate graph on refusal, then bind the admitted body to its
domain-separated semantic digest. V2-D memory remains blocked.
