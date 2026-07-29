# SLIDE V2-C immutable aggregate logical checkpoint

**Date:** 2026-07-29
**Scope:** detached logical records and fail-closed semantic validation
**Local implementation commit:** `437a3987`
**Registry binding commit:** `3de15ea8`
**Executable integration commit:** `5ea92c78`
**Canonical producer commit:** `00940a67`
**Independent vector commit:** `8d7d8cd3`
**Structural importer commit:** `39e81b90`
**Semantic binding commit:** `7d753041`
**Pre-freeze semantic correction:** `398157da`
**Bounded reference runtime commit:** `be91ce01`

## Claim boundary

This checkpoint proves one bounded logical aggregate fixture, corrected
canonical V2-C bytes, independent import and semantic binding, and
instruction-driven fresh-process reference execution. It does not prove
native memory safety, a second producer, source-map parity, a broker, or
production authority.

Every successful decision reports `authorityReleased: false`. The fixture has
zero effects, capabilities, memory objects, host calls, and back edges.

## Implemented

- `slide-v2c-aggregate-model.fungi` materializes registered immutable UTF-8
  text, bytes, `Array<Int32>`, record, variant, and checked-index result
  semantics.
- V2-C appends type IDs 10-13 and opcode IDs 12-20 without reinterpreting
  frozen V2-A or V2-B IDs.
- The corrected exact 1,917-byte LF-terminated registry descriptor is bound
  by SHA-256
  `366c36a35ee5493bd59c2329783c33ccbb15055288b1a361d2a16b58a9b0aa66`.
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
  CBOR root only after complete logical admission. The corrected canonical
  body is 732 bytes with SHA-256
  `bb15c49cfed356e7bbf059f29605028291bdeacfa2e24343672343289f88fe24`.
  Root keys 18-20 carry full constant, record, and variant definitions.
  Refusal releases neither partial bytes nor authority.
- `slide-v2c-cbor-validator.fungi` independently pins the exact 732-byte body
  without loading the producer, model, registry object, or encoder. It refuses
  every single-byte mutation, truncation, empty input, and suffix with a
  terminal identity and releases no authority.
- `slide-v2c-cbor-importer.fungi` independently walks shortest-form CBOR,
  reconstructs all 21 root entries, all three functions, constants, ordered
  record/variant descriptors, limits, failures, and K3 evidence, then runs
  semantic validation. It reuses generic V2-A decoding primitives but calls
  neither the V2-C producer nor encoder.
- The first closed text fixture reconstructs the registered decoded string and
  proves its bytes equal the strict UTF-8 encoding. General arbitrary-text
  decoding remains a required later intrinsic; no host decoder is silently
  trusted here.
- `slide-v2c-semantic-digest.fungi` binds only independently decoded/admitted
  bytes under `slide.gir.semantic.v2\0`. The corrected semantic SHA-256 is
  `7e89c7c807a04a600a46343f95c1ecfb358e3c1806817f052c950dd1c4d5155c`;
  refusal releases no digest or authority.
- `slide-v2c-runtime.fungi` instruction-drives only independently decoded and
  admitted function 3 in a fixed 48-slot no-address SSA store. Indices
  `0/1/2` return `3/5/8`; all other Int32 indices carry registered failure 4.
  Successful execution takes 15 steps, copies 56 bytes, and reaches depth 3.
  Runtime step/copy budgets are capped by admitted ceilings; exhaustion
  refuses without partial values, counts, or authority.
- Pinned bytes execute in a fresh process without the producer, source AST,
  WAT, or Wasm.

## Pre-freeze correction

Review before runtime work found that the initial aggregate records used
opcode 1 (function parameter) where opcode 2 (Int32 constant) was intended,
while function 3 declared no parameter. Commit `398157da` corrected the
logical slice, gave function 3 one `Int32` checked-index parameter, added exact
parameter/constant validation, and regenerated the descriptor, body, vector,
import fixtures, and semantic digest.

The earlier 1,866-byte descriptor, 725-byte body, and their hashes are
superseded pre-freeze evidence and must not be admitted. No released or
production artifact used them.

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

The corrected independent vector suite adds 3/3 high-level tests, including 732 distinct
single-byte mutation cases. This is exact-vector evidence, not structural
decoding or graph reconstruction.

The structural importer suite adds 8/8. It reconstructs the complete graph and
refuses empty/truncated/suffixed bodies, non-shortest root encoding, wrong root
count, reordered root keys, and an unknown decoded aggregate opcode. Every
refusal exposes empty function/constant/descriptor tables and no authority.
The four non-vector V2-C suites pass 42/42.

The bounded runtime suite adds 6/6: three checked-index successes, registered
out-of-range failure, exact and exhausted budgets, caller-budget capping,
malformed/truncated/suffixed refusal, and fresh-process execution. Corrected
V2-C evidence is 54/54. Adjacent frozen R1/V2-A/V2-B regression is 117/117.

## What this replaces, rebuilds, and integrates

Nothing is removed at this checkpoint.

Galerina must rebuild:

- aggregate GIR emission so strings, bytes, arrays, fields, cases, checked
  indexing, and typed failures are materialized once;
- registered constant/record/variant descriptor production; and
- source-map bindings for aggregate operations.

Independent SLIDE must still build:

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

Build a genuinely independent second producer and prove conforming aggregate
output, then close aggregate source-map and required-mutation parity. V2-D
memory remains blocked.
